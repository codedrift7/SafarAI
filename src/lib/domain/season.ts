import type { Season } from "@/lib/domain/types";

/**
 * Canonical season logic. Previously duplicated between src/server/season.ts (imported by
 * src/server/advisories.ts and src/server/candidates.ts) and an independent reimplementation
 * inside src/lib/api/advisories.ts — the two had drifted, and this version's defensive guard
 * in seasonsForRange did not exist in the original src/server/season.ts (see that guard's
 * comment below for why it matters). Both original files now re-export from here instead of
 * maintaining their own copies.
 */

export function seasonForDate(value: Date | string): Season {
  const date = typeof value === "string" ? new Date(value) : value;
  const month = date.getUTCMonth() + 1;
  if (month === 12 || month <= 2) return "WINTER";
  if (month <= 5) return "SPRING";
  if (month <= 8) return "SUMMER";
  return "AUTUMN";
}

export function seasonsForRange(startDate: Date | string, endDate: Date | string): Season[] {
  const start = typeof startDate === "string" ? new Date(startDate) : startDate;
  const end = typeof endDate === "string" ? new Date(endDate) : endDate;

  // Defensive fallback for invalid or reversed ranges. Without this, the loop below never
  // runs (cursor starts past endMonth) and silently returns [] — which then makes every POI
  // look seasonally mismatched regardless of its actual bestSeasons, since
  // tripSeasons.some(...) on an empty array is always false. The original src/server/season.ts
  // didn't have this guard; src/lib/api/advisories.ts's independent reimplementation did.
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    return [seasonForDate(start)];
  }

  const found = new Set<Season>();
  const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
  const endMonth = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1));
  while (cursor <= endMonth) {
    found.add(seasonForDate(cursor));
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return [...found];
}