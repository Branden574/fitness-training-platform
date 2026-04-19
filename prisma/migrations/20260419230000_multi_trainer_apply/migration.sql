-- Add trainer identity columns (nullable). Backfill happens in code via
-- ensureTrainerIdentity() the first time a trainer loads their Sharing panel.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "trainerSlug" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "trainerReferralCode" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "trainerIsPublic" BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "trainerAcceptingClients" BOOLEAN NOT NULL DEFAULT TRUE;

CREATE UNIQUE INDEX IF NOT EXISTS "users_trainerSlug_key" ON "users"("trainerSlug");
CREATE UNIQUE INDEX IF NOT EXISTS "users_trainerReferralCode_key" ON "users"("trainerReferralCode");

-- ContactSubmission additions
ALTER TABLE "contact_submissions" ADD COLUMN IF NOT EXISTS "trainerId" TEXT;
ALTER TABLE "contact_submissions" ADD COLUMN IF NOT EXISTS "waitlist" BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE "contact_submissions"
  ADD CONSTRAINT "contact_submissions_trainerId_fkey"
  FOREIGN KEY ("trainerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "contact_submissions_trainerId_status_idx" ON "contact_submissions"("trainerId", "status");
