import { prisma } from "@/server/db";
import { jsonError, jsonOk } from "@/server/http";
import { parseJson } from "@/server/route-utils";
import { updateActivitySchema } from "@/server/validators";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const parsed = await parseJson(request, updateActivitySchema);
  if (!parsed.ok) return parsed.response;
  const { id } = await params;

  const activity = await prisma.activity.update({
    where: { id },
    data: {
      poiId: parsed.data.poiId,
      customTitle: parsed.data.customTitle,
      category: parsed.data.category,
      startTime: parsed.data.startTime,
      endTime: parsed.data.endTime,
      notes: parsed.data.notes,
      estimatedCost: parsed.data.estimatedCost,
      costCurrency: parsed.data.costCurrency,
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

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const activity = await prisma.activity.findUnique({ where: { id } });
  if (!activity) return jsonError("Activity not found", 404);
  await prisma.activity.delete({ where: { id } });
  await prisma.activity.updateMany({
    where: {
      tripDayId: activity.tripDayId,
      orderIndex: { gt: activity.orderIndex },
    },
    data: {
      orderIndex: { decrement: 1 },
    },
  });
  return jsonOk({ ok: true });
}
