-- Phase 2 — Multi-trainer directory
-- All additive; safe for `prisma db push --skip-generate` on Railway.

-- Trainer model additions (all nullable or defaulted)
ALTER TABLE "trainers" ADD COLUMN IF NOT EXISTS "photoUrl" TEXT;
ALTER TABLE "trainers" ADD COLUMN IF NOT EXISTS "location" TEXT;
ALTER TABLE "trainers" ADD COLUMN IF NOT EXISTS "instagramHandle" TEXT;
ALTER TABLE "trainers" ADD COLUMN IF NOT EXISTS "priceTier" TEXT;
ALTER TABLE "trainers" ADD COLUMN IF NOT EXISTS "specialties" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "trainers" ADD COLUMN IF NOT EXISTS "acceptsInPerson" BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE "trainers" ADD COLUMN IF NOT EXISTS "acceptsOnline" BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE "trainers" ADD COLUMN IF NOT EXISTS "profilePublishedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "trainers_profilePublishedAt_idx" ON "trainers"("profilePublishedAt");

-- Enums
DO $$ BEGIN
  CREATE TYPE "TransformationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'REMOVED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "TakedownStatus" AS ENUM ('OPEN', 'REVIEWING', 'RESOLVED_REMOVED', 'RESOLVED_KEPT');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- TrainerTestimonial
CREATE TABLE IF NOT EXISTS "trainer_testimonials" (
  "id"          TEXT PRIMARY KEY,
  "trainerId"   TEXT NOT NULL,
  "quote"       TEXT NOT NULL,
  "attribution" TEXT NOT NULL,
  "order"       INTEGER NOT NULL DEFAULT 0,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'trainer_testimonials_trainerId_fkey'
  ) THEN
    ALTER TABLE "trainer_testimonials"
      ADD CONSTRAINT "trainer_testimonials_trainerId_fkey"
      FOREIGN KEY ("trainerId") REFERENCES "trainers"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "trainer_testimonials_trainerId_order_idx"
  ON "trainer_testimonials"("trainerId", "order");

-- TrainerTransformation
CREATE TABLE IF NOT EXISTS "trainer_transformations" (
  "id"              TEXT PRIMARY KEY,
  "trainerId"       TEXT NOT NULL,
  "beforePhotoUrl"  TEXT NOT NULL,
  "afterPhotoUrl"   TEXT NOT NULL,
  "caption"         TEXT,
  "durationWeeks"   INTEGER,
  "status"          "TransformationStatus" NOT NULL DEFAULT 'PENDING',
  "reviewedBy"      TEXT,
  "reviewedAt"      TIMESTAMP(3),
  "rejectionReason" TEXT,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'trainer_transformations_trainerId_fkey'
  ) THEN
    ALTER TABLE "trainer_transformations"
      ADD CONSTRAINT "trainer_transformations_trainerId_fkey"
      FOREIGN KEY ("trainerId") REFERENCES "trainers"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "trainer_transformations_trainerId_status_idx"
  ON "trainer_transformations"("trainerId", "status");
CREATE INDEX IF NOT EXISTS "trainer_transformations_status_createdAt_idx"
  ON "trainer_transformations"("status", "createdAt");

-- TrainerAgreement
CREATE TABLE IF NOT EXISTS "trainer_agreements" (
  "id"         TEXT PRIMARY KEY,
  "userId"     TEXT NOT NULL UNIQUE,
  "version"    TEXT NOT NULL,
  "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ipAddress"  TEXT,
  "userAgent"  TEXT
);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'trainer_agreements_userId_fkey'
  ) THEN
    ALTER TABLE "trainer_agreements"
      ADD CONSTRAINT "trainer_agreements_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- ContentTakedownRequest
CREATE TABLE IF NOT EXISTS "content_takedown_requests" (
  "id"             TEXT PRIMARY KEY,
  "contentType"    TEXT NOT NULL,
  "contentId"      TEXT NOT NULL,
  "reporterEmail"  TEXT NOT NULL,
  "reporterName"   TEXT,
  "reason"         TEXT NOT NULL,
  "status"         "TakedownStatus" NOT NULL DEFAULT 'OPEN',
  "resolvedBy"     TEXT,
  "resolvedAt"     TIMESTAMP(3),
  "resolutionNote" TEXT,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "content_takedown_requests_status_createdAt_idx"
  ON "content_takedown_requests"("status", "createdAt");
