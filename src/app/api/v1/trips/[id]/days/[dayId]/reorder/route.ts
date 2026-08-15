import { prisma } from "@/server/db";
import { jsonError, jsonOk } from "@/server/http";
import { parseJson } from "@/server/route-utils";
import { reorderSchema } from "@/server/validators";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string; dayId: string }> }) {
  const parsed = await parseJson(request, reorderSchema);
  if (!parsed.ok) return parsed.response;

  const { dayId } = await params;
  const day = await prisma.tripDay.findUnique({ where: { id: dayId }, include: { activities: true } });
  if (!day) return jsonError("Trip day not found", 404);

  const idSet = new Set(parsed.data.orderedActivityIds);
  if (idSet.size !== day.activities.length) {
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
