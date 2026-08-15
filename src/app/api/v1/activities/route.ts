import { prisma } from "@/server/db";
import { jsonOk } from "@/server/http";
import { parseJson } from "@/server/route-utils";
import { createActivitySchema } from "@/server/validators";

export async function POST(request: Request) {
  const parsed = await parseJson(request, createActivitySchema);
  if (!parsed.ok) return parsed.response;

  const day = await prisma.tripDay.findUnique({ where: { id: parsed.data.tripDayId }, include: { activities: true } });
  if (!day) return Response.json({ error: "Trip day not found" }, { status: 404 });

  const orderIndex = parsed.data.afterActivityId
    ? Math.max(0, day.activities.find((activity) => activity.id === parsed.data.afterActivityId)?.orderIndex ?? day.activities.length - 1) + 1
    : day.activities.length;

  if (parsed.data.afterActivityId) {
    await prisma.activity.updateMany({
      where: { tripDayId: day.id, orderIndex: { gte: orderIndex } },
      data: { orderIndex: { increment: 1 } },
    });
  }

  const activity = await prisma.activity.create({
    data: {
      tripDayId: parsed.data.tripDayId,
      poiId: parsed.data.poiId ?? null,
      customTitle: parsed.data.customTitle ?? null,
      category: parsed.data.category,
      startTime: parsed.data.startTime ?? null,
      endTime: parsed.data.endTime ?? null,
      notes: parsed.data.notes ?? null,
      estimatedCost: parsed.data.estimatedCost ?? null,
      costCurrency: parsed.data.costCurrency ?? "PKR",
      orderIndex,
    },
    include: { poi: { include: { region: true } } },
  });

  return jsonOk({
    id: activity.id,
    tripDayId: activity.tripDayId,
    poiId: activity.poiId,
    poi: activity.poi,
    customTitle: activity.customTitle,
    category: activity.category,
    startTime: activity.startTime,
    endTime: activity.endTime,
    orderIndex: activity.orderIndex,
    notes: activity.notes,
    estimatedCost: activity.estimatedCost,
    costCurrency: activity.costCurrency,
    addedByUserId: activity.addedByUserId,
  });
}
