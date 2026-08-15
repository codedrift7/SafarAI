import { prisma } from "@/server/db";
import { jsonError, jsonOk } from "@/server/http";
import { parseJson } from "@/server/route-utils";
import { updateTripSchema } from "@/server/validators";
import { toTrip } from "@/server/serialize";
import { tripInclude } from "@/server/trip-service";

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 70);
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const trip = await prisma.trip.findFirst({
    where: { OR: [{ id }, { slug: id }] },
    include: tripInclude,
  });
  if (!trip) return jsonError("Trip not found", 404);
  return jsonOk(toTrip(trip));
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const parsed = await parseJson(request, updateTripSchema);
  if (!parsed.ok) return parsed.response;
  const { id } = await params;

  const existing = await prisma.trip.findFirst({ where: { OR: [{ id }, { slug: id }] } });
  if (!existing) return jsonError("Trip not found", 404);

  const shouldPublish = parsed.data.isPublic === true;
  const nextShareToken =
    parsed.data.shareToken !== undefined
      ? parsed.data.shareToken
      : shouldPublish && !existing.shareToken
        ? `${slugify(existing.title)}-${existing.id.slice(-6)}`
        : existing.shareToken;

  const trip = await prisma.trip.update({
    where: { id: existing.id },
    data: {
      title: parsed.data.title,
      startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : undefined,
      endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : undefined,
      travelerType: parsed.data.travelerType,
      budgetTier: parsed.data.budgetTier,
      pace: parsed.data.pace,
      status: parsed.data.status,
      coverImageUrl: parsed.data.coverImageUrl,
      isPublic: parsed.data.isPublic,
      shareToken: nextShareToken,
    },
    include: tripInclude,
  });

  return jsonOk(toTrip(trip));
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const existing = await prisma.trip.findFirst({ where: { OR: [{ id }, { slug: id }] } });
  if (!existing) return jsonError("Trip not found", 404);
  await prisma.trip.delete({ where: { id: existing.id } });
  return jsonOk({ ok: true });
}
