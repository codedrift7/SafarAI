import { prisma } from "@/server/db";
import { jsonError, jsonOk } from "@/server/http";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const activity = await prisma.activity.findUnique({ where: { id } });
  if (!activity) return jsonError("Activity not found", 404);

  const user = await prisma.user.findFirst();
  if (!user) return jsonError("No user available", 401);

  await prisma.activityVote.upsert({
    where: { activityId_userId: { activityId: id, userId: user.id } },
    update: {},
    create: { activityId: id, userId: user.id },
  });

  const votes = await prisma.activityVote.count({ where: { activityId: id } });
  return jsonOk({ activityId: id, votes });
}
