import { listPOIs } from "./catalog";
import type { Advisory } from "@/lib/domain/types";
import { getPoiAdvisories } from "@/lib/domain/advisories";

// Canonical implementation now lives in src/lib/domain/advisories.ts — this file previously
// had its own independent (and drifted) copy of everything below. Re-exported under the
// original names so nothing importing from this file, barrel or otherwise, needs to change.
export {
  seasonForDate,
  seasonsForRange as seasonsForDateRange,
  isPoiSeasonallySuitable,
  getPoiAdvisories,
  getActivityAdvisories,
  getTripAdvisories,
} from "@/lib/domain/advisories";

/**
 * The POI detail page (src/app/pois/[slug]/page.tsx) calls
 * `getPOIAdvisories(poi.id)` — an id-based, Promise-returning helper that
 * isn't scoped to any one trip's dates. This never existed; only the
 * trip-dates-aware `getPoiAdvisories(poi, startDate, endDate)` did.
 *
 * Reuses that same logic across a full-year reference window so every
 * season is "in range" and the seasonal-mismatch advisory — which only
 * means something against real trip dates — never fires here. Permit,
 * road-condition, altitude and safety-note advisories still do, which is
 * exactly what a standalone place page should show.
 *
 * Stays here rather than moving to the shared domain module because it depends on
 * listPOIs (a fetch call), which the domain layer deliberately has no knowledge of.
 */
export async function getPOIAdvisories(poiId: string): Promise<Advisory[]> {
  const pois = await listPOIs({});
  const poi = pois.find((item) => item.id === poiId);
  if (!poi) return [];
  return getPoiAdvisories(poi, "2026-01-01T00:00:00.000Z", "2026-12-31T00:00:00.000Z");
}