import type {
  Activity,
  ChatMessage,
  POI,
  Region,
  Trip,
  TripCollaborator,
  TripDay,
  TripTemplate,
  User,
  VisaGuide,
} from "@/lib/domain/types";
import type { Prisma } from "@prisma/client";

export type TripWithRelations = Prisma.TripGetPayload<{
  include: {
    owner: true;
    collaborators: { include: { user: true } };
    days: { include: { region: true; activities: { include: { poi: { include: { region: true } } } } } };
  };
}>;

function toRegion(region: any): Region {
  return {
    id: region.id,
    name: region.name,
    province: region.province,
    slug: region.slug,
    description: region.description,
    heroImageUrl: region.heroImageUrl,
    bestSeasons: region.bestSeasons,
    typicalTripDays: region.typicalTripDays,
  };
}

function toPoi(poi: any): POI {
  return {
    id: poi.id,
    name: poi.name,
    slug: poi.slug,
    regionId: poi.regionId,
    region: poi.region ? toRegion(poi.region) : undefined,
    category: poi.category,
    latitude: poi.latitude,
    longitude: poi.longitude,
    description: poi.description,
    bestSeasons: poi.bestSeasons,
    altitudeMeters: poi.altitudeMeters,
    requiresPermit: poi.requiresPermit,
    permitAuthority: poi.permitAuthority,
    permitNotes: poi.permitNotes,
    roadCondition: poi.roadCondition,
    avgVisitHours: poi.avgVisitHours,
    entryFeePkr: poi.entryFeePkr,
    safetyNotes: poi.safetyNotes,
    googlePlaceId: poi.googlePlaceId,
    photos: poi.photos,
    source: (poi.source as any) ?? null,
    verifiedAt: poi.verifiedAt?.toISOString() ?? null,
  };
}

function toActivity(activity: any): Activity {
  return {
    id: activity.id,
    tripDayId: activity.tripDayId,
    poiId: activity.poiId,
    poi: activity.poi ? toPoi(activity.poi) : null,
    customTitle: activity.customTitle,
    category: activity.category,
    startTime: activity.startTime,
    endTime: activity.endTime,
    orderIndex: activity.orderIndex,
    notes: activity.notes,
    estimatedCost: activity.estimatedCost,
    costCurrency: activity.costCurrency,
    addedByUserId: activity.addedByUserId,
    source: activity.source ?? "model",
  } as Activity;
}

function toDay(day: any): TripDay {
  return {
    id: day.id,
    tripId: day.tripId,
    dayNumber: day.dayNumber,
    date: day.date.toISOString(),
    regionId: day.regionId,
    region: day.region ? toRegion(day.region) : null,
    notes: day.notes,
    activities: [...day.activities]
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .map(toActivity),
  };
}

function toCollaborator(collaborator: any): TripCollaborator {
  return {
    id: collaborator.id,
    tripId: collaborator.tripId,
    userId: collaborator.userId,
    user: collaborator.user
      ? {
          id: collaborator.user.id,
          name: collaborator.user.name,
          email: collaborator.user.email,
          avatarUrl: collaborator.user.avatarUrl,
        }
      : null,
    invitedEmail: collaborator.invitedEmail,
    role: collaborator.role,
    joinedAt: collaborator.joinedAt?.toISOString() ?? null,
    createdAt: collaborator.createdAt.toISOString(),
  };
}

export function toTrip(trip: TripWithRelations): Trip {
  return {
    id: trip.id,
    ownerId: trip.ownerId,
    owner: {
      id: trip.owner.id,
      name: trip.owner.name,
      email: trip.owner.email,
      avatarUrl: trip.owner.avatarUrl,
    },
    title: trip.title,
    slug: trip.slug,
    startDate: trip.startDate.toISOString(),
    endDate: trip.endDate.toISOString(),
    travelerType: trip.travelerType,
    budgetTier: trip.budgetTier,
    pace: trip.pace as any,
    status: trip.status,
    coverImageUrl: trip.coverImageUrl,
    isPublic: trip.isPublic,
    shareToken: trip.shareToken,
    // B5e: partySize and vibe now persisted in Prisma and exposed in the DTO
    partySize: (trip as any).partySize ?? undefined,
    vibe: (trip as any).vibe ?? undefined,
    createdAt: trip.createdAt.toISOString(),
    updatedAt: trip.updatedAt.toISOString(),
    days: [...trip.days].sort((a, b) => a.dayNumber - b.dayNumber).map(toDay),
    collaborators: trip.collaborators.map(toCollaborator),
  };
}

/**
 * Serializer for the unauthenticated share link. Anyone holding the token can read this,
 * so it drops everything that identifies the people on the trip (owner/collaborator emails
 * and ids) and the share token itself.
 */
export function toPublicTrip(trip: TripWithRelations): Trip {
  const full = toTrip(trip);
  return {
    ...full,
    ownerId: undefined,
    owner: full.owner ? { name: full.owner.name, avatarUrl: full.owner.avatarUrl } : undefined,
    collaborators: [],
    shareToken: null,
  };
}

export function toRegionDto(region: any): Region {
  return toRegion(region);
}

export function toPoiDto(poi: any): POI {
  return toPoi(poi);
}

export function toTemplateDto(template: any): TripTemplate {
  return {
    id: template.id,
    title: template.title,
    regionId: template.regionId,
    region: template.region ? toRegion(template.region) : undefined,
    durationDays: template.durationDays,
    tags: template.tags,
    priceTier: template.priceTier,
    coverImageUrl: template.coverImageUrl,
    description: template.description,
    itineraryJson: template.itineraryJson,
    usageCount: template.usageCount,
  } as TripTemplate;
}

export function toVisaDto(visa: any): VisaGuide {
  return {
    id: visa.id,
    nationalityCode: visa.nationalityCode,
    evisaAvailable: visa.evisaAvailable,
    visaFreeStay: visa.visaFreeStay,
    feeUsdMin: visa.feeUsdMin,
    feeUsdMax: visa.feeUsdMax,
    processingDaysMin: visa.processingDaysMin,
    processingDaysMax: visa.processingDaysMax,
    notes: visa.notes,
    officialLink: visa.officialLink,
    lastVerifiedAt: visa.lastVerifiedAt.toISOString(),
  };
}

export function toChatDto(chat: any): ChatMessage {
  return {
    id: chat.id,
    tripId: chat.tripId,
    role: chat.role,
    content: chat.content,
    toolCalls: (chat.toolCalls as any) ?? null,
    createdAt: chat.createdAt.toISOString(),
  };
}
