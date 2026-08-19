import { prisma } from "@/server/db";
import { jsonError, jsonOk } from "@/server/http";
import { requireAuth } from "@/server/auth";
import { requireTripAccess } from "@/server/trip-service";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const activity = await prisma.activity.findUnique({
    where: { id },
    include: { tripDay: { select: { tripId: true } } },
  });
  if (!activity) return jsonError("Activity not found", 404);

  const access = await requireTripAccess(activity.tripDay.tripId, auth.payload.sub, "VIEWER");
  if (!access.ok) return access.response;

  const userId = auth.payload.sub;

  await prisma.activityVote.upsert({
    where: { activityId_userId: { activityId: id, userId } },
    update: {},
    create: { activityId: id, userId },
  });

  const votes = await prisma.activityVote.count({ where: { activityId: id } });
  return jsonOk({ activityId: id, votes });
}