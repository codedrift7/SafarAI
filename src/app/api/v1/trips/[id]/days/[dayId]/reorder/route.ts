import { prisma } from "@/server/db";
import { jsonError, jsonOk } from "@/server/http";
import { parseJson } from "@/server/route-utils";
import { reorderSchema } from "@/server/validators";
import { requireAuth } from "@/server/auth";
import { requireTripAccess } from "@/server/trip-service";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string; dayId: string }> }) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const { id, dayId } = await params;
  const access = await requireTripAccess(id, auth.payload.sub, "EDITOR");
  if (!access.ok) return access.response;

  const parsed = await parseJson(request, reorderSchema);
  if (!parsed.ok) return parsed.response;

  const day = await prisma.tripDay.findUnique({ where: { id: dayId }, include: { activities: true } });
  if (!day || day.tripId !== access.trip.id) return jsonError("Trip day not found", 404);

  const idSet = new Set(parsed.data.orderedActivityIds);
  const dayActivityIds = new Set(day.activities.map((activity) => activity.id));
  if (
    parsed.data.orderedActivityIds.length !== day.activities.length ||
    idSet.size !== day.activities.length ||
    [...idSet].some((activityId) => !dayActivityIds.has(activityId))
  ) {
    return jsonError("Every activity id must be included exactly once", 422);
  }

  await prisma.$transaction(
    parsed.data.orderedActivityIds.map((activityId, index) =>
      prisma.activity.update({ where: { id: activityId }, data: { orderIndex: index } }),
    ),
  );

  const refreshed = await prisma.tripDay.findUnique({
    where: { id: dayId },
    include: { region: true, activities: { include: { poi: { include: { region: true } } }, orderBy: { orderIndex: "asc" } } },
  });

  return jsonOk({
    id: refreshed!.id,
    tripId: refreshed!.tripId,
    dayNumber: refreshed!.dayNumber,
    date: refreshed!.date.toISOString(),
    regionId: refreshed!.regionId,
    region: refreshed!.region,
    notes: refreshed!.notes,
    activities: refreshed!.activities,
  });
}