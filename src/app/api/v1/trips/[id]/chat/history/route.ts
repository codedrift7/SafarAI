import { prisma } from "@/server/db";
import { jsonOk } from "@/server/http";
import { requireAuth } from "@/server/auth";
import { requireTripAccess } from "@/server/trip-service";
import { toChatDto } from "@/server/serialize";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const access = await requireTripAccess(id, auth.payload.sub, "VIEWER");
  if (!access.ok) return access.response;

  const messages = await prisma.chatMessage.findMany({
    where: { tripId: access.trip.id },
    orderBy: { createdAt: "asc" },
  });
  return jsonOk(messages.map(toChatDto));
}
