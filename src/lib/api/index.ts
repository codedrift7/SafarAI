/**
 * Public data-layer barrel.
 *
 * Every page and component in this app imports from "@/lib/api" — never
 * from src/lib/mock-data directly, and never from the individual files
 * under src/lib/api/* by path (see prompt.md, "Data layer"). This is the
 * seam Session 2 swaps for real `fetch` calls without touching a page.
 *
 * This file was the missing piece: catalog.ts, trips.ts, generation.ts,
 * advisories.ts and store.ts all existed and were internally correct, but
 * nothing re-exported them under the single "@/lib/api" surface every page
 * was already written against.
 */

export {
  listRegions,
  getRegion,
  getRegionBySlug,
  listPOIs,
  getPOI,
  getPoi,
  getPOIBySlug,
  getNearbyPOIs,
  listTemplates,
  getTemplate,
  getTemplateById,
  applyTemplate,
  getVisaInfo,
  createPackingList,
} from "./catalog";
export type { UseTemplateInput } from "./catalog";

export {
  listTrips,
  getTrip,
  createTrip,
  updateTrip,
  deleteTrip,
  getSharedTrip,
  setTripPublic,
  getTripAdvisoriesForTrip,
  // Pages call this as `getTripAdvisories(tripId)` and expect a Promise —
  // that's this async, id-based helper, not advisories.ts's synchronous
  // getTripAdvisories(trip) (which trips.ts already consumes internally
  // under the name `deriveTripAdvisories` to avoid this exact collision).
  getTripAdvisoriesForTrip as getTripAdvisories,
  addActivity,
  updateActivity,
  deleteActivity,
  reorderActivities,
  createInvite,
  voteActivity,
  exportTrip,
} from "./trips";

export { generateItinerary, sendChatMessage, getChatHistory } from "./generation";

export {
  seasonForDate,
  seasonsForDateRange,
  isPoiSeasonallySuitable,
  getPoiAdvisories,
  getActivityAdvisories,
  // New: a POI detail page isn't scoped to a trip's dates, so it needs an
  // id-based, Promise-returning helper distinct from getPoiAdvisories.
  getPOIAdvisories,
} from "./advisories";

export { resetMockStore } from "./store";
