// Canonical implementation now lives in src/lib/domain/advisories.ts (shared with
// src/lib/api/advisories.ts, which had drifted from this file — see that module's comment for
// the specifics). Re-exported here under this file's original names (poiAdvisories/
// tripAdvisories) so /generate's route doesn't need to change its call sites.
export {
  getPoiAdvisories as poiAdvisories,
  getTripAdvisories as tripAdvisories,
} from "@/lib/domain/advisories";