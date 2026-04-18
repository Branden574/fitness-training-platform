-- V4 Phase 8: Program builder, coach notes, feature flags, subscriptions.
-- All additive. No existing table is altered.

-- CreateEnum
CREATE TYPE "DayOfWeek" AS ENUM ('MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN');

-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "NoteContext" AS ENUM ('GENERAL', 'TRAINING', 'NUTRITION', 'PROGRESS');

-- CreateTable
CREATE TABLE "programs" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "goal" TEXT,
    "durationWks" INTEGER NOT NULL,
    "isTemplate" BOOLEAN NOT NULL DEFAULT false,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "programs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "program_weeks" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "name" TEXT,
    "notes" TEXT,

    CONSTRAINT "program_weeks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "program_days" (
    "id" TEXT NOT NULL,
    "programWeekId" TEXT NOT NULL,
    "dayOfWeek" "DayOfWeek" NOT NULL,
    "sessionType" TEXT NOT NULL,
    "notes" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "program_days_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "program_day_exercises" (
    "id" TEXT NOT NULL,
    "programDayId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "sets" INTEGER NOT NULL,
    "repsScheme" TEXT NOT NULL,
    "targetWeight" TEXT,
    "restSeconds" INTEGER,
    "tempo" TEXT,
    "notes" TEXT,

    CONSTRAINT "program_day_exercises_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "program_assignments" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "assignedById" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "currentWeek" INTEGER NOT NULL DEFAULT 1,
    "status" "AssignmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "program_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coach_notes" (
    "id" TEXT NOT NULL,
    "trainerId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "context" "NoteContext" NOT NULL DEFAULT 'GENERAL',
    "contextId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coach_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feature_flags" (
    "key" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "feature_flags_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "stripePriceId" TEXT,
    "plan" TEXT,
    "status" TEXT,
    "currentPeriodEnd" TIMESTAMP(3),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "programs_createdById_idx" ON "programs"("createdById");
CREATE INDEX "programs_isTemplate_idx" ON "programs"("isTemplate");
CREATE INDEX "programs_archived_idx" ON "programs"("archived");

-- CreateIndex
CREATE INDEX "program_weeks_programId_idx" ON "program_weeks"("programId");
CREATE UNIQUE INDEX "program_weeks_programId_weekNumber_key" ON "program_weeks"("programId", "weekNumber");

-- CreateIndex
CREATE INDEX "program_days_programWeekId_idx" ON "program_days"("programWeekId");

-- CreateIndex
CREATE INDEX "program_day_exercises_programDayId_idx" ON "program_day_exercises"("programDayId");
CREATE INDEX "program_day_exercises_exerciseId_idx" ON "program_day_exercises"("exerciseId");

-- CreateIndex
CREATE INDEX "program_assignments_clientId_idx" ON "program_assignments"("clientId");
CREATE INDEX "program_assignments_assignedById_idx" ON "program_assignments"("assignedById");
CREATE INDEX "program_assignments_programId_idx" ON "program_assignments"("programId");
CREATE INDEX "program_assignments_status_idx" ON "program_assignments"("status");

-- CreateIndex
CREATE INDEX "coach_notes_trainerId_idx" ON "coach_notes"("trainerId");
CREATE INDEX "coach_notes_clientId_idx" ON "coach_notes"("clientId");
CREATE INDEX "coach_notes_createdAt_idx" ON "coach_notes"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_userId_key" ON "subscriptions"("userId");
CREATE UNIQUE INDEX "subscriptions_stripeCustomerId_key" ON "subscriptions"("stripeCustomerId");
CREATE UNIQUE INDEX "subscriptions_stripeSubscriptionId_key" ON "subscriptions"("stripeSubscriptionId");
CREATE INDEX "subscriptions_stripeCustomerId_idx" ON "subscriptions"("stripeCustomerId");
CREATE INDEX "subscriptions_status_idx" ON "subscriptions"("status");

-- AddForeignKey
ALTER TABLE "programs" ADD CONSTRAINT "programs_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_weeks" ADD CONSTRAINT "program_weeks_programId_fkey" FOREIGN KEY ("programId") REFERENCES "programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_days" ADD CONSTRAINT "program_days_programWeekId_fkey" FOREIGN KEY ("programWeekId") REFERENCES "program_weeks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_day_exercises" ADD CONSTRAINT "program_day_exercises_programDayId_fkey" FOREIGN KEY ("programDayId") REFERENCES "program_days"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "program_day_exercises" ADD CONSTRAINT "program_day_exercises_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "exercises"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_assignments" ADD CONSTRAINT "program_assignments_programId_fkey" FOREIGN KEY ("programId") REFERENCES "programs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "program_assignments" ADD CONSTRAINT "program_assignments_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "program_assignments" ADD CONSTRAINT "program_assignments_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coach_notes" ADD CONSTRAINT "coach_notes_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "coach_notes" ADD CONSTRAINT "coach_notes_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Seed default feature flags (idempotent)
INSERT INTO "feature_flags" ("key", "enabled", "description", "updatedAt") VALUES
  ('active_workout_v4',     true,  'Per-set RPE logging + rest timer',                   NOW()),
  ('client_messages_sse',   true,  'Server-sent events push for the message thread',     NOW()),
  ('food_search_usda',      true,  'USDA FoodData Central search',                       NOW()),
  ('food_search_off',       true,  'Open Food Facts search',                             NOW()),
  ('barcode_scanner',       true,  'Quagga2 barcode scanner in the food drawer',         NOW()),
  ('program_builder',       true,  'Program / ProgramWeek / ProgramDay schema + builder', NOW()),
  ('stripe_subscriptions',  false, 'Subscription plans (Self-led / Coached / Team)',     NOW()),
  ('pr_detection',          true,  'Auto-compute PR timeline from set logs',             NOW())
ON CONFLICT ("key") DO NOTHING;
