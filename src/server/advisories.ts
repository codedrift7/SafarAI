import type { Advisory, POI, Trip } from "@/lib/domain/types";
import { seasonsForRange } from "./season";

export function poiAdvisories(poi: POI, tripStartDate: string, tripEndDate: string, activityId?: string): Advisory[] {
  const advisories: Advisory[] = [];
  const tripSeasons = seasonsForRange(tripStartDate, tripEndDate);
  const seasonalMatch = tripSeasons.some((season) => poi.bestSeasons.includes(season));

  if (poi.requiresPermit) {
    advisories.push({
      id: `permit-${activityId ?? poi.id}`,
      type: "PERMIT",
      severity: "critical",
      title: "Permit required",
      message: poi.permitNotes ?? `${poi.name} requires permit or operator clearance.`,
      activityId,
      poiId: poi.id,
    });
  }

  if (!seasonalMatch) {
    advisories.push({
      id: `season-${activityId ?? poi.id}`,
      type: "SEASONAL",
      severity: "critical",
      title: "Seasonal mismatch",
      message: `${poi.name} is outside recommended season for these dates.`,
      activityId,
      poiId: poi.id,
    });
  }

  if (poi.roadCondition === "FOUR_WD_REQUIRED" || poi.roadCondition === "SEASONAL_CLOSURE") {
    advisories.push({
      id: `road-${activityId ?? poi.id}`,
      type: "ROAD",
      severity: "warning",
      title: "Road condition advisory",
      message: poi.roadCondition === "FOUR_WD_REQUIRED" ? "4x4 required for access." : "Road may close seasonally.",
      activityId,
      poiId: poi.id,
    });
  }

  if ((poi.altitudeMeters ?? 0) >= 3500) {
    advisories.push({
      id: `alt-${activityId ?? poi.id}`,
      type: "ALTITUDE",
      severity: "warning",
      title: "High altitude",
      message: `${poi.name} is high altitude. Build acclimatization time.`,
      activityId,
      poiId: poi.id,
    });
  }

  if (poi.safetyNotes) {
    advisories.push({
      id: `safety-${activityId ?? poi.id}`,
      type: "SAFETY",
      severity: "info",
      title: "Safety note",
      message: poi.safetyNotes,
      activityId,
      poiId: poi.id,
    });
  }

  return advisories;
}

export function tripAdvisories(trip: Trip): Advisory[] {
  return trip.days.flatMap((day) =>
    day.activities.flatMap((activity) => {
      if (!activity.poi) {
        return [
          {
            id: `unverified-${activity.id}`,
            type: "UNVERIFIED",
            severity: "info",
            title: "AI suggestion, unverified",
            message: "This stop was suggested without a verified POI.",
            activityId: activity.id,
          } satisfies Advisory,
        ];
      }
      return poiAdvisories(activity.poi, trip.startDate, trip.endDate, activity.id);
    }),
  );
}
