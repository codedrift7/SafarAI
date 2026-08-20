// Canonical implementation now lives in src/lib/domain/season.ts (shared with
// src/lib/api/advisories.ts, which can't import from src/server/* directly since it needs to
// stay safe to run in client components). Re-exported here so this file's existing consumers
// (src/server/advisories.ts, src/server/candidates.ts) don't need to change their import path.
export { seasonForDate, seasonsForRange } from "@/lib/domain/season";