// src/app/api/v1/activities/[id]/route.ts
import { prisma } from "@/server/db";
import { jsonError, jsonOk } from "@/server/http";
import { parseJson } from "@/server/route-utils";
import { updateActivitySchema } from "@/server/validators";
import { requireTripAccess } from "@/server/trip-service";
import { requireAuth } from "@/server/auth";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const { id } = await params;

  const existing = await prisma.activity.findUnique({
    where: { id },
    include: { tripDay: { select: { tripId: true } } },
  });
  if (!existing) return jsonError("Activity not found", 404);

  const access = await requireTripAccess(existing.tripDay.tripId, auth.payload.sub, "EDITOR");
  if (!access.ok) return access.response;

  const parsed = await parseJson(request, updateActivitySchema);
  if (!parsed.ok) return parsed.response;

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
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const { id } = await params;

  const activity = await prisma.activity.findUnique({
    where: { id },
    include: { tripDay: { select: { tripId: true } } },
  });
  if (!activity) return jsonError("Activity not found", 404);

  const access = await requireTripAccess(activity.tripDay.tripId, auth.payload.sub, "EDITOR");
  if (!access.ok) return access.response;

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
