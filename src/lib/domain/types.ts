/**
 * JSON-safe client DTOs mirroring the Prisma schema in design.md.  Keeping
 * dates as ISO strings makes these types usable on both sides of the future
 * API boundary without importing Prisma into the UI.
 */

export type ISODateString = string;

export const travelerTypes = [
  "SOLO",
  "COUPLE",
  "FAMILY",
  "FRIENDS",
  "RELIGIOUS",
  "BUSINESS",
] as const;
export type TravelerType = (typeof travelerTypes)[number];

export const budgetTiers = ["BUDGET", "MID_RANGE", "LUXURY"] as const;
export type BudgetTier = (typeof budgetTiers)[number];

export const tripStatuses = [
  "DRAFT",
  "PLANNING",
  "CONFIRMED",
  "COMPLETED",
  "ARCHIVED",
] as const;
export type TripStatus = (typeof tripStatuses)[number];

export const collaboratorRoles = ["OWNER", "EDITOR", "VIEWER"] as const;
export type CollaboratorRole = (typeof collaboratorRoles)[number];

export const poiCategories = [
  "MOUNTAIN",
  "LAKE",
  "FORT",
  "MOSQUE",
  "SHRINE",
  "MUSEUM",
  "BAZAAR",
  "WATERFALL",
  "NATIONAL_PARK",
  "HILL_STATION",
  "VALLEY",
  "GLACIER",
  "ARCHAEOLOGICAL_SITE",
  "CITY_LANDMARK",
  "RESTAURANT",
  "VIEWPOINT",
] as const;
export type POICategory = (typeof poiCategories)[number];

export const roadConditions = [
  "PAVED",
  "UNPAVED",
  "FOUR_WD_REQUIRED",
  "SEASONAL_CLOSURE",
] as const;
export type RoadCondition = (typeof roadConditions)[number];

export const seasons = ["SPRING", "SUMMER", "AUTUMN", "WINTER"] as const;
export type Season = (typeof seasons)[number];

export const activityCategories = [
  "SIGHTSEEING",
  "FOOD",
  "TRANSPORT",
  "LODGING",
  "REST",
  "ADVENTURE",
  "SHOPPING",
  "RELIGIOUS",
] as const;
export type ActivityCategory = (typeof activityCategories)[number];

export type ChatRole = "user" | "assistant" | "system";
export type TripPace = "relaxed" | "balanced" | "packed";

export interface User {
  id: string;
  email: string;
  passwordHash?: string | null;
  authProvider: "email" | "google";
  name: string;
  homeCountry?: string | null;
  avatarUrl?: string | null;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface Region {
  id: string;
  name: string;
  province: string;
  slug: string;
  description?: string | null;
  heroImageUrl?: string | null;
  bestSeasons: Season[];
  typicalTripDays?: number | null;
  /** A short piece of useful, human-written planning context for the UI. */
  planningNotes?: string;
}

export interface POI {
  id: string;
  name: string;
  slug: string;
  regionId: string;
  /** Present on detail/list results, omitted when a relation is not included. */
  region?: Region;
  category: POICategory;
  latitude: number;
  longitude: number;
  description?: string | null;
  bestSeasons: Season[];
  altitudeMeters?: number | null;
  requiresPermit: boolean;
  permitAuthority?: string | null;
  permitNotes?: string | null;
  /** Extra advisory metadata required by design.md section 6.4. */
  permitOfficialLink?: string | null;
  permitLastVerifiedAt?: ISODateString | null;
  roadCondition: RoadCondition;
  avgVisitHours?: number | null;
  entryFeePkr?: number | null;
  safetyNotes?: string | null;
  googlePlaceId?: string | null;
  photos: string[];
  source?: "curated" | "google_places" | null;
  verifiedAt?: ISODateString | null;
}

export interface Activity {
  id: string;
  tripDayId: string;
  poiId?: string | null;
  poi?: POI | null;
  /** Required when poiId is null; such activities are visibly unverified. */
  customTitle?: string | null;
  category: ActivityCategory;
  startTime?: string | null;
  endTime?: string | null;
  orderIndex: number;
  notes?: string | null;
  estimatedCost?: number | null;
  costCurrency: string;
  addedByUserId?: string | null;
}

export interface TripDay {
  id: string;
  tripId: string;
  dayNumber: number;
  date: ISODateString;
  regionId?: string | null;
  region?: Region | null;
  notes?: string | null;
  activities: Activity[];
}

export interface TripCollaborator {
  id: string;
  tripId: string;
  userId?: string | null;
  user?: Pick<User, "id" | "name" | "email" | "avatarUrl"> | null;
  invitedEmail?: string | null;
  role: CollaboratorRole;
  joinedAt?: ISODateString | null;
  createdAt: ISODateString;
}

export interface Trip {
  id: string;
  ownerId: string;
  owner?: Pick<User, "id" | "name" | "email" | "avatarUrl">;
  title: string;
  slug: string;
  startDate: ISODateString;
  endDate: ISODateString;
  travelerType: TravelerType;
  budgetTier?: BudgetTier | null;
  pace: TripPace;
  status: TripStatus;
  coverImageUrl?: string | null;
  isPublic: boolean;
  shareToken?: string | null;
  createdAt: ISODateString;
  updatedAt: ISODateString;
  /** UI-only planning context; this is intentionally not a Prisma dependency. */
  partySize?: number;
  vibe?: string;
  days: TripDay[];
  collaborators?: TripCollaborator[];
}

export interface TemplateActivity {
  poiId?: string | null;
  customTitle?: string | null;
  category: ActivityCategory;
  startTime?: string | null;
  endTime?: string | null;
  notes?: string | null;
  estimatedCost?: number | null;
  costCurrency?: string;
}

export interface TemplateDay {
  dayNumber: number;
  regionId?: string | null;
  notes?: string | null;
  activities: TemplateActivity[];
}

export interface TemplateItinerary {
  days: TemplateDay[];
}

export interface TripTemplate {
  id: string;
  title: string;
  regionId: string;
  region?: Region;
  durationDays: number;
  tags: string[];
  priceTier?: BudgetTier | null;
  coverImageUrl?: string | null;
  description: string;
  /** Named after Prisma's `itineraryJson`, but strongly typed in the mock layer. */
  itineraryJson: TemplateItinerary;
  usageCount: number;
}

export interface ChatMessage {
  id: string;
  tripId: string;
  role: ChatRole;
  content: string;
  toolCalls?: ChatToolCall[] | null;
  createdAt: ISODateString;
}

export interface ChatToolCall {
  name:
    | "add_activity"
    | "remove_activity"
    | "modify_activity"
    | "reorder_activities"
    | "swap_activity";
  arguments: Record<string, unknown>;
}

export interface VisaGuide {
  id: string;
  nationalityCode: string;
  evisaAvailable: boolean;
  visaFreeStay: boolean;
  feeUsdMin?: number | null;
  feeUsdMax?: number | null;
  processingDaysMin?: number | null;
  processingDaysMax?: number | null;
  notes?: string | null;
  officialLink: string;
  lastVerifiedAt: ISODateString;
}

export type AdvisoryType =
  | "PERMIT"
  | "SEASONAL"
  | "ROAD"
  | "ALTITUDE"
  | "SAFETY"
  | "UNVERIFIED";
export type AdvisorySeverity = "info" | "warning" | "critical";

export interface Advisory {
  id: string;
  type: AdvisoryType;
  severity: AdvisorySeverity;
  title: string;
  message: string;
  activityId?: string;
  poiId?: string;
  officialLink?: string;
  lastVerifiedAt?: ISODateString;
}

export interface POIFilters {
  region?: string;
  regionId?: string;
  category?: POICategory;
  season?: Season;
  query?: string;
  requiresPermit?: boolean;
}

export interface TemplateFilters {
  region?: string;
  regionId?: string;
  tag?: string;
  durationDays?: number;
  priceTier?: BudgetTier;
}

export interface TripFilters {
  status?: TripStatus;
  ownerId?: string;
  includeArchived?: boolean;
}

export interface CreateTripInput {
  title?: string;
  destination?: string;
  regionSlug?: string;
  startDate: ISODateString;
  endDate: ISODateString;
  travelerType: TravelerType;
  budgetTier?: BudgetTier | null;
  pace?: TripPace;
  partySize?: number;
  vibe?: string;
  coverImageUrl?: string | null;
}

export interface UpdateTripInput {
  title?: string;
  startDate?: ISODateString;
  endDate?: ISODateString;
  travelerType?: TravelerType;
  budgetTier?: BudgetTier | null;
  pace?: TripPace;
  status?: TripStatus;
  coverImageUrl?: string | null;
  isPublic?: boolean;
  shareToken?: string | null;
  partySize?: number;
  vibe?: string;
}

export interface CreateActivityInput {
  tripDayId: string;
  poiId?: string | null;
  customTitle?: string | null;
  category: ActivityCategory;
  startTime?: string | null;
  endTime?: string | null;
  notes?: string | null;
  estimatedCost?: number | null;
  costCurrency?: string;
  afterActivityId?: string;
}

export interface UpdateActivityInput {
  poiId?: string | null;
  customTitle?: string | null;
  category?: ActivityCategory;
  startTime?: string | null;
  endTime?: string | null;
  notes?: string | null;
  estimatedCost?: number | null;
  costCurrency?: string;
}

export interface GenerateItineraryInput {
  tripId: string;
  regionSlug?: string;
  /** Optional user brief, kept with the generation request for a later NIM swap. */
  prompt?: string;
  destination?: string;
  startDate?: ISODateString;
  endDate?: ISODateString;
  travelerType?: TravelerType;
  budgetTier?: BudgetTier | null;
  pace?: TripPace;
}

export type ItineraryStreamEvent =
  | {
      type: "status";
      tripId: string;
      message: string;
      progress: number;
    }
  | {
      type: "day";
      tripId: string;
      day: TripDay;
      advisories: Advisory[];
      progress: number;
    }
  | { type: "complete"; tripId: string; trip: Trip; progress: 100 }
  | { type: "error"; tripId: string; message: string; progress: number };

export interface SendChatMessageInput {
  tripId: string;
  content: string;
}

export type ChatStreamEvent =
  | { type: "message"; tripId: string; message: ChatMessage }
  | {
      type: "activity-updated";
      tripId: string;
      activity: Activity;
      message: ChatMessage;
    }
  | { type: "complete"; tripId: string; trip: Trip; message: ChatMessage };

export interface PackingListInput {
  regionSlug?: string;
  startDate?: ISODateString;
  endDate?: ISODateString;
  travelerType?: TravelerType;
}

export interface PackingList {
  essentials: string[];
  clothing: string[];
  healthAndSafety: string[];
  documents: string[];
  notes: string[];
}

export interface TripExport {
  filename: string;
  mimeType: "application/pdf";
  /** Mock export body: Session 2 replaces this with a PDF endpoint. */
  content: string;
}
