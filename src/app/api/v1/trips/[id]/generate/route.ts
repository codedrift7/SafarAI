import { Prisma } from "@prisma/client";
import { prisma } from "@/server/db";
import { jsonError } from "@/server/http";
import { parseJson } from "@/server/route-utils";
import { generateSchema } from "@/server/validators";
import { toTrip } from "@/server/serialize";
import { tripInclude, requireTripAccess } from "@/server/trip-service";
import { getCandidatePois } from "@/server/candidates";
import { enforceRateLimit } from "@/server/rate-limit";
import { generateItineraryWithRetry, ItineraryGenerationError } from "@/lib/ai/planner";
import { poiAdvisories } from "@/server/advisories";
import { requireAuth } from "@/server/auth";

function sseMessage(data: unknown): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const allowed = await enforceRateLimit("ai:generate:global", 30, 60);
  if (!allowed) return jsonError("AI generation rate limit exceeded", 429);

  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  // Global check above guards against unauthenticated/pre-auth flooding; this one is the
  // actual per-account throttle — without it, a single user can exhaust the shared global
  // budget and lock out every other user (see src/server/rate-limit.ts).
  const perUserAllowed = await enforceRateLimit(`ai:generate:user:${auth.payload.sub}`, 5, 60);
  if (!perUserAllowed) {
    return jsonError("You're generating itineraries too quickly. Please wait a moment and try again.", 429);
  }

  const { id } = await params;
  const access = await requireTripAccess(id, auth.payload.sub, "EDITOR");
  if (!access.ok) return access.response;
  const trip = access.trip;

  const parsed = await parseJson(request, generateSchema);
  if (!parsed.ok) return parsed.response;

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

  let modelResult;
  try {
    modelResult = await generateItineraryWithRetry({
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
      // B2: Forward trip preferences — fall back to stored trip values when not overridden by
      // the generate request body. This makes solo/packed and family/relaxed trips differ.
      travelerType: parsed.data.travelerType ?? trip.travelerType,
      budgetTier: parsed.data.budgetTier !== undefined ? parsed.data.budgetTier : trip.budgetTier,
      pace: parsed.data.pace ?? trip.pace,
      // B5: vibe and partySize from the persisted Trip record
      vibe: (trip as any).vibe ?? null,
      partySize: (trip as any).partySize ?? null,
    });
  } catch (err) {
    if (err instanceof ItineraryGenerationError) {
      return jsonError(
        "We couldn't generate a reliable itinerary automatically. Please build this trip's days manually, or try generating again.",
        422,
      );
    }
    throw err;
  }

  // Layer 2: Post-generation gap detection and auto-fill.
  // Wrapped in try/catch — a failure here degrades to the model's ungapped output,
  // never takes down the request.
  let finalDays = modelResult.days;
  try {
    const { fillGaps } = await import("@/lib/ai/gap-filler");
    const { days, gapFillStats } = await fillGaps(
      modelResult.days,
      candidates.map((poi) => ({
        id: poi.id,
        name: poi.name,
        slug: poi.slug,
        regionId: poi.regionId,
        category: poi.category as any,
        latitude: poi.latitude,
        longitude: poi.longitude,
        description: poi.description,
        bestSeasons: poi.bestSeasons as any,
        altitudeMeters: poi.altitudeMeters,
        requiresPermit: poi.requiresPermit,
        avgVisitHours: poi.avgVisitHours,
        entryFeePkr: poi.entryFeePkr,
        safetyNotes: poi.safetyNotes,
        photos: poi.photos,
        source: (poi.source as any) || "curated",
      })) as any,
      { startDate, endDate },
      trip.pace ?? "balanced",
    );
    finalDays = days;
    if (gapFillStats.unfilled.length > 0) {
      console.warn("[gap-filler] unfilled gaps", { tripId: trip.id, gapFillStats });
    }
    if (gapFillStats.filled > 0 || gapFillStats.restFilled > 0) {
      console.log("[gap-filler] filled", {
        tripId: trip.id,
        filled: gapFillStats.filled,
        restFilled: gapFillStats.restFilled,
      });
    }
  } catch (err) {
    console.error("[gap-filler] failed, falling back to ungapped days", err);
  }

  // Layer 3: OSRM routing — inject real TRANSPORT legs between consecutive POIs.
  // Wrapped in try/catch — failure degrades to gap-filled days, never fails the request.
  // routingLegKeys identifies injected TRANSPORT activities in the Activity.create loop below.
  let routingLegKeys = new Set<string>();
  let routingStats = { legsInserted: 0, daysRescheduled: 0, timeConflicts: [] as any[], skipped: 0 };
  try {
    const { injectTransportLegs } = await import("@/lib/ai/routing");
    const routingResult = await injectTransportLegs(
      finalDays,
      candidates.map((poi) => ({
        id: poi.id,
        name: poi.name,
        latitude: poi.latitude,
        longitude: poi.longitude,
      })),
    );
    finalDays = routingResult.days;
    routingLegKeys = routingResult.routingLegKeys;
    routingStats = routingResult.routingStats;
    if (routingStats.legsInserted > 0 || routingStats.timeConflicts.length > 0) {
      console.log("[routing] transport legs injected", { tripId: trip.id, ...routingStats });
    }
    if (routingStats.timeConflicts.length > 0) {
      console.warn("[routing] time conflicts detected", { tripId: trip.id, conflicts: routingStats.timeConflicts });
    }
  } catch (err) {
    console.error("[routing] failed, falling back to gap-filled days", err);
  }

  const candidateSet = new Set(candidates.map((poi) => poi.id));

  // timeout: Prisma's default interactive-transaction timeout is 5 s.  With 20+ Activity
  // rows to write and each DB round-trip to Neon (ap-southeast-1) taking ~100–200 ms,
  // a typical 4-day trip easily exceeds that.  30 s gives plenty of room.
  // createMany per day: replaces N sequential awaited creates (one RTT each) with a
  // single batch insert per day — cuts DB round-trips from ~N to ~(days + 2 deletes + 1 update).
  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.activity.deleteMany({ where: { tripDay: { tripId: trip.id } } });
    await tx.tripDay.deleteMany({ where: { tripId: trip.id } });

    for (const day of finalDays) {
      const tripDay = await tx.tripDay.create({
        data: {
          tripId: trip.id,
          dayNumber: day.dayNumber,
          date: new Date(startDate.getTime() + (day.dayNumber - 1) * 86400000),
          regionId: region?.id ?? null,
          notes: null,
        },
      });

      // Build all activity rows for this day in memory, then insert in one batch.
      const activityRows = day.activities.map((activity, index) => {
        // REST and TRANSPORT(routing) both have no poiId — skip candidate-set
        // check for them so they don't fall into the "Unverified AI suggestion" path.
        const isRest = activity.category === "REST";
        // A routing-injected TRANSPORT is identified by its dayNumber:startTime key,
        // set in routingLegKeys by injectTransportLegs() in Layer 3.
        const isRoutingLeg =
          activity.category === "TRANSPORT" &&
          routingLegKeys.has(`${day.dayNumber}:${activity.startTime}`);

        const validPoiId = isRest || isRoutingLeg
          ? null
          : activity.poiId && candidateSet.has(activity.poiId)
            ? activity.poiId
            : null;

        // Source resolution (in priority order):
        // 1. routing  — TRANSPORT leg injected by OSRM routing layer
        // 2. auto_fill — activity inserted by gap-filler (not in model's original output)
        // 3. model     — everything else
        const isAutoFill =
          !isRoutingLeg &&
          !modelResult.days.some((d) =>
            d.activities.some(
              (a) => a.poiId === activity.poiId && a.startTime === activity.startTime,
            ),
          );

        const activitySource = isRoutingLeg
          ? "routing"
          : isAutoFill
            ? "auto_fill"
            : "model";

        return {
          tripDayId: tripDay.id,
          poiId: validPoiId,
          customTitle: isRest
            ? (activity.customTitle || "Rest break")
            : isRoutingLeg
              // customTitle set by routing.ts: "Drive to {nextPoiName}"
              ? (activity.customTitle || "Drive")
              : validPoiId
                ? null
                : activity.customTitle || "AI suggestion, unverified",
          category: activity.category as any,
          startTime: activity.startTime,
          endTime: activity.endTime,
          orderIndex: index,
          notes: validPoiId || isRest || isRoutingLeg
            ? activity.note
            : `${activity.note || ""} Unverified AI suggestion.`.trim(),
          source: activitySource as any,
        };
      });

      await tx.activity.createMany({ data: activityRows });
    }

    await tx.trip.update({ where: { id: trip.id }, data: { status: "CONFIRMED" } });
  }, { timeout: 30000, maxWait: 10000 });

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
      // routingStats included so the frontend can show a warning badge when
      // timeConflicts.length > 0 (drive takes longer than the available day allows).
      controller.enqueue(new TextEncoder().encode(sseMessage({ type: "complete", tripId: trip.id, trip: dto, progress: 100, routingStats })));
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