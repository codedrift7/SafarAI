import { prisma } from "@/server/db";
import { jsonError } from "@/server/http";
import { parseJson } from "@/server/route-utils";
import { chatSchema } from "@/server/validators";
import { tripInclude } from "@/server/trip-service";
import { toChatDto, toTrip } from "@/server/serialize";
import { chatToolCall } from "@/lib/ai/planner";
import { enforceRateLimit } from "@/server/rate-limit";

function sseMessage(data: unknown): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const allowed = await enforceRateLimit("ai:chat:global", 60, 60);
  if (!allowed) return jsonError("AI chat rate limit exceeded", 429);

  const parsed = await parseJson(request, chatSchema);
  if (!parsed.ok) return parsed.response;

  const { id } = await params;
  const trip = await prisma.trip.findFirst({
    where: { OR: [{ id }, { slug: id }] },
    include: tripInclude,
  });
  if (!trip) return jsonError("Trip not found", 404);

  const userMessage = await prisma.chatMessage.create({
    data: {
      tripId: trip.id,
      role: "user",
      content: parsed.data.content,
    },
  });

  const context = [
    `Trip: ${trip.title}`,
    ...trip.days.map((day) => `Day ${day.dayNumber}: ${day.activities.map((a) => a.poi?.name || a.customTitle || a.id).join(" | ")}`),
  ].join("\n");

  let tool = null;
  try {
    tool = await chatToolCall({ instruction: parsed.data.content, context });
  } catch {
    tool = null;
  }

  let updatedActivity: any = null;
  let assistantText = "I have noted your edit request.";

  if (tool?.name === "remove_activity" && typeof tool.args.activityId === "string") {
    await prisma.activity.delete({ where: { id: tool.args.activityId } });
    assistantText = "Removed that activity and kept the day order intact.";
  } else if (tool?.name === "modify_activity" && typeof tool.args.activityId === "string") {
    updatedActivity = await prisma.activity.update({
      where: { id: tool.args.activityId },
      data: {
        category: typeof tool.args.category === "string" ? (tool.args.category as any) : undefined,
        startTime: typeof tool.args.startTime === "string" ? tool.args.startTime : undefined,
        endTime: typeof tool.args.endTime === "string" ? tool.args.endTime : undefined,
        notes: typeof tool.args.notes === "string" ? tool.args.notes : undefined,
      },
      include: { poi: { include: { region: true } } },
    });
    assistantText = "Updated that stop.";
  } else if (tool?.name === "add_activity" && typeof tool.args.tripDayId === "string") {
    const day = await prisma.tripDay.findUnique({ where: { id: tool.args.tripDayId }, include: { activities: true } });
    if (day) {
      updatedActivity = await prisma.activity.create({
        data: {
          tripDayId: day.id,
          poiId: typeof tool.args.poiId === "string" ? tool.args.poiId : null,
          customTitle: typeof tool.args.customTitle === "string" ? tool.args.customTitle : null,
          category: (typeof tool.args.category === "string" ? tool.args.category : "SIGHTSEEING") as any,
          startTime: typeof tool.args.startTime === "string" ? tool.args.startTime : "10:00",
          endTime: typeof tool.args.endTime === "string" ? tool.args.endTime : "11:00",
          orderIndex: day.activities.length,
        },
        include: { poi: { include: { region: true } } },
      });
      assistantText = "Added a new stop.";
    }
  } else if (tool?.name === "reorder_activities" && typeof tool.args.tripDayId === "string" && Array.isArray(tool.args.orderedActivityIds)) {
    await prisma.$transaction(
      (tool.args.orderedActivityIds as string[]).map((id, index) =>
        prisma.activity.update({ where: { id }, data: { orderIndex: index } }),
      ),
    );
    assistantText = "Reordered activities for that day.";
  } else if (tool?.name === "swap_activity" && typeof tool.args.activityId === "string") {
    const activity = await prisma.activity.findUnique({
      where: { id: tool.args.activityId },
      include: { tripDay: { include: { trip: true } } },
    });
    if (activity) {
      const replacement = await prisma.pOI.findFirst({
        where: {
          regionId: activity.tripDay.regionId ?? undefined,
          id: { not: activity.poiId ?? undefined },
          requiresPermit: false,
          bestSeasons: { hasSome: activity.tripDay.trip.startDate <= activity.tripDay.trip.endDate ? [] : [] },
        },
      });
      if (replacement) {
        updatedActivity = await prisma.activity.update({
          where: { id: activity.id },
          data: { poiId: replacement.id, customTitle: null },
          include: { poi: { include: { region: true } } },
        });
        assistantText = "Swapped that stop with a verified alternative.";
      }
    }
  }

  const assistant = await prisma.chatMessage.create({
    data: {
      tripId: trip.id,
      role: "assistant",
      content: assistantText,
      toolCalls: tool ? [{ name: tool.name, arguments: tool.args }] : null,
    },
  });

  const freshTrip = await prisma.trip.findUnique({ where: { id: trip.id }, include: tripInclude });
  const tripDto = toTrip(freshTrip!);

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(sseMessage({ type: "message", tripId: trip.id, message: toChatDto(userMessage) })));
      if (updatedActivity) {
        controller.enqueue(
          new TextEncoder().encode(
            sseMessage({
              type: "activity-updated",
              tripId: trip.id,
              activity: {
                id: updatedActivity.id,
                tripDayId: updatedActivity.tripDayId,
                poiId: updatedActivity.poiId,
                poi: updatedActivity.poi,
                customTitle: updatedActivity.customTitle,
                category: updatedActivity.category,
                startTime: updatedActivity.startTime,
                endTime: updatedActivity.endTime,
                orderIndex: updatedActivity.orderIndex,
                notes: updatedActivity.notes,
                estimatedCost: updatedActivity.estimatedCost,
                costCurrency: updatedActivity.costCurrency,
                addedByUserId: updatedActivity.addedByUserId,
              },
              message: toChatDto(assistant),
            }),
          ),
        );
      } else {
        controller.enqueue(new TextEncoder().encode(sseMessage({ type: "message", tripId: trip.id, message: toChatDto(assistant) })));
      }
      controller.enqueue(
        new TextEncoder().encode(sseMessage({ type: "complete", tripId: trip.id, trip: tripDto, message: toChatDto(assistant) })),
      );
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
