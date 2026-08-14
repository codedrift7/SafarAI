import type { Activity, Advisory, POI, Season, Trip } from "@/lib/domain/types";

export function seasonForDate(value: string): Season {
  const month = new Date(value).getUTCMonth() + 1;
  if (month === 12 || month <= 2) return "WINTER";
  if (month <= 5) return "SPRING";
  if (month <= 8) return "SUMMER";
  return "AUTUMN";
}

export function seasonsForDateRange(startDate: string, endDate: string): Season[] {
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    return [seasonForDate(startDate)];
  }

  const found = new Set<Season>();
  const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
  const lastMonth = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1));
  while (cursor <= lastMonth) {
    found.add(seasonForDate(cursor.toISOString()));
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return [...found];
}

export function isPoiSeasonallySuitable(poi: POI, startDate: string, endDate: string): boolean {
  const tripSeasons = seasonsForDateRange(startDate, endDate);
  return tripSeasons.some((season) => poi.bestSeasons.includes(season));
}

export function getPoiAdvisories(
  poi: POI,
  startDate: string,
  endDate: string,
  activityId?: string,
): Advisory[] {
  const advisories: Advisory[] = [];
  const base = { activityId, poiId: poi.id };

  if (poi.requiresPermit) {
    advisories.push({
      id: `permit-${activityId ?? poi.id}`,
      type: "PERMIT",
      severity: "critical",
      title: "Permit or operator clearance required",
      message:
        poi.permitNotes ??
        `${poi.name} requires advance clearance. Confirm requirements with the listed authority before adding it to a confirmed route.`,
      ...base,
      ...(poi.permitOfficialLink ? { officialLink: poi.permitOfficialLink } : {}),
      ...(poi.permitLastVerifiedAt ? { lastVerifiedAt: poi.permitLastVerifiedAt } : {}),
    });
  }

  if (!isPoiSeasonallySuitable(poi, startDate, endDate)) {
    const seasonalWindow = poi.bestSeasons.map((season) => season.toLowerCase()).join(", ");
    advisories.push({
      id: `seasonal-${activityId ?? poi.id}`,
      type: "SEASONAL",
      severity: "critical",
      title: "Outside the recommended season",
      message: `${poi.name} is best visited in ${seasonalWindow}. Road access, weather or services may not be suitable for these dates. Confirm locally before travel.`,
      ...base,
      ...(poi.verifiedAt ? { lastVerifiedAt: poi.verifiedAt } : {}),
    });
  }

  if (poi.roadCondition === "FOUR_WD_REQUIRED") {
    advisories.push({
      id: `road-4wd-${activityId ?? poi.id}`,
      type: "ROAD",
      severity: "warning",
      title: "4x4 vehicle required",
      message: `${poi.name} involves a 4x4-only approach. Arrange an experienced local driver and re-check weather-related road conditions.`,
      ...base,
    });
  }

  if (poi.roadCondition === "SEASONAL_CLOSURE") {
    advisories.push({
      id: `road-seasonal-${activityId ?? poi.id}`,
      type: "ROAD",
      severity: "warning",
      title: "Seasonal road closure risk",
      message: `${poi.name} depends on a road that can close with snow or weather. Check current local conditions before leaving.`,
      ...base,
      ...(poi.verifiedAt ? { lastVerifiedAt: poi.verifiedAt } : {}),
    });
  }

  if ((poi.altitudeMeters ?? 0) >= 3500) {
    advisories.push({
      id: `altitude-${activityId ?? poi.id}`,
      type: "ALTITUDE",
      severity: "warning",
      title: "High-altitude stop",
      message: `${poi.name} is at approximately ${poi.altitudeMeters?.toLocaleString()} m. Acclimatise, hydrate and turn back if altitude symptoms develop.`,
      ...base,
    });
  }

  if (poi.safetyNotes) {
    advisories.push({
      id: `safety-${activityId ?? poi.id}`,
      type: "SAFETY",
      severity: "info",
      title: "Local planning note",
      message: poi.safetyNotes,
      ...base,
      ...(poi.verifiedAt ? { lastVerifiedAt: poi.verifiedAt } : {}),
    });
  }

  return advisories;
}

export function getActivityAdvisories(
  activity: Activity,
  startDate: string,
  endDate: string,
): Advisory[] {
  if (!activity.poi) {
    return [
      {
        id: `unverified-${activity.id}`,
        type: "UNVERIFIED",
        severity: "info",
        title: "AI suggestion, unverified",
        message:
          "This is a custom itinerary suggestion, not a place from SafarAI's verified POI catalogue. Confirm details locally before relying on it.",
        activityId: activity.id,
      },
    ];
  }
  return getPoiAdvisories(activity.poi, startDate, endDate, activity.id);
}

export function getTripAdvisories(trip: Trip): Advisory[] {
  return trip.days.flatMap((day) =>
    day.activities.flatMap((activity) =>
      getActivityAdvisories(activity, trip.startDate, trip.endDate),
    ),
  );
}
