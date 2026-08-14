import type {
  PackingList,
  PackingListInput,
  POI,
  POIFilters,
  Season,
  TemplateFilters,
  Trip,
  TripTemplate,
  VisaGuide,
} from "@/lib/domain/types";
import { seasonForDate } from "./advisories";
import { createTrip } from "./trips";
import {
  getRawPoi,
  getRawRegion,
  getRawTemplate,
  getStore,
  hydratePoi,
  hydrateRegion,
  hydrateTemplate,
  hydrateTrip,
  nextMockId,
} from "./store";
import { addDays, asDateOnlyIso, delay } from "./utils";

export interface UseTemplateInput {
  startDate?: string;
  title?: string;
  ownerId?: string;
}

export async function listRegions(): Promise<ReturnType<typeof hydrateRegion>[]> {
  await delay();
  return getStore().regions.map(hydrateRegion);
}

export async function getRegion(idOrSlug: string) {
  await delay();
  const region = getRawRegion(idOrSlug);
  return region ? hydrateRegion(region) : null;
}

export const getRegionBySlug = getRegion;

export async function listPOIs(filters: POIFilters = {}): Promise<POI[]> {
  await delay();
  const region = filters.region ?? filters.regionId;
  const normalizedQuery = filters.query?.trim().toLowerCase();
  return getStore()
    .pois.filter((poi) => {
      if (region) {
        const matchingRegion = getRawRegion(region);
        if (poi.regionId !== (matchingRegion?.id ?? region)) return false;
      }
      if (filters.category && poi.category !== filters.category) return false;
      if (filters.season && !poi.bestSeasons.includes(filters.season)) return false;
      if (filters.requiresPermit !== undefined && poi.requiresPermit !== filters.requiresPermit) {
        return false;
      }
      if (
        normalizedQuery &&
        !poi.name.toLowerCase().includes(normalizedQuery) &&
        !poi.description?.toLowerCase().includes(normalizedQuery)
      ) {
        return false;
      }
      return true;
    })
    .map(hydratePoi);
}

export async function getPOI(idOrSlug: string): Promise<POI | null> {
  await delay();
  const poi = getRawPoi(idOrSlug);
  return poi ? hydratePoi(poi) : null;
}

export const getPoi = getPOI;
export const getPOIBySlug = getPOI;

export async function getNearbyPOIs(poiId: string, limit = 4): Promise<POI[]> {
  await delay();
  const poi = getRawPoi(poiId);
  if (!poi) return [];
  return getStore()
    .pois.filter((candidate) => candidate.regionId === poi.regionId && candidate.id !== poi.id)
    .sort((left, right) => {
      const leftDistance = Math.hypot(left.latitude - poi.latitude, left.longitude - poi.longitude);
      const rightDistance = Math.hypot(right.latitude - poi.latitude, right.longitude - poi.longitude);
      return leftDistance - rightDistance;
    })
    .slice(0, limit)
    .map(hydratePoi);
}

export async function listTemplates(filters: TemplateFilters = {}): Promise<TripTemplate[]> {
  await delay();
  const region = filters.region ?? filters.regionId;
  const normalizedTag = filters.tag?.trim().toLowerCase();
  return getStore()
    .templates.filter((template) => {
      if (region) {
        const matchingRegion = getRawRegion(region);
        if (template.regionId !== (matchingRegion?.id ?? region)) return false;
      }
      if (
        normalizedTag &&
        !template.tags.some((tag) => tag.toLowerCase().includes(normalizedTag))
      ) {
        return false;
      }
      if (filters.durationDays && template.durationDays !== filters.durationDays) return false;
      if (filters.priceTier && template.priceTier !== filters.priceTier) return false;
      return true;
    })
    .sort((left, right) => right.usageCount - left.usageCount)
    .map(hydrateTemplate);
}

export async function getTemplate(id: string): Promise<TripTemplate | null> {
  await delay();
  const template = getRawTemplate(id);
  return template ? hydrateTemplate(template) : null;
}

export const getTemplateById = getTemplate;

export async function useTemplate(templateId: string, input: UseTemplateInput = {}): Promise<Trip> {
  await delay(140);
  const template = getRawTemplate(templateId);
  if (!template) throw new Error(`Template '${templateId}' was not found.`);
  const region = getRawRegion(template.regionId);
  if (!region) throw new Error(`Template '${templateId}' points at a missing region.`);
  const startDate = asDateOnlyIso(input.startDate ?? "2026-08-12T00:00:00.000Z");
  const endDate = addDays(startDate, template.durationDays - 1);
  const trip = await createTrip({
    title: input.title ?? template.title,
    regionSlug: region.slug,
    destination: region.name,
    startDate,
    endDate,
    travelerType: "FRIENDS",
    budgetTier: template.priceTier ?? "MID_RANGE",
    pace: "balanced",
    partySize: 4,
    vibe: template.tags.join(", "),
    coverImageUrl: template.coverImageUrl,
  });

  const rawTrip = getStore().trips.find((candidate) => candidate.id === trip.id)!;
  rawTrip.status = "PLANNING";
  rawTrip.days = template.itineraryJson.days.map((templateDay) => {
    const dayId = nextMockId("day");
    return {
      id: dayId,
      tripId: rawTrip.id,
      dayNumber: templateDay.dayNumber,
      date: addDays(startDate, templateDay.dayNumber - 1),
      regionId: templateDay.regionId ?? template.regionId,
      notes: templateDay.notes ?? null,
      activities: templateDay.activities.map((templateActivity, orderIndex) => ({
        id: nextMockId("activity"),
        tripDayId: dayId,
        poiId: templateActivity.poiId ?? null,
        customTitle: templateActivity.customTitle ?? null,
        category: templateActivity.category,
        startTime: templateActivity.startTime ?? null,
        endTime: templateActivity.endTime ?? null,
        orderIndex,
        notes: templateActivity.notes ?? null,
        estimatedCost: templateActivity.estimatedCost ?? null,
        costCurrency: templateActivity.costCurrency ?? "PKR",
        addedByUserId: "user-sana-khan",
      })),
    };
  });
  rawTrip.updatedAt = new Date().toISOString();
  template.usageCount += 1;
  return hydrateTrip(rawTrip);
}

export async function getVisaInfo(nationalityCode: string): Promise<VisaGuide> {
  await delay();
  const nationalityCodeNormalized = nationalityCode.trim().toUpperCase();
  const guide = getStore().visas.find(
    (candidate) => candidate.nationalityCode === nationalityCodeNormalized,
  );
  if (guide) return { ...guide };
  return {
    id: `visa-generic-${nationalityCodeNormalized || "unknown"}`,
    nationalityCode: nationalityCodeNormalized || "UNKNOWN",
    evisaAvailable: true,
    visaFreeStay: false,
    feeUsdMin: 5,
    feeUsdMax: 50,
    processingDaysMin: 7,
    processingDaysMax: 20,
    notes:
      "This is a broad planning estimate, not a determination of eligibility. Apply through the Pakistan Online Visa System and confirm current requirements before booking travel.",
    officialLink: "https://visa.nadra.gov.pk/",
    lastVerifiedAt: "2026-07-15T00:00:00.000Z",
  };
}

function seasonForPacking(input: PackingListInput): Season {
  return seasonForDate(input.startDate ?? "2026-07-01T00:00:00.000Z");
}

export async function createPackingList(input: PackingListInput = {}): Promise<PackingList> {
  await delay(140);
  const region = input.regionSlug ? getRawRegion(input.regionSlug) : undefined;
  const season = seasonForPacking(input);
  const northernTrip = region?.slug === "hunza" || region?.slug === "skardu";
  const coldSeason = season === "WINTER" || (northernTrip && season !== "SUMMER");
  return {
    essentials: [
      "Reusable water bottle",
      "Offline maps and a power bank",
      "Small amount of PKR cash for remote stops",
      "Sun protection and lip balm",
    ],
    clothing: [
      coldSeason ? "Insulating mid-layer and warm outer shell" : "Light, breathable layers",
      "Comfortable walking shoes with grip",
      ...(northernTrip ? ["Warm hat and rain/wind layer for mountain evenings"] : []),
      ...(region?.slug === "lahore" ? ["Modest layer for mosques and shrines"] : []),
    ],
    healthAndSafety: [
      "Personal medications and a compact first-aid kit",
      ...(northernTrip ? ["Oral rehydration salts and altitude-awareness plan"] : []),
      "Travel insurance details and emergency contacts",
    ],
    documents: [
      "Passport and valid Pakistan visa / entry proof where applicable",
      "Digital and paper accommodation confirmations",
      ...(northernTrip ? ["Permit/operator paperwork for any restricted trek"] : []),
    ],
    notes: [
      "Visa and permit rules can change; confirm every requirement with the official source before travel.",
      northernTrip
        ? "Mountain roads and domestic flights can be weather-sensitive—keep a time buffer."
        : "Schedule outdoor sightseeing in cooler hours during warm weather.",
    ],
  };
}
