import { Prisma, type POICategory } from "@prisma/client";
import { prisma } from "./db";
import { seasonsForRange } from "./season";

const EXCLUDED_PROVINCES = ["Balochistan", "Former FATA", "FATA", "Ex-FATA"];

// Candidates handed to the model for a single request. For single-region requests this is
// a straight SQL LIMIT, same as before. For multi-region/no-region requests it's a
// post-sampling cap — see the region-spread comment below.
const CANDIDATE_TARGET = 80;
// Safety ceiling on the raw fetch when no regionId narrows the query, so a larger future
// catalog (design.md targets 150-300 POIs; the seed data has 78 today) can't be pulled into
// memory wholesale before sampling.
const CANDIDATE_FETCH_CEILING = 600;
// Soft per-region share of CANDIDATE_TARGET when spreading across every region.
const MAX_PER_REGION = 20;

export type CandidatePoi = Prisma.POIGetPayload<{ include: { region: true } }>;

export async function getCandidatePois(params: {
  regionId?: string;
  startDate: Date;
  endDate: Date;
  categoryMix?: string[];
  excludePermitRequired?: boolean;
}): Promise<CandidatePoi[]> {
  const seasons = seasonsForRange(params.startDate, params.endDate);
  const where: Prisma.POIWhereInput = {
    region: {
      province: {
        notIn: EXCLUDED_PROVINCES,
      },
    },
    bestSeasons: {
      hasSome: seasons,
    },
  };

  if (params.regionId) {
    where.regionId = params.regionId;
  }
  if (params.categoryMix?.length) {
    // Narrow cast at the boundary where a pre-validated string is handed to the Prisma enum
    // filter — deliberately scoped to this one field rather than typing the whole `where`
    // clause as `any` (which previously suppressed findMany's normal return-type inference
    // and was a likely contributor to the implicit-`any` cascade in callers of this function).
    where.category = { in: params.categoryMix as POICategory[] };
  }
  if (params.excludePermitRequired) {
    where.requiresPermit = false;
  }

  const orderBy: Prisma.POIOrderByWithRelationInput[] = [{ requiresPermit: "asc" }, { verifiedAt: "desc" }];

  // Single-region requests — today, the only kind the trip-creation UI actually sends —
  // behave exactly as before: one query, ordered, capped at CANDIDATE_TARGET.
  if (params.regionId) {
    return prisma.pOI.findMany({
      where,
      include: { region: true },
      orderBy,
      take: CANDIDATE_TARGET,
    });
  }

  // No regionId: fetch a wider pool, then cap per-region so the final candidate set spans
  // regions instead of being dominated by whichever ones happen to sort first. Without this,
  // a flat `take: N` ordered by verifiedAt could silently starve entire regions out of the
  // candidate pool — the multi-region "Road Trip Crew" persona in design.md (e.g. Lahore ->
  // Hunza) would hit this directly once trip creation supports more than one region per trip.
  const pool = await prisma.pOI.findMany({
    where,
    include: { region: true },
    orderBy,
    take: CANDIDATE_FETCH_CEILING,
  });

  const byRegion = new Map<string, CandidatePoi[]>();
  for (const poi of pool) {
    const bucket = byRegion.get(poi.regionId);
    if (bucket) bucket.push(poi);
    else byRegion.set(poi.regionId, [poi]);
  }

  const sampled: CandidatePoi[] = [];
  for (let round = 0; sampled.length < CANDIDATE_TARGET && round < MAX_PER_REGION; round++) {
    let addedThisRound = false;
    for (const bucket of byRegion.values()) {
      if (sampled.length >= CANDIDATE_TARGET) break;
      const poi = bucket[round];
      if (poi) {
        sampled.push(poi);
        addedThisRound = true;
      }
    }
    if (!addedThisRound) break;
  }

  return sampled;
}