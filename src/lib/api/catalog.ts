import type {
  PackingList,
  PackingListInput,
  POI,
  POIFilters,
  Region,
  TemplateFilters,
  Trip,
  TripTemplate,
  VisaGuide,
} from "@/lib/domain/types";
import { fetchJson } from "./utils";

export interface UseTemplateInput {
  startDate?: string;
  title?: string;
  ownerId?: string;
}

export async function listRegions(): Promise<Region[]> {
  return fetchJson<Region[]>("/api/v1/regions");
}

export async function getRegion(idOrSlug: string): Promise<Region | null> {
  try {
    return await fetchJson<Region>(`/api/v1/regions/${idOrSlug}`);
  } catch {
    return null;
  }
}

export const getRegionBySlug = getRegion;

export async function listPOIs(filters: POIFilters = {}): Promise<POI[]> {
  const params = new URLSearchParams();
  if (filters.region) params.set("region", filters.region);
  if (filters.regionId) params.set("regionId", filters.regionId);
  if (filters.category) params.set("category", filters.category);
  if (filters.season) params.set("season", filters.season);
  if (filters.query) params.set("query", filters.query);
  if (filters.requiresPermit !== undefined) params.set("requiresPermit", String(filters.requiresPermit));
  return fetchJson<POI[]>(`/api/v1/pois?${params.toString()}`);
}

export async function getPOI(idOrSlug: string): Promise<POI | null> {
  const pois = await listPOIs({});
  return pois.find((poi) => poi.id === idOrSlug || poi.slug === idOrSlug) ?? null;
}

export const getPoi = getPOI;
export const getPOIBySlug = getPOI;

export async function getNearbyPOIs(poiId: string, limit = 4): Promise<POI[]> {
  const poi = await getPOI(poiId);
  if (!poi) return [];
  const sameRegion = await listPOIs({ regionId: poi.regionId });
  return sameRegion
    .filter((candidate) => candidate.id !== poi.id)
    .sort((left, right) => {
      const leftDistance = Math.hypot(left.latitude - poi.latitude, left.longitude - poi.longitude);
      const rightDistance = Math.hypot(right.latitude - poi.latitude, right.longitude - poi.longitude);
      return leftDistance - rightDistance;
    })
    .slice(0, limit);
}

export async function listTemplates(filters: TemplateFilters = {}): Promise<TripTemplate[]> {
  const params = new URLSearchParams();
  if (filters.region) params.set("region", filters.region);
  if (filters.regionId) params.set("regionId", filters.regionId);
  if (filters.tag) params.set("tag", filters.tag);
  return fetchJson<TripTemplate[]>(`/api/v1/templates?${params.toString()}`);
}

export async function getTemplate(id: string): Promise<TripTemplate | null> {
  const templates = await listTemplates();
  return templates.find((template) => template.id === id) ?? null;
}

export const getTemplateById = getTemplate;

export async function applyTemplate(templateId: string, input: UseTemplateInput = {}): Promise<Trip> {
  return fetchJson<Trip>(`/api/v1/templates/${templateId}/use`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function getVisaInfo(nationalityCode: string): Promise<VisaGuide> {
  const params = new URLSearchParams({ nationality: nationalityCode.trim().toUpperCase() });
  return fetchJson<VisaGuide>(`/api/v1/tools/visa-checker?${params.toString()}`);
}

export async function createPackingList(input: PackingListInput = {}): Promise<PackingList> {
  const region = input.regionSlug || "your destination";
  return {
    essentials: [
      "Reusable water bottle",
      "Offline map downloads",
      "Power bank",
      "Small amount of PKR cash",
    ],
    clothing: [
      "Layered clothing matched to season",
      "Comfortable walking shoes",
      `Region-aware layer for ${region}`,
    ],
    healthAndSafety: [
      "Personal medications",
      "Basic first-aid kit",
      "Travel insurance details",
    ],
    documents: [
      "Passport and visa documents",
      "Trip confirmations",
      "Permit documents where needed",
    ],
    notes: [
      "This checklist is advisory. Reconfirm visas and permits from official sources.",
    ],
  };
}
