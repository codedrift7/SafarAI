import { prisma } from "@/server/db";
import { jsonError } from "@/server/http";
import { parseJson } from "@/server/route-utils";
import { generateSchema } from "@/server/validators";
import { toTrip } from "@/server/serialize";
import { tripInclude } from "@/server/trip-service";
import { getCandidatePois } from "@/server/candidates";
import { enforceRateLimit } from "@/server/rate-limit";
import { generateItineraryWithRetry } from "@/lib/ai/planner";
import { poiAdvisories } from "@/server/advisories";

function sseMessage(data: unknown): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const allowed = await enforceRateLimit("ai:generate:global", 30, 60);
  if (!allowed) return jsonError("AI generation rate limit exceeded", 429);

  const parsed = await parseJson(request, generateSchema);
  if (!parsed.ok) return parsed.response;

  const { id } = await params;
  const trip = await prisma.trip.findFirst({ where: { OR: [{ id }, { slug: id }] }, include: { days: true } });
  if (!trip) return jsonError("Trip not found", 404);

  const startDate = parsed.data.startDate ? new Date(parsed.data.startDate) : trip.startDate;
  const endDate = parsed.data.endDate ? new Date(parsed.data.endDate) : trip.endDate;

  const region = parsed.data.regionSlug
    ? await prisma.region.findUnique({ where: { slug: parsed.data.regionSlug } })
    : null;

  const candidates = await getCandidatePois({
    regionId: region?.id,
    startDate,
    endDate,
  });

  if (!candidates.length) {
    return jsonError("No candidate POIs available for this trip window", 422);
  }

  const modelResult = await generateItineraryWithRetry({
    userPrompt: parsed.data.prompt || parsed.data.destination || "Build a grounded itinerary",
    todayIso: new Date().toISOString(),
    tripDateRange: `${startDate.toISOString()}..${endDate.toISOString()}`,
    candidatePois: candidates.map((poi) => ({
      id: poi.id,
      name: poi.name,
      slug: poi.slug,
      regionId: poi.regionId,
      region: {
        id: poi.region.id,
        name: poi.region.name,
        province: poi.region.province,
        slug: poi.region.slug,
        description: poi.region.description,
        heroImageUrl: poi.region.heroImageUrl,
        bestSeasons: poi.region.bestSeasons as any,
        typicalTripDays: poi.region.typicalTripDays,
      },
      category: poi.category as any,
      latitude: poi.latitude,
      longitude: poi.longitude,
      description: poi.description,
      bestSeasons: poi.bestSeasons as any,
      altitudeMeters: poi.altitudeMeters,
      requiresPermit: poi.requiresPermit,
      permitAuthority: poi.permitAuthority,
      permitNotes: poi.permitNotes,
      roadCondition: poi.roadCondition as any,
      avgVisitHours: poi.avgVisitHours,
      entryFeePkr: poi.entryFeePkr,
      safetyNotes: poi.safetyNotes,
      googlePlaceId: poi.googlePlaceId,
      photos: poi.photos,
      source: (poi.source as any) || "curated",
      verifiedAt: poi.verifiedAt?.toISOString() ?? null,
    })),
  });

  const candidateSet = new Set(candidates.map((poi) => poi.id));

  await prisma.$transaction(async (tx) => {
    await tx.activity.deleteMany({ where: { tripDay: { tripId: trip.id } } });
    await tx.tripDay.deleteMany({ where: { tripId: trip.id } });

    for (const day of modelResult.days) {
      const tripDay = await tx.tripDay.create({
        data: {
          tripId: trip.id,
          dayNumber: day.dayNumber,
          date: new Date(startDate.getTime() + (day.dayNumber - 1) * 86400000),
          regionId: region?.id ?? null,
          notes: null,
        },
      });

      for (const [index, activity] of day.activities.entries()) {
        const validPoiId = activity.poiId && candidateSet.has(activity.poiId) ? activity.poiId : null;
        await tx.activity.create({
          data: {
            tripDayId: tripDay.id,
            poiId: validPoiId,
            customTitle: validPoiId ? null : activity.customTitle || "AI suggestion, unverified",
            category: activity.category as any,
            startTime: activity.startTime,
            endTime: activity.endTime,
            orderIndex: index,
            notes: validPoiId ? activity.note : `${activity.note || ""} Unverified AI suggestion.`.trim(),
          },
        });
      }
    }

    await tx.trip.update({ where: { id: trip.id }, data: { status: "CONFIRMED" } });
  });

  const hydratedTrip = await prisma.trip.findUnique({ where: { id: trip.id }, include: tripInclude });
  const dto = toTrip(hydratedTrip!);

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(sseMessage({ type: "status", tripId: trip.id, message: "Grounded POIs selected", progress: 5 })));
      const total = dto.days.length || 1;
      dto.days.forEach((day, idx) => {
        const advisories = day.activities.flatMap((activity) =>
          activity.poi ? poiAdvisories(activity.poi, dto.startDate, dto.endDate, activity.id) : [],
        );
        controller.enqueue(
          new TextEncoder().encode(
            sseMessage({
              type: "day",
              tripId: trip.id,
              day,
              advisories,
              progress: Math.round(((idx + 1) / total) * 90) + 5,
            }),
          ),
        );
      });
      controller.enqueue(new TextEncoder().encode(sseMessage({ type: "complete", tripId: trip.id, trip: dto, progress: 100 })));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
