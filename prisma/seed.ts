import { PrismaClient } from "@prisma/client";
import {
  mockUsers,
  pois,
  regions,
  sampleChatMessages,
  sampleHunzaTrip,
  tripTemplates,
  visaGuides,
} from "../src/lib/mock-data";

const prisma = new PrismaClient();

async function main() {
  await prisma.activityVote.deleteMany();
  await prisma.chatMessage.deleteMany();
  await prisma.savedPlace.deleteMany();
  await prisma.activity.deleteMany();
  await prisma.tripDay.deleteMany();
  await prisma.tripCollaborator.deleteMany();
  await prisma.trip.deleteMany();
  await prisma.tripTemplate.deleteMany();
  await prisma.poi.deleteMany();
  await prisma.region.deleteMany();
  await prisma.visaGuide.deleteMany();
  await prisma.user.deleteMany();

  for (const user of mockUsers) {
    await prisma.user.create({
      data: {
        id: user.id,
        email: user.email,
        passwordHash: user.passwordHash ?? null,
        authProvider: user.authProvider,
        name: user.name,
        homeCountry: user.homeCountry ?? null,
        avatarUrl: user.avatarUrl ?? null,
        createdAt: new Date(user.createdAt),
        updatedAt: new Date(user.updatedAt),
      },
    });
  }

  for (const region of regions) {
    await prisma.region.create({
      data: {
        id: region.id,
        name: region.name,
        province: region.province,
        slug: region.slug,
        description: region.description ?? null,
        heroImageUrl: region.heroImageUrl ?? null,
        bestSeasons: region.bestSeasons,
        typicalTripDays: region.typicalTripDays ?? null,
      },
    });
  }

  for (const poi of pois) {
    await prisma.poi.create({
      data: {
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
  }

  for (const template of tripTemplates) {
    await prisma.tripTemplate.create({
      data: {
        id: template.id,
        title: template.title,
        regionId: template.regionId,
        durationDays: template.durationDays,
        tags: template.tags,
        priceTier: template.priceTier ?? null,
        coverImageUrl: template.coverImageUrl ?? null,
        description: template.description,
        itineraryJson: template.itineraryJson,
        usageCount: template.usageCount,
      },
    });
  }

  await prisma.trip.create({
    data: {
      id: sampleHunzaTrip.id,
      ownerId: sampleHunzaTrip.ownerId,
      title: sampleHunzaTrip.title,
      slug: sampleHunzaTrip.slug,
      startDate: new Date(sampleHunzaTrip.startDate),
      endDate: new Date(sampleHunzaTrip.endDate),
      travelerType: sampleHunzaTrip.travelerType,
      budgetTier: sampleHunzaTrip.budgetTier ?? null,
      pace: sampleHunzaTrip.pace,
      status: sampleHunzaTrip.status,
      coverImageUrl: sampleHunzaTrip.coverImageUrl ?? null,
      isPublic: sampleHunzaTrip.isPublic,
      shareToken: sampleHunzaTrip.shareToken ?? null,
      createdAt: new Date(sampleHunzaTrip.createdAt),
      updatedAt: new Date(sampleHunzaTrip.updatedAt),
      collaborators: {
        create: (sampleHunzaTrip.collaborators ?? []).map((collaborator) => ({
          id: collaborator.id,
          userId: collaborator.userId ?? null,
          invitedEmail: collaborator.invitedEmail ?? null,
          role: collaborator.role,
          joinedAt: collaborator.joinedAt ? new Date(collaborator.joinedAt) : null,
          createdAt: new Date(collaborator.createdAt),
        })),
      },
      days: {
        create: sampleHunzaTrip.days.map((day) => ({
          id: day.id,
          dayNumber: day.dayNumber,
          date: new Date(day.date),
          regionId: day.regionId ?? null,
          notes: day.notes ?? null,
          activities: {
            create: day.activities.map((activity) => ({
              id: activity.id,
              poiId: activity.poiId ?? null,
              customTitle: activity.customTitle ?? null,
              category: activity.category,
              startTime: activity.startTime ?? null,
              endTime: activity.endTime ?? null,
              orderIndex: activity.orderIndex,
              notes: activity.notes ?? null,
              estimatedCost: activity.estimatedCost ?? null,
              costCurrency: activity.costCurrency,
              addedByUserId: activity.addedByUserId ?? null,
            })),
          },
        })),
      },
    },
  });

  for (const message of sampleChatMessages) {
    await prisma.chatMessage.create({
      data: {
        id: message.id,
        tripId: message.tripId,
        role: message.role,
        content: message.content,
        toolCalls: message.toolCalls ?? undefined,
        createdAt: new Date(message.createdAt),
      },
    });
  }

  for (const visa of visaGuides) {
    await prisma.visaGuide.create({
      data: {
        id: visa.id,
        nationalityCode: visa.nationalityCode,
        evisaAvailable: visa.evisaAvailable,
        visaFreeStay: visa.visaFreeStay,
        feeUsdMin: visa.feeUsdMin ?? null,
        feeUsdMax: visa.feeUsdMax ?? null,
        processingDaysMin: visa.processingDaysMin ?? null,
        processingDaysMax: visa.processingDaysMax ?? null,
        notes: visa.notes ?? null,
        officialLink: visa.officialLink,
        lastVerifiedAt: new Date(visa.lastVerifiedAt),
      },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
