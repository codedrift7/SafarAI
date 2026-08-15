CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TYPE "TravelerType" AS ENUM ('SOLO', 'COUPLE', 'FAMILY', 'FRIENDS', 'RELIGIOUS', 'BUSINESS');
CREATE TYPE "BudgetTier" AS ENUM ('BUDGET', 'MID_RANGE', 'LUXURY');
CREATE TYPE "TripStatus" AS ENUM ('DRAFT', 'PLANNING', 'CONFIRMED', 'COMPLETED', 'ARCHIVED');
CREATE TYPE "CollaboratorRole" AS ENUM ('OWNER', 'EDITOR', 'VIEWER');
CREATE TYPE "POICategory" AS ENUM ('MOUNTAIN', 'LAKE', 'FORT', 'MOSQUE', 'SHRINE', 'MUSEUM', 'BAZAAR', 'WATERFALL', 'NATIONAL_PARK', 'HILL_STATION', 'VALLEY', 'GLACIER', 'ARCHAEOLOGICAL_SITE', 'CITY_LANDMARK', 'RESTAURANT', 'VIEWPOINT');
CREATE TYPE "RoadCondition" AS ENUM ('PAVED', 'UNPAVED', 'FOUR_WD_REQUIRED', 'SEASONAL_CLOSURE');
CREATE TYPE "Season" AS ENUM ('SPRING', 'SUMMER', 'AUTUMN', 'WINTER');
CREATE TYPE "ActivityCategory" AS ENUM ('SIGHTSEEING', 'FOOD', 'TRANSPORT', 'LODGING', 'REST', 'ADVENTURE', 'SHOPPING', 'RELIGIOUS');

CREATE TABLE "User" (
	"id" TEXT NOT NULL,
	"email" TEXT NOT NULL,
	"passwordHash" TEXT,
	"authProvider" TEXT NOT NULL DEFAULT 'email',
	"name" TEXT NOT NULL,
	"homeCountry" TEXT,
	"avatarUrl" TEXT,
	"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"updatedAt" TIMESTAMP(3) NOT NULL,
	CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Trip" (
	"id" TEXT NOT NULL,
	"ownerId" TEXT NOT NULL,
	"title" TEXT NOT NULL,
	"slug" TEXT NOT NULL,
	"startDate" TIMESTAMP(3) NOT NULL,
	"endDate" TIMESTAMP(3) NOT NULL,
	"travelerType" "TravelerType" NOT NULL,
	"budgetTier" "BudgetTier",
	"pace" TEXT NOT NULL DEFAULT 'balanced',
	"status" "TripStatus" NOT NULL DEFAULT 'DRAFT',
	"coverImageUrl" TEXT,
	"isPublic" BOOLEAN NOT NULL DEFAULT false,
	"shareToken" TEXT,
	"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"updatedAt" TIMESTAMP(3) NOT NULL,
	CONSTRAINT "Trip_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TripCollaborator" (
	"id" TEXT NOT NULL,
	"tripId" TEXT NOT NULL,
	"userId" TEXT,
	"invitedEmail" TEXT,
	"role" "CollaboratorRole" NOT NULL DEFAULT 'EDITOR',
	"joinedAt" TIMESTAMP(3),
	"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "TripCollaborator_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TripDay" (
	"id" TEXT NOT NULL,
	"tripId" TEXT NOT NULL,
	"dayNumber" INTEGER NOT NULL,
	"date" TIMESTAMP(3) NOT NULL,
	"regionId" TEXT,
	"notes" TEXT,
	CONSTRAINT "TripDay_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Activity" (
	"id" TEXT NOT NULL,
	"tripDayId" TEXT NOT NULL,
	"poiId" TEXT,
	"customTitle" TEXT,
	"category" "ActivityCategory" NOT NULL,
	"startTime" TEXT,
	"endTime" TEXT,
	"orderIndex" INTEGER NOT NULL,
	"notes" TEXT,
	"estimatedCost" DOUBLE PRECISION,
	"costCurrency" TEXT NOT NULL DEFAULT 'PKR',
	"addedByUserId" TEXT,
	CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ActivityVote" (
	"id" TEXT NOT NULL,
	"activityId" TEXT NOT NULL,
	"userId" TEXT NOT NULL,
	"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "ActivityVote_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Region" (
	"id" TEXT NOT NULL,
	"name" TEXT NOT NULL,
	"province" TEXT NOT NULL,
	"slug" TEXT NOT NULL,
	"description" TEXT,
	"heroImageUrl" TEXT,
	"bestSeasons" "Season"[],
	"typicalTripDays" INTEGER,
	CONSTRAINT "Region_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "POI" (
	"id" TEXT NOT NULL,
	"name" TEXT NOT NULL,
	"slug" TEXT NOT NULL,
	"regionId" TEXT NOT NULL,
	"category" "POICategory" NOT NULL,
	"latitude" DOUBLE PRECISION NOT NULL,
	"longitude" DOUBLE PRECISION NOT NULL,
	"description" TEXT,
	"bestSeasons" "Season"[],
	"altitudeMeters" INTEGER,
	"requiresPermit" BOOLEAN NOT NULL DEFAULT false,
	"permitAuthority" TEXT,
	"permitNotes" TEXT,
	"roadCondition" "RoadCondition" NOT NULL DEFAULT 'PAVED',
	"avgVisitHours" DOUBLE PRECISION,
	"entryFeePkr" DOUBLE PRECISION,
	"safetyNotes" TEXT,
	"googlePlaceId" TEXT,
	"photos" TEXT[],
	"source" TEXT,
	"verifiedAt" TIMESTAMP(3),
	CONSTRAINT "POI_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TripTemplate" (
	"id" TEXT NOT NULL,
	"title" TEXT NOT NULL,
	"regionId" TEXT NOT NULL,
	"durationDays" INTEGER NOT NULL,
	"tags" TEXT[],
	"priceTier" "BudgetTier",
	"coverImageUrl" TEXT,
	"description" TEXT NOT NULL,
	"itineraryJson" JSONB NOT NULL,
	"usageCount" INTEGER NOT NULL DEFAULT 0,
	CONSTRAINT "TripTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SavedPlace" (
	"id" TEXT NOT NULL,
	"userId" TEXT NOT NULL,
	"poiId" TEXT NOT NULL,
	"notes" TEXT,
	"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "SavedPlace_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ChatMessage" (
	"id" TEXT NOT NULL,
	"tripId" TEXT NOT NULL,
	"role" TEXT NOT NULL,
	"content" TEXT NOT NULL,
	"toolCalls" JSONB,
	"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VisaGuide" (
	"id" TEXT NOT NULL,
	"nationalityCode" TEXT NOT NULL,
	"evisaAvailable" BOOLEAN NOT NULL,
	"visaFreeStay" BOOLEAN NOT NULL DEFAULT false,
	"feeUsdMin" DOUBLE PRECISION,
	"feeUsdMax" DOUBLE PRECISION,
	"processingDaysMin" INTEGER,
	"processingDaysMax" INTEGER,
	"notes" TEXT,
	"officialLink" TEXT NOT NULL DEFAULT 'https://visa.nadra.gov.pk',
	"lastVerifiedAt" TIMESTAMP(3) NOT NULL,
	CONSTRAINT "VisaGuide_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "Trip_slug_key" ON "Trip"("slug");
CREATE UNIQUE INDEX "Trip_shareToken_key" ON "Trip"("shareToken");
CREATE UNIQUE INDEX "TripCollaborator_tripId_userId_key" ON "TripCollaborator"("tripId", "userId");
CREATE UNIQUE INDEX "TripDay_tripId_dayNumber_key" ON "TripDay"("tripId", "dayNumber");
CREATE UNIQUE INDEX "ActivityVote_activityId_userId_key" ON "ActivityVote"("activityId", "userId");
CREATE UNIQUE INDEX "Region_slug_key" ON "Region"("slug");
CREATE UNIQUE INDEX "POI_slug_key" ON "POI"("slug");
CREATE INDEX "POI_regionId_category_idx" ON "POI"("regionId", "category");
CREATE UNIQUE INDEX "SavedPlace_userId_poiId_key" ON "SavedPlace"("userId", "poiId");
CREATE UNIQUE INDEX "VisaGuide_nationalityCode_key" ON "VisaGuide"("nationalityCode");

ALTER TABLE "Trip" ADD CONSTRAINT "Trip_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TripCollaborator" ADD CONSTRAINT "TripCollaborator_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TripCollaborator" ADD CONSTRAINT "TripCollaborator_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TripDay" ADD CONSTRAINT "TripDay_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TripDay" ADD CONSTRAINT "TripDay_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_tripDayId_fkey" FOREIGN KEY ("tripDayId") REFERENCES "TripDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_poiId_fkey" FOREIGN KEY ("poiId") REFERENCES "POI"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ActivityVote" ADD CONSTRAINT "ActivityVote_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ActivityVote" ADD CONSTRAINT "ActivityVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "POI" ADD CONSTRAINT "POI_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TripTemplate" ADD CONSTRAINT "TripTemplate_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SavedPlace" ADD CONSTRAINT "SavedPlace_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SavedPlace" ADD CONSTRAINT "SavedPlace_poiId_fkey" FOREIGN KEY ("poiId") REFERENCES "POI"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- TODO(design.md §10): confirm with founder whether to move to a dedicated geography column.
CREATE INDEX IF NOT EXISTS "poi_geo_idx"
ON "POI"
USING GIST (ST_SetSRID(ST_MakePoint("longitude", "latitude"), 4326)::geography);
