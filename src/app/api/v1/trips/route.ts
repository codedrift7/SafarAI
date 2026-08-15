import { prisma } from "@/server/db";
import { jsonError, jsonOk } from "@/server/http";
import { parseJson } from "@/server/route-utils";
import { createTripSchema } from "@/server/validators";
import { toTrip } from "@/server/serialize";
import { getTripByIdOrSlug, tripInclude } from "@/server/trip-service";
import { getCurrentUserPayload } from "@/server/auth";

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 70);
}

export async function GET() {
  const trips = await prisma.trip.findMany({
    include: tripInclude,
    orderBy: { updatedAt: "desc" },
  });
  return jsonOk(trips.map(toTrip));
}

export async function POST(request: Request) {
  const parsed = await parseJson(request, createTripSchema);
  if (!parsed.ok) return parsed.response;

  const auth = await getCurrentUserPayload();
  const ownerId = auth?.sub ?? "user-sana-khan";
  const owner = await prisma.user.findUnique({ where: { id: ownerId } });
  if (!owner) return jsonError("Owner user not found", 401);

  const region = parsed.data.regionSlug
    ? await prisma.region.findUnique({ where: { slug: parsed.data.regionSlug } })
    : null;

  const baseTitle =
    parsed.data.title ||
    (region ? `${region.name}, your way` : parsed.data.destination ? `${parsed.data.destination} with Safar` : "A new Safar");

  const created = await prisma.trip.create({
    data: {
      ownerId,
      title: baseTitle,
      slug: `${slugify(baseTitle)}-${Date.now().toString(36)}`,
      startDate: new Date(parsed.data.startDate),
      endDate: new Date(parsed.data.endDate),
      travelerType: parsed.data.travelerType,
      budgetTier: parsed.data.budgetTier ?? null,
      pace: parsed.data.pace ?? "balanced",
      coverImageUrl: parsed.data.coverImageUrl ?? null,
      status: "DRAFT",
      collaborators: {
        create: {
          userId: ownerId,
          role: "OWNER",
          joinedAt: new Date(),
        },
      },
    },
    include: tripInclude,
  });

  return jsonOk(toTrip(created), { status: 201 });
}
