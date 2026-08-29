/**
 * Layer 3: OSRM-powered TRANSPORT leg injection.
 *
 * Called after generateItineraryWithRetry() (Layer 1) and fillGaps() (Layer 2).
 * Inserts real TRANSPORT activities between consecutive POI stops using actual
 * OSRM drive durations, and shifts subsequent activities when the drive overruns
 * the scheduled gap — capped at 21:00 to avoid silently producing unusable
 * late-night schedules.
 *
 * Key design decisions:
 * - Uses OSRM Route API (/route/v1/driving) for pairwise lookups.
 *   overview=false + steps=false: duration + distance only, no road names.
 * - Concurrent OSRM fetches within each day; days processed sequentially so
 *   time-shift cascades from one day do not bleed into the next.
 * - When drive > gap AND cascade would exceed 21:00: times are left overlapping
 *   and the conflict is recorded in routingStats.timeConflicts. This is the
 *   honest failure mode — the user sees the real problem (a POI combination that
 *   does not fit in a day) rather than a schedule that silently runs to 1 AM.
 * - In-memory cache deduplicates identical legs within a single generation.
 *   Process-scoped: no cross-request benefit on serverless cold starts.
 * - Never throws — returns original days + zeroed stats on any internal failure.
 *
 * OSRM_BASE_URL defaults to router.project-osrm.org (public demo server).
 * This is for development/testing only. Self-host before real user traffic.
 * Pre-launch checklist item: deploy osrm-backend with pakistan-latest.osm.pbf.
 * See: https://github.com/Project-OSRM/osrm-backend#quick-start
 */

import type { GeneratedItineraryArgs } from "./schemas";
import { env } from "@/server/env";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/** Minimal POI fields needed by routing — decoupled from the full domain POI type. */
export type RoutingPoi = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
};

export interface RoutingStats {
  legsInserted: number;
  daysRescheduled: number;
  timeConflicts: Array<{
    dayNumber: number;
    from: string;
    to: string;
    driveMinutes: number;
  }>;
  /** Pairs where OSRM returned null (network error, timeout, malformed response). */
  skipped: number;
}

export interface InjectTransportResult {
  days: GeneratedItineraryArgs["days"];
  routingStats: RoutingStats;
  /**
   * Keys formatted as `"${dayNumber}:${startTime}"` for each injected TRANSPORT activity.
   * Used by generate/route.ts to assign source: "routing" in Activity.create without
   * needing to attach a non-schema field to the activity objects.
   */
  routingLegKeys: Set<string>;
}

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

type ActivityShape = GeneratedItineraryArgs["days"][0]["activities"][0];

interface OsrmResult {
  durationSeconds: number;
  distanceMeters: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Minimum drive duration to insert a TRANSPORT activity. Drives shorter than
 *  this are walkable-ish and not worth cluttering the schedule. */
const MIN_DRIVE_SECONDS = 15 * 60; // 15 minutes

/** Hard ceiling for time-shift cascade. If shifting subsequent activities
 *  forward would push the last activity past 21:00, leave times overlapping
 *  and flag the conflict rather than producing a midnight itinerary. */
const DAY_END_CEILING_MIN = 21 * 60; // 21:00

// ---------------------------------------------------------------------------
// Time helpers
// ---------------------------------------------------------------------------

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function minutesToTime(minutes: number): string {
  const clamped = Math.max(0, Math.min(minutes, 23 * 60 + 59));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function formatDuration(seconds: number): string {
  const totalMin = Math.round(seconds / 60);
  if (totalMin < 60) return `~${totalMin}min`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return m > 0 ? `~${h}h ${m}min` : `~${h}h`;
}

function formatDistance(meters: number): string {
  return `${Math.round(meters / 1000)} km`;
}

// ---------------------------------------------------------------------------
// OSRM client
// ---------------------------------------------------------------------------

const osrmCache = new Map<string, OsrmResult | null>();

function osrmCacheKey(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
): string {
  return `${fromLat.toFixed(3)},${fromLng.toFixed(3)}->${toLat.toFixed(3)},${toLng.toFixed(3)}`;
}

/**
 * Fetch point-to-point drive duration + distance from OSRM Route API.
 * Returns null on network error, timeout, non-200, or malformed JSON. Never throws.
 */
async function fetchOsrmRoute(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
): Promise<OsrmResult | null> {
  const key = osrmCacheKey(fromLat, fromLng, toLat, toLng);
  if (osrmCache.has(key)) return osrmCache.get(key)!;

  try {
    // Longitude before latitude: OSRM uses GeoJSON coordinate order.
    // overview=false, steps=false: no geometry, no road names, just summary.
    const url =
      `${env.OSRM_BASE_URL}/route/v1/driving/` +
      `${fromLng.toFixed(6)},${fromLat.toFixed(6)};${toLng.toFixed(6)},${toLat.toFixed(6)}` +
      `?overview=false&steps=false`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), env.OSRM_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(url, { signal: controller.signal });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      osrmCache.set(key, null);
      return null;
    }

    const data = (await response.json()) as {
      routes?: Array<{ duration: number; distance: number }>;
    };
    const route = data?.routes?.[0];

    if (typeof route?.duration !== "number" || typeof route?.distance !== "number") {
      osrmCache.set(key, null);
      return null;
    }

    const result: OsrmResult = {
      durationSeconds: route.duration,
      distanceMeters: route.distance,
    };
    osrmCache.set(key, result);
    return result;
  } catch {
    // Covers AbortError (timeout), network errors, JSON parse errors.
    osrmCache.set(key, null);
    return null;
  }
}

/**
 * Exported primarily for unit testing.
 * Returns drive duration in seconds, or null on any error.
 */
export async function getOsrmDuration(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
): Promise<number | null> {
  const result = await fetchOsrmRoute(fromLat, fromLng, toLat, toLng);
  return result?.durationSeconds ?? null;
}

// ---------------------------------------------------------------------------
// Per-day routing processor
// ---------------------------------------------------------------------------

type DayInput = GeneratedItineraryArgs["days"][0];

/**
 * Process one day:
 * 1. Identify consecutive pairs where both activities have a POI with coordinates.
 * 2. Fetch OSRM for all pairs concurrently (within this day).
 * 3. Walk pairs in order, inserting TRANSPORT activities and cascading time shifts.
 */
async function processDayRouting(
  day: DayInput,
  poiMap: Map<string, RoutingPoi>,
  stats: RoutingStats,
  routingLegKeys: Set<string>,
): Promise<DayInput> {
  const { activities } = day;
  if (activities.length < 2) return day;

  type Pair = {
    aIdx: number;
    aPoiName: string;
    bPoiName: string;
    fromLat: number;
    fromLng: number;
    toLat: number;
    toLng: number;
  };

  const pairs: Pair[] = [];
  for (let i = 0; i < activities.length - 1; i++) {
    const a = activities[i];
    const b = activities[i + 1];
    if (!a.poiId || !b.poiId) continue;
    const aPoi = poiMap.get(a.poiId);
    const bPoi = poiMap.get(b.poiId);
    if (!aPoi || !bPoi) continue;
    pairs.push({
      aIdx: i,
      aPoiName: aPoi.name,
      bPoiName: bPoi.name,
      fromLat: aPoi.latitude,
      fromLng: aPoi.longitude,
      toLat: bPoi.latitude,
      toLng: bPoi.longitude,
    });
  }

  if (pairs.length === 0) return day;

  // Concurrent OSRM fetches for this day's pairs.
  const osrmResults = await Promise.all(
    pairs.map((p) => fetchOsrmRoute(p.fromLat, p.fromLng, p.toLat, p.toLng)),
  );

  const pairByAIdx = new Map<number, { pair: Pair; osrm: OsrmResult | null }>();
  for (let i = 0; i < pairs.length; i++) {
    pairByAIdx.set(pairs[i].aIdx, { pair: pairs[i], osrm: osrmResults[i] ?? null });
  }

  const newActivities: ActivityShape[] = [];
  let cumulativeShiftMin = 0;
  let dayRescheduled = false;

  for (let i = 0; i < activities.length; i++) {
    // Apply accumulated shift to this activity.
    const orig = activities[i];
    const shifted: ActivityShape =
      cumulativeShiftMin === 0
        ? orig
        : {
            ...orig,
            startTime: minutesToTime(timeToMinutes(orig.startTime) + cumulativeShiftMin),
            endTime: minutesToTime(timeToMinutes(orig.endTime) + cumulativeShiftMin),
          };
    newActivities.push(shifted);

    const entry = pairByAIdx.get(i);
    if (!entry) continue;

    const { pair, osrm } = entry;

    if (!osrm) {
      stats.skipped++;
      continue;
    }

    if (osrm.durationSeconds < MIN_DRIVE_SECONDS) {
      // Sub-15-min drive: not worth a TRANSPORT entry.
      continue;
    }

    const driveMin = Math.ceil(osrm.durationSeconds / 60);
    const aEndMin = timeToMinutes(shifted.endTime);

    // B's start from original array, adjusted for cumulative shift.
    const bOrigStartMin = timeToMinutes(activities[i + 1].startTime) + cumulativeShiftMin;
    const existingGapMin = bOrigStartMin - aEndMin;
    const overshootMin = Math.max(0, driveMin - existingGapMin);

    const transportStartMin = aEndMin;
    const transportStartStr = minutesToTime(transportStartMin);

    const transportActivity: ActivityShape = {
      poiId: null,
      customTitle: `Drive to ${pair.bPoiName}`,
      category: "TRANSPORT",
      startTime: transportStartStr,
      endTime: minutesToTime(transportStartMin + driveMin),
      note: `${formatDuration(osrm.durationSeconds)} drive (${formatDistance(osrm.distanceMeters)})`,
    };

    newActivities.push(transportActivity);
    // Key used by generate/route.ts to identify this as a routing-injected TRANSPORT.
    routingLegKeys.add(`${day.dayNumber}:${transportStartStr}`);
    stats.legsInserted++;

    if (overshootMin > 0) {
      const lastOrigEndMin =
        timeToMinutes(activities[activities.length - 1].endTime) +
        cumulativeShiftMin +
        overshootMin;

      if (lastOrigEndMin <= DAY_END_CEILING_MIN) {
        cumulativeShiftMin += overshootMin;
        dayRescheduled = true;
      } else {
        // Ceiling exceeded. Leave overlapping times, flag conflict.
        // The user sees the real problem; the frontend surfaces a warning badge.
        stats.timeConflicts.push({
          dayNumber: day.dayNumber,
          from: pair.aPoiName,
          to: pair.bPoiName,
          driveMinutes: driveMin,
        });
      }
    }
  }

  if (dayRescheduled) stats.daysRescheduled++;

  return { ...day, activities: newActivities };
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

/**
 * Layer 3 entry point. Injects TRANSPORT activities into all days using real
 * OSRM drive durations. Days processed sequentially; OSRM calls within each
 * day are concurrent.
 *
 * Never throws. Matches the degradation contract of fillGaps() (Layer 2).
 */
export async function injectTransportLegs(
  days: GeneratedItineraryArgs["days"],
  candidatePois: RoutingPoi[],
): Promise<InjectTransportResult> {
  const stats: RoutingStats = {
    legsInserted: 0,
    daysRescheduled: 0,
    timeConflicts: [],
    skipped: 0,
  };
  const routingLegKeys = new Set<string>();

  try {
    const poiMap = new Map(candidatePois.map((p) => [p.id, p]));

    const processedDays: GeneratedItineraryArgs["days"] = [];
    for (const day of days) {
      processedDays.push(await processDayRouting(day, poiMap, stats, routingLegKeys));
    }

    return { days: processedDays, routingStats: stats, routingLegKeys };
  } catch (err) {
    console.error("[routing] unexpected error in injectTransportLegs, returning original days", err);
    return { days, routingStats: stats, routingLegKeys };
  }
}
