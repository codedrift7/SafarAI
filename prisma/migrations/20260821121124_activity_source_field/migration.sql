-- CreateEnum
CREATE TYPE "ActivitySource" AS ENUM ('model', 'auto_fill');

-- AlterTable
ALTER TABLE "Activity" ADD COLUMN     "source" "ActivitySource" NOT NULL DEFAULT 'model';
