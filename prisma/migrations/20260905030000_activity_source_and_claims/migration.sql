-- Create new enum
CREATE TYPE "ActivitySource_new" AS ENUM ('catalog', 'ai_generated', 'user_added');

-- Alter Activity table: add unverifiedClaims and convert source column with unambiguous historical backfill
ALTER TABLE "Activity"
  ADD COLUMN "unverifiedClaims" JSONB,
  ALTER COLUMN "source" DROP DEFAULT,
  ALTER COLUMN "source" TYPE "ActivitySource_new" USING (
    CASE
      WHEN "poiId" IS NOT NULL THEN 'catalog'::"ActivitySource_new"
      WHEN "addedByUserId" IS NOT NULL THEN 'user_added'::"ActivitySource_new"
      ELSE 'user_added'::"ActivitySource_new"
    END
  ),
  ALTER COLUMN "source" SET DEFAULT 'ai_generated'::"ActivitySource_new";

-- Drop old enum and rename new enum
DROP TYPE "ActivitySource";
ALTER TYPE "ActivitySource_new" RENAME TO "ActivitySource";
