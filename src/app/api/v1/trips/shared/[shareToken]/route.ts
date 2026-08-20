import { prisma } from "@/server/db";
import { jsonError, jsonOk } from "@/server/http";
import { toPublicTrip } from "@/server/serialize";
import { tripInclude } from "@/server/trip-service";

export async function GET(_: Request, { params }: { params: Promise<{ shareToken: string }> }) {
  const { shareToken } = await params;
  const trip = await prisma.trip.findFirst({
    where: { shareToken, isPublic: true },
    include: tripInclude,
  });
  if (!trip) return jsonError("Trip not found", 404);
  return jsonOk(toPublicTrip(trip));
}
