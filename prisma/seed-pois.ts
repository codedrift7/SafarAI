import { loadEnvConfig } from "@next/env";
import { PrismaClient } from "@prisma/client";

loadEnvConfig(process.cwd());

import { pois } from "../src/lib/mock-data";

const prisma = new PrismaClient();

async function main() {
  console.log(`Starting POI import: ${pois.length} POIs`);

  for (const poi of pois) {
    const region = await prisma.region.findUnique({
      where: { id: poi.regionId },
      select: { id: true, name: true },
    });

    if (!region) {
      throw new Error(
        `Region "${poi.regionId}" not found for POI "${poi.name}". ` +
          `Create the Region before importing its POIs.`,
      );
    }

    await prisma.pOI.upsert({
      where: {
        id: poi.id,
      },
      create: {
        id: poi.id,
        name: poi.name,
        slug: poi.slug,
        regionId: poi.regionId,
        category: poi.category,
        latitude: poi.latitude,
        longitude: poi.longitude,
        description: poi.description ?? null,
        bestSeasons: poi.bestSeasons,
        altitudeMeters: poi.altitudeMeters ?? null,
        requiresPermit: poi.requiresPermit,
        permitAuthority: poi.permitAuthority ?? null,
        permitNotes: poi.permitNotes ?? null,
        permitOfficialLink: poi.permitOfficialLink ?? null,
        permitLastVerifiedAt: poi.permitLastVerifiedAt ? new Date(poi.permitLastVerifiedAt) : null,
        roadCondition: poi.roadCondition,
        avgVisitHours: poi.avgVisitHours ?? null,
        entryFeePkr: poi.entryFeePkr ?? null,
        safetyNotes: poi.safetyNotes ?? null,
        googlePlaceId: poi.googlePlaceId ?? null,
        photos: poi.photos,
        source: poi.source ?? null,
        verifiedAt: poi.verifiedAt ? new Date(poi.verifiedAt) : null,
      },
      update: {
        name: poi.name,
        slug: poi.slug,
        regionId: poi.regionId,
        category: poi.category,
        latitude: poi.latitude,
        longitude: poi.longitude,
        description: poi.description ?? null,
        bestSeasons: poi.bestSeasons,
        altitudeMeters: poi.altitudeMeters ?? null,
        requiresPermit: poi.requiresPermit,
        permitAuthority: poi.permitAuthority ?? null,
        permitNotes: poi.permitNotes ?? null,
        permitOfficialLink: poi.permitOfficialLink ?? null,
        permitLastVerifiedAt: poi.permitLastVerifiedAt ? new Date(poi.permitLastVerifiedAt) : null,
        roadCondition: poi.roadCondition,
        avgVisitHours: poi.avgVisitHours ?? null,
        entryFeePkr: poi.entryFeePkr ?? null,
        safetyNotes: poi.safetyNotes ?? null,
        googlePlaceId: poi.googlePlaceId ?? null,
        photos: poi.photos,
        source: poi.source ?? null,
        verifiedAt: poi.verifiedAt ? new Date(poi.verifiedAt) : null,
      },
    });

    console.log(`✓ ${poi.name} → ${region.name}`);
  }

  const counts = await prisma.pOI.groupBy({
    by: ["regionId"],
    _count: {
      id: true,
    },
  });

  console.log("\nPOI counts by region:");

  for (const count of counts) {
    console.log(`${count.regionId}: ${count._count.id}`);
  }

  const hunzaCount = await prisma.pOI.count({
    where: {
      regionId: "region-hunza",
    },
  });

  console.log(`\nHunza POIs: ${hunzaCount}`);

  if (hunzaCount === 0) {
    throw new Error("POI import completed but Hunza still has 0 POIs.");
  }

  console.log("\nPOI import completed successfully.");
}

main()
  .catch((error) => {
    console.error("\nPOI import failed:");
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });