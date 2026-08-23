import { prisma } from "@/server/db";
import { jsonOk } from "@/server/http";
import { requireAuthOrRenderToken } from "@/server/auth";
import { requireTripAccess } from "@/server/trip-service";
import { toChatDto } from "@/server/serialize";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // A1f: Accept either a normal cookie session or a render token scoped to this trip.
  const auth = await requireAuthOrRenderToken(id);
  if (!auth.ok) return auth.response;

  const access = await requireTripAccess(id, auth.payload.sub, "VIEWER");
  if (!access.ok) return access.response;

  const messages = await prisma.chatMessage.findMany({
    where: { tripId: access.trip.id },
    orderBy: { createdAt: "asc" },
  });
  return jsonOk(messages.map(toChatDto));
}
