-- Add trainer identity columns (nullable). Backfill happens in code via
-- ensureTrainerIdentity() the first time a trainer loads their Sharing panel.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "trainerSlug" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "trainerReferralCode" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "trainerIsPublic" BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "trainerAcceptingClients" BOOLEAN NOT NULL DEFAULT TRUE;

-- Non-unique indexes matching the current schema. A partial unique index on
-- (trainerSlug) and (trainerReferralCode) is a separate follow-up migration
-- paired with P2002-aware retry logic in generateSlug/generateReferralCode.
CREATE INDEX IF NOT EXISTS "users_trainerSlug_idx" ON "users"("trainerSlug");
CREATE INDEX IF NOT EXISTS "users_trainerReferralCode_idx" ON "users"("trainerReferralCode");

-- Composite index for /api/trainers/search query shape (role + public flag).
CREATE INDEX IF NOT EXISTS "users_role_trainerIsPublic_idx" ON "users"("role", "trainerIsPublic");

-- ContactSubmission additions
ALTER TABLE "contact_submissions" ADD COLUMN IF NOT EXISTS "trainerId" TEXT;
ALTER TABLE "contact_submissions" ADD COLUMN IF NOT EXISTS "waitlist" BOOLEAN NOT NULL DEFAULT FALSE;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'contact_submissions_trainerId_fkey'
  ) THEN
    ALTER TABLE "contact_submissions"
      ADD CONSTRAINT "contact_submissions_trainerId_fkey"
      FOREIGN KEY ("trainerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "contact_submissions_trainerId_status_idx" ON "contact_submissions"("trainerId", "status");
