import { prisma } from "./db";
import { seasonsForRange } from "./season";

const EXCLUDED_PROVINCES = ["Balochistan", "Former FATA", "FATA", "Ex-FATA"];

export async function getCandidatePois(params: {
  regionId?: string;
  startDate: Date;
  endDate: Date;
  categoryMix?: string[];
}) {
  const seasons = seasonsForRange(params.startDate, params.endDate);
  const where: any = {
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
    where.category = { in: params.categoryMix };
  }

  return prisma.pOI.findMany({
    where,
    include: { region: true },
    orderBy: [{ requiresPermit: "asc" }, { verifiedAt: "desc" }],
    take: 80,
  });
}
