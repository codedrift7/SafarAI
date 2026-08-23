/**
 * Post-generation gap detection and weather-aware auto-fill.
 *
 * Layer 2 of the gap handling pipeline. Called after generateItineraryWithRetry()
 * returns, this module detects temporal gaps between activities, queries weather,
 * finds nearby POIs, and inserts filler activities.
 *
 * Never throws — returns the original days on any internal failure.
 */

import type { POI } from "@/lib/domain/types";
import type { GeneratedItineraryArgs } from "./schemas";
import { haversineKm } from "@/lib/geo";
import { batchGetWeather, type WeatherCondition } from "./weather";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GapInfo {
  dayNumber: number;
  dayIndex: number;
  afterIndex: number; // index of the activity before the gap
  durationMinutes: number;
  gapStartTime: string; // HH:MM
  gapEndTime: string;   // HH:MM
  anchorLat: number;
  anchorLng: number;
  nextLat: number;
  nextLng: number;
}

type FillerResult =
  | { type: "poi"; poiId: string; name: string; category: string; description: string | null; avgVisitHours: number | null }
  | { type: "rest" }
  | { type: "none" };

export interface GapFillStats {
  totalGaps: number;
  filled: number;
  restFilled: number;
  unfilled: Array<{ dayNumber: number; gapStartTime: string; gapEndTime: string; durationMinutes: number }>;
}

export interface FillGapsResult {
  days: GeneratedItineraryArgs["days"];
  gapFillStats: GapFillStats;
}

// ---------------------------------------------------------------------------
// Time utilities
// ---------------------------------------------------------------------------

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

// ---------------------------------------------------------------------------
// Gap detection
// ---------------------------------------------------------------------------

const OUTDOOR_CATEGORIES = new Set(["SIGHTSEEING", "ADVENTURE", "MOUNTAIN", "LAKE", "VALLEY", "GLACIER", "NATIONAL_PARK", "WATERFALL", "VIEWPOINT"]);
const INDOOR_CATEGORIES = new Set(["MUSEUM", "FOOD", "SHOPPING", "RELIGIOUS", "FORT", "MOSQUE", "SHRINE", "BAZAAR", "RESTAURANT"]);

function getPaceThreshold(pace: string): number {
  switch (pace) {
    case "packed": return 60;
    case "relaxed": return 120;
    default: return 90; // balanced
  }
}

function detectGaps(
  days: GeneratedItineraryArgs["days"],
  candidatePois: POI[],
  thresholdMinutes: number,
): GapInfo[] {
  const poiMap = new Map(candidatePois.map((p) => [p.id, p]));
  const gaps: GapInfo[] = [];

  for (let dayIdx = 0; dayIdx < days.length; dayIdx++) {
    const day = days[dayIdx];
    const activities = day.activities;

    for (let i = 0; i < activities.length - 1; i++) {
      const current = activities[i];
      const next = activities[i + 1];

      if (!current.endTime || !next.startTime) continue;

      const endMin = timeToMinutes(current.endTime);
      const startMin = timeToMinutes(next.startTime);
      const delta = startMin - endMin;

      if (delta >= thresholdMinutes) {
        // Get coordinates from POIs
        const currentPoi = current.poiId ? poiMap.get(current.poiId) : null;
        const nextPoi = next.poiId ? poiMap.get(next.poiId) : null;

        // Default to region center if POI coordinates unavailable
        const anchorLat = currentPoi?.latitude ?? 35.9;
        const anchorLng = currentPoi?.longitude ?? 74.3;
        const nextLat = nextPoi?.latitude ?? anchorLat;
        const nextLng = nextPoi?.longitude ?? anchorLng;

        gaps.push({
          dayNumber: day.dayNumber,
          dayIndex: dayIdx,
          afterIndex: i,
          durationMinutes: delta,
          gapStartTime: current.endTime,
          gapEndTime: next.startTime,
          anchorLat,
          anchorLng,
          nextLat,
          nextLng,
        });
      }
    }
  }

  return gaps;
}

// ---------------------------------------------------------------------------
// Nearby filler search
// ---------------------------------------------------------------------------

function findNearbyFiller(
  candidatePois: POI[],
  gap: GapInfo,
  weather: WeatherCondition,
  usedPoiIds: Set<string>,
  pace: string,
): FillerResult {
  // Midpoint between previous and next activity (avoids backtracking)
  const midLat = (gap.anchorLat + gap.nextLat) / 2;
  const midLng = (gap.anchorLng + gap.nextLng) / 2;

  // Filter candidates by distance — try 2km first (walkable), then 5km
  let nearby = candidatePois.filter((poi) => {
    if (usedPoiIds.has(poi.id)) return false;
    const dist = haversineKm(midLat, midLng, poi.latitude, poi.longitude);
    return dist <= 2;
  });

  if (nearby.length === 0) {
    nearby = candidatePois.filter((poi) => {
      if (usedPoiIds.has(poi.id)) return false;
      const dist = haversineKm(midLat, midLng, poi.latitude, poi.longitude);
      return dist <= 5;
    });
  }

  if (nearby.length === 0) {
    // No POI within range — REST allowed only for relaxed pace
    if (pace === "relaxed") {
      return { type: "rest" };
    }
    return { type: "none" };
  }

  // Prefer indoor/outdoor based on weather
  const preferredCategories = weather.isOutdoorFriendly ? OUTDOOR_CATEGORIES : INDOOR_CATEGORIES;

  // Score each candidate: category match + visit duration fit
  const gapHours = gap.durationMinutes / 60;
  const scored = nearby.map((poi) => {
    const categoryMatch = preferredCategories.has(poi.category) ? 10 : 0;
    const durationFit = poi.avgVisitHours
      ? 5 - Math.abs(poi.avgVisitHours - gapHours) * 2
      : 0;
    return { poi, score: categoryMatch + durationFit };
  });

  scored.sort((a, b) => b.score - a.score);
  const best = scored[0].poi;

  return {
    type: "poi",
    poiId: best.id,
    name: best.name,
    category: best.category,
    description: best.description ?? null,
    avgVisitHours: best.avgVisitHours ?? null,
  };
}

// ---------------------------------------------------------------------------
// Main orchestrator
// ---------------------------------------------------------------------------

export async function fillGaps(
  generatedDays: GeneratedItineraryArgs["days"],
  candidatePois: POI[],
  tripDates: { startDate: Date; endDate: Date },
  pace: string,
): Promise<FillGapsResult> {
  const threshold = getPaceThreshold(pace);
  const gaps = detectGaps(generatedDays, candidatePois, threshold);

  const stats: GapFillStats = {
    totalGaps: gaps.length,
    filled: 0,
    restFilled: 0,
    unfilled: [],
  };

  if (gaps.length === 0) {
    return { days: generatedDays, gapFillStats: stats };
  }

  // For gaps > 3 hours, split into two sub-gaps at 1/3 and 2/3 marks
  const expandedGaps: Array<GapInfo & { isSubGap?: boolean }> = [];
  for (const gap of gaps) {
    if (gap.durationMinutes > 180) {
      const third = Math.floor(gap.durationMinutes / 3);
      const startMin = timeToMinutes(gap.gapStartTime);

      expandedGaps.push({
        ...gap,
        durationMinutes: third + 30, // overlap slightly for flexibility
        gapStartTime: gap.gapStartTime,
        gapEndTime: minutesToTime(startMin + third + 30),
        isSubGap: true,
      });
      expandedGaps.push({
        ...gap,
        afterIndex: gap.afterIndex + 1, // will be after the first filler
        durationMinutes: third + 30,
        gapStartTime: minutesToTime(startMin + 2 * third - 30),
        gapEndTime: gap.gapEndTime,
        isSubGap: true,
      });
    } else {
      expandedGaps.push(gap);
    }
  }

  // Batch-fetch weather for all gaps in parallel
  const weatherRequests = expandedGaps.map((gap) => {
    const midLat = (gap.anchorLat + gap.nextLat) / 2;
    const midLng = (gap.anchorLng + gap.nextLng) / 2;
    const gapMidHour = Math.floor(
      (timeToMinutes(gap.gapStartTime) + timeToMinutes(gap.gapEndTime)) / 2 / 60,
    );
    // Calculate the date for this day
    const dayDate = new Date(tripDates.startDate.getTime() + (gap.dayNumber - 1) * 86400000);
    const dateStr = dayDate.toISOString().slice(0, 10);

    return { latitude: midLat, longitude: midLng, date: dateStr, hour: gapMidHour };
  });

  const weatherResults = await batchGetWeather(weatherRequests);

  // Deep-copy days so we can insert without mutating the original
  const filledDays = generatedDays.map((d) => ({
    ...d,
    activities: [...d.activities],
  }));

  // Track used POIs (including model-generated ones) to avoid duplicates
  const usedPoiIds = new Set<string>();
  for (const day of generatedDays) {
    for (const act of day.activities) {
      if (act.poiId) usedPoiIds.add(act.poiId);
    }
  }

  // Process gaps in reverse order so insertions don't shift indices
  for (let i = expandedGaps.length - 1; i >= 0; i--) {
    const gap = expandedGaps[i];
    const weather = weatherResults[i];

    const filler = findNearbyFiller(candidatePois, gap, weather, usedPoiIds, pace);

    const targetDay = filledDays[gap.dayIndex];
    if (!targetDay) continue;

    const gapStartMin = timeToMinutes(gap.gapStartTime);
    const fillerDuration = Math.min(gap.durationMinutes, 90); // cap at 90min
    const fillerStartMin = gapStartMin + Math.floor((gap.durationMinutes - fillerDuration) / 2);
    const fillerEndMin = fillerStartMin + fillerDuration;

    if (filler.type === "poi") {
      const weatherTip = weather.isOutdoorFriendly
        ? "Weather looks clear for outdoor exploration."
        : "Conditions suggest indoor activities — rain or wind expected.";

      const noteText = [
        `Auto-suggested to fill a ${gap.durationMinutes}-minute gap.`,
        filler.description || filler.name,
        weatherTip,
      ].join(" ");

      targetDay.activities.splice(gap.afterIndex + 1, 0, {
        poiId: filler.poiId,
        customTitle: undefined,
        category: mapPoiCategoryToActivity(filler.category) as "SIGHTSEEING" | "FOOD" | "TRANSPORT" | "LODGING" | "REST" | "ADVENTURE" | "SHOPPING" | "RELIGIOUS",
        startTime: minutesToTime(fillerStartMin),
        endTime: minutesToTime(fillerEndMin),
        note: noteText,
      });

      usedPoiIds.add(filler.poiId);
      stats.filled++;
    } else if (filler.type === "rest") {
      targetDay.activities.splice(gap.afterIndex + 1, 0, {
        poiId: undefined,
        customTitle: "Rest break",
        category: "REST",
        startTime: minutesToTime(fillerStartMin),
        endTime: minutesToTime(fillerEndMin),
        note: `Rest break to cover a ${gap.durationMinutes}-minute gap between activities.`,
      });
      stats.restFilled++;
    } else {
      stats.unfilled.push({
        dayNumber: gap.dayNumber,
        gapStartTime: gap.gapStartTime,
        gapEndTime: gap.gapEndTime,
        durationMinutes: gap.durationMinutes,
      });
    }
  }

  return { days: filledDays, gapFillStats: stats };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Map POI category (e.g. MOUNTAIN, LAKE) to Activity category (e.g. ADVENTURE, SIGHTSEEING) */
function mapPoiCategoryToActivity(poiCategory: string): string {
  const map: Record<string, string> = {
    MOUNTAIN: "ADVENTURE",
    LAKE: "SIGHTSEEING",
    FORT: "SIGHTSEEING",
    MOSQUE: "RELIGIOUS",
    SHRINE: "RELIGIOUS",
    MUSEUM: "SIGHTSEEING",
    BAZAAR: "SHOPPING",
    WATERFALL: "ADVENTURE",
    NATIONAL_PARK: "ADVENTURE",
    HILL_STATION: "SIGHTSEEING",
    VALLEY: "SIGHTSEEING",
    GLACIER: "ADVENTURE",
    ARCHAEOLOGICAL_SITE: "SIGHTSEEING",
    CITY_LANDMARK: "SIGHTSEEING",
    RESTAURANT: "FOOD",
    VIEWPOINT: "SIGHTSEEING",
  };
  return map[poiCategory] ?? "SIGHTSEEING";
}
