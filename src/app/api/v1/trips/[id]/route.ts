// src/app/api/v1/trips/[id]/route.ts
import { prisma } from "@/server/db";
import { jsonOk } from "@/server/http";
import { parseJson } from "@/server/route-utils";
import { updateTripSchema } from "@/server/validators";
import { toTrip } from "@/server/serialize";
import { requireTripAccess, tripInclude } from "@/server/trip-service";
import { requireAuth } from "@/server/auth";

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 70);
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const { id } = await params;

  const access = await requireTripAccess(id, auth.payload.sub);
  if (!access.ok) return access.response;

  return jsonOk(toTrip(access.trip));
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const { id } = await params;

  const access = await requireTripAccess(id, auth.payload.sub, "EDITOR");
  if (!access.ok) return access.response;

  const parsed = await parseJson(request, updateTripSchema);
  if (!parsed.ok) return parsed.response;

  const existing = access.trip;
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
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const { id } = await params;

  const access = await requireTripAccess(id, auth.payload.sub, "OWNER");
  if (!access.ok) return access.response;

  await prisma.trip.delete({ where: { id: access.trip.id } });
  return jsonOk({ ok: true });
}
