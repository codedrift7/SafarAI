import { Prisma } from "@prisma/client";
import { prisma } from "@/server/db";
import { jsonError } from "@/server/http";
import { parseJson } from "@/server/route-utils";
import { chatSchema } from "@/server/validators";
import { requireTripAccess, tripInclude } from "@/server/trip-service";
import { toChatDto, toTrip } from "@/server/serialize";
import { chatToolCall } from "@/lib/ai/planner";
import { enforceRateLimit } from "@/server/rate-limit";
import { requireAuth } from "@/server/auth";
import { getCandidatePois } from "@/server/candidates";

// Mirrors the POICategory enum in schema.prisma — used to validate a chat-supplied
// replacementCriteria string before passing it to getCandidatePois' categoryMix filter.
const POI_CATEGORIES = [
  "MOUNTAIN",
  "LAKE",
  "FORT",
  "MOSQUE",
  "SHRINE",
  "MUSEUM",
  "BAZAAR",
  "WATERFALL",
  "NATIONAL_PARK",
  "HILL_STATION",
  "VALLEY",
  "GLACIER",
  "ARCHAEOLOGICAL_SITE",
  "CITY_LANDMARK",
  "RESTAURANT",
  "VIEWPOINT",
];

// Fallback for swap_activity's replacementCriteria when the model passes through free text
// instead of an exact POICategory value (design.md's own example: "something outdoors").
// Not full NLP — a small explicit keyword map for the phrasing users are most likely to use.
// Broad words map to several categories rather than one arbitrary pick; anything unmatched
// falls through to `undefined` (no category filter), same as the previous behavior.
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  OUTDOOR: ["MOUNTAIN", "LAKE", "WATERFALL", "NATIONAL_PARK", "VALLEY", "GLACIER", "VIEWPOINT", "HILL_STATION"],
  OUTDOORS: ["MOUNTAIN", "LAKE", "WATERFALL", "NATIONAL_PARK", "VALLEY", "GLACIER", "VIEWPOINT", "HILL_STATION"],
  NATURE: ["MOUNTAIN", "LAKE", "WATERFALL", "NATIONAL_PARK", "VALLEY", "GLACIER", "VIEWPOINT"],
  ADVENTURE: ["MOUNTAIN", "WATERFALL", "NATIONAL_PARK", "GLACIER"],
  ADVENTUROUS: ["MOUNTAIN", "WATERFALL", "NATIONAL_PARK", "GLACIER"],
  HISTORY: ["FORT", "ARCHAEOLOGICAL_SITE", "MUSEUM", "CITY_LANDMARK"],
  HISTORICAL: ["FORT", "ARCHAEOLOGICAL_SITE", "MUSEUM", "CITY_LANDMARK"],
  CULTURE: ["MUSEUM", "ARCHAEOLOGICAL_SITE", "SHRINE", "MOSQUE", "BAZAAR"],
  CULTURAL: ["MUSEUM", "ARCHAEOLOGICAL_SITE", "SHRINE", "MOSQUE", "BAZAAR"],
  RELIGIOUS: ["MOSQUE", "SHRINE"],
  RELIGION: ["MOSQUE", "SHRINE"],
  FOOD: ["RESTAURANT"],
  EAT: ["RESTAURANT"],
  EATING: ["RESTAURANT"],
  DINING: ["RESTAURANT"],
  SHOPPING: ["BAZAAR"],
  SHOP: ["BAZAAR"],
  SHOPS: ["BAZAAR"],
  MARKET: ["BAZAAR"],
  MARKETS: ["BAZAAR"],
  SCENIC: ["VIEWPOINT", "VALLEY", "LAKE", "HILL_STATION"],
  VIEWS: ["VIEWPOINT"],
  RELAX: ["LAKE", "HILL_STATION", "VALLEY"],
  RELAXING: ["LAKE", "HILL_STATION", "VALLEY"],
  CHILL: ["LAKE", "HILL_STATION", "VALLEY"],
  WATER: ["LAKE", "WATERFALL", "GLACIER"],
  INDOOR: ["MUSEUM", "BAZAAR", "RESTAURANT"],
  INDOORS: ["MUSEUM", "BAZAAR", "RESTAURANT"],
};

function categoriesForFreeText(text: string): string[] | undefined {
  const words = text.split(/[^A-Z]+/).filter(Boolean);
  for (const word of words) {
    const match = CATEGORY_KEYWORDS[word];
    if (match) return match;
  }
  return undefined;
}

function sseMessage(data: unknown): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const allowed = await enforceRateLimit("ai:chat:global", 60, 60);
  if (!allowed) return jsonError("AI chat rate limit exceeded", 429);

  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  // Global check above guards against unauthenticated/pre-auth flooding; this one is the
  // actual per-account throttle — without it, a single user can exhaust the shared global
  // budget and lock out every other user (see src/server/rate-limit.ts).
  const perUserAllowed = await enforceRateLimit(`ai:chat:user:${auth.payload.sub}`, 20, 60);
  if (!perUserAllowed) {
    return jsonError("You're sending edits too quickly. Please wait a moment and try again.", 429);
  }

  const { id } = await params;
  const access = await requireTripAccess(id, auth.payload.sub, "EDITOR");
  if (!access.ok) return access.response;
  const { trip } = access;

  const parsed = await parseJson(request, chatSchema);
  if (!parsed.ok) return parsed.response;

  const userMessage = await prisma.chatMessage.create({
    data: {
      tripId: trip.id,
      role: "user",
      content: parsed.data.content,
    },
  });

  const context = [
    `Trip: ${trip.title}`,
    ...trip.days.map(
      (day: (typeof trip.days)[number]) =>
        `Day ${day.dayNumber} [tripDayId=${day.id}]: ${day.activities
          .map(
            (a: (typeof day.activities)[number]) =>
              `${a.poi?.name || a.customTitle || a.id} [activityId=${a.id}]`
          )
          .join(" | ")}`
    ),
  ].join("\n");

  let tool = null;

  try {
    tool = await chatToolCall({
      instruction: parsed.data.content,
      context,
    });
  } catch {
    tool = null;
  }

  console.log("CHAT TOOL RESULT:", JSON.stringify(tool, null, 2));

  let updatedActivity: any = null;
  let assistantText = "I have noted your edit request.";

  if (tool?.name === "remove_activity" && typeof tool.args.activityId === "string") {
    const target = await prisma.activity.findUnique({
      where: { id: tool.args.activityId },
      select: { tripDay: { select: { tripId: true } } },
    });
    if (target && target.tripDay.tripId === trip.id) {
      await prisma.activity.delete({ where: { id: tool.args.activityId } });
      assistantText = "Removed that activity and kept the day order intact.";
    } else {
      assistantText = "I couldn't find that activity on this trip, so nothing was changed.";
    }
  } else if (tool?.name === "modify_activity" && typeof tool.args.activityId === "string") {
    const target = await prisma.activity.findUnique({
      where: { id: tool.args.activityId },
      select: { tripDay: { select: { tripId: true } } },
    });
    if (target && target.tripDay.tripId === trip.id) {
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
    } else {
      assistantText = "I couldn't find that activity on this trip, so nothing was changed.";
    }
  } else if (tool?.name === "add_activity" && typeof tool.args.tripDayId === "string") {
    const day = await prisma.tripDay.findUnique({ where: { id: tool.args.tripDayId }, include: { activities: true } });
    if (day && day.tripId === trip.id) {
      const requestedCategory =
        typeof tool.args.category === "string"
          ? tool.args.category.trim().toUpperCase()
          : "";

      const categoryMix = POI_CATEGORIES.includes(requestedCategory)
        ? [requestedCategory]
        : undefined;

      const candidates = await getCandidatePois({
        regionId: day.regionId ?? undefined,
        startDate: trip.startDate,
        endDate: trip.endDate,
        categoryMix,
      });
      const candidateSet = new Set(candidates.map((poi) => poi.id));
      const requestedPoiId = typeof tool.args.poiId === "string" ? tool.args.poiId : null;
      // Anti-hallucination: only honor poiId if it's in the retrieved candidate set (matches
      // the /generate route's candidateSet.has(...) pattern). Otherwise null it out — the
      // client is expected to render null-poiId activities as "AI suggestion, unverified".
      const poiId = requestedPoiId && candidateSet.has(requestedPoiId) ? requestedPoiId : null;

      const activityCategoryMap: Record<string, string> = {
        MOUNTAIN: "ADVENTURE",
        LAKE: "SIGHTSEEING",
        FORT: "SIGHTSEEING",
        MOSQUE: "RELIGIOUS",
        SHRINE: "RELIGIOUS",
        MUSEUM: "SIGHTSEEING",
        BAZAAR: "SHOPPING",
        WATERFALL: "ADVENTURE",
        NATIONAL_PARK: "ADVENTURE",
        HILL_STATION: "SIGHTSEEING",
        VALLEY: "SIGHTSEEING",
        GLACIER: "ADVENTURE",
        ARCHAEOLOGICAL_SITE: "SIGHTSEEING",
        CITY_LANDMARK: "SIGHTSEEING",
        RESTAURANT: "FOOD",
        VIEWPOINT: "SIGHTSEEING",
      };

      const requestedPoiCategory =
        typeof tool.args.category === "string"
          ? tool.args.category.trim().toUpperCase()
          : "";

      const activityCategory =
        activityCategoryMap[requestedPoiCategory] ?? "SIGHTSEEING";

      updatedActivity = await prisma.activity.create({
        data: {
          tripDayId: day.id,
          poiId,
          customTitle: typeof tool.args.customTitle === "string" ? tool.args.customTitle : null,
          category: activityCategory as any,
          startTime: typeof tool.args.startTime === "string" ? tool.args.startTime : "10:00",
          endTime: typeof tool.args.endTime === "string" ? tool.args.endTime : "11:00",
          orderIndex: day.activities.length,
          addedByUserId: auth.payload.sub,
        },
        include: { poi: { include: { region: true } } },
      });
      assistantText = "Added a new stop.";
    } else {
      assistantText = "I couldn't find that day on this trip, so nothing was added.";
    }
  } else if (tool?.name === "reorder_activities" && typeof tool.args.tripDayId === "string" && Array.isArray(tool.args.orderedActivityIds)) {
    const day = await prisma.tripDay.findUnique({
      where: { id: tool.args.tripDayId },
      include: { activities: { select: { id: true } } },
    });
    const orderedIds = tool.args.orderedActivityIds as string[];
    const dayActivityIds = new Set(day?.activities.map((a: NonNullable<typeof day>["activities"][number]) => a.id) ?? []);
    // Scope check: every submitted id must belong to this day (and this day to this trip),
    // and the set must match exactly — no dropping or injecting ids from elsewhere.
    const validReorder =
      day &&
      day.tripId === trip.id &&
      orderedIds.length === dayActivityIds.size &&
      orderedIds.every((activityId) => dayActivityIds.has(activityId));

    if (validReorder) {
      await prisma.$transaction(
        orderedIds.map((activityId, index) =>
          prisma.activity.update({ where: { id: activityId }, data: { orderIndex: index } }),
        ),
      );
      assistantText = "Reordered activities for that day.";
    } else {
      assistantText = "That reorder request didn't match this day's activities, so nothing was changed.";
    }
  } else if (tool?.name === "swap_activity" && typeof tool.args.activityId === "string") {
    const activity = await prisma.activity.findUnique({
      where: { id: tool.args.activityId },
      include: { tripDay: true },
    });
    if (activity && activity.tripDay.tripId === trip.id) {
      const rawCriteria =
        typeof tool.args.replacementCriteria === "string" ? tool.args.replacementCriteria.trim().toUpperCase() : "";
      // Prefer an exact POICategory match; fall back to the keyword map above for common
      // free-text phrasing the model passes through unnormalized (design.md's own example:
      // "something outdoors").
      const categoryMix = POI_CATEGORIES.includes(rawCriteria)
        ? [rawCriteria]
        : categoriesForFreeText(rawCriteria);

      const candidates = await getCandidatePois({
        regionId: activity.tripDay.regionId ?? undefined,
        startDate: trip.startDate,
        endDate: trip.endDate,
        categoryMix,
        excludePermitRequired: true,
      });

      const replacement = candidates.find((poi) => poi.id !== activity.poiId);

      if (replacement) {
        updatedActivity = await prisma.activity.update({
          where: { id: activity.id },
          data: { poiId: replacement.id, customTitle: null },
          include: { poi: { include: { region: true } } },
        });
        assistantText = "Swapped that stop with a verified alternative.";
      } else {
        assistantText = "I couldn't find a verified alternative matching that request, so nothing was changed.";
      }
    } else {
      assistantText = "I couldn't find that activity on this trip, so nothing was changed.";
    }
  }

  const assistant = await prisma.chatMessage.create({
    data: {
      tripId: trip.id,
      role: "assistant",
      content: assistantText,
      toolCalls: tool
        ? ([{ name: tool.name, arguments: tool.args }] as unknown as Prisma.InputJsonValue)
        : Prisma.JsonNull,
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