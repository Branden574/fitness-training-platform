-- DB-M2: Exercise.name @unique deferred — production has duplicate exercise
-- names and `prisma db push` refuses to apply the constraint without explicit
-- data-loss acknowledgement. A dedicated follow-up migration will handle the
-- dedupe + unique separately so it's an intentional, reviewed change.
-- (The dedupe SQL is preserved in git history at commit 0c4dfd4 if needed.)

-- DB-M3: Drop the unique constraint that prevented the same exercise from
-- appearing twice in a workout (legitimate pattern: warm-up + working sets).
-- Replace with non-unique indexes for lookup performance.
DROP INDEX IF EXISTS "workout_exercises_workoutId_exerciseId_key";
CREATE INDEX IF NOT EXISTS "workout_exercises_workoutId_idx" ON "workout_exercises"("workoutId");
CREATE INDEX IF NOT EXISTS "workout_exercises_exerciseId_idx" ON "workout_exercises"("exerciseId");

-- DB-M4: Add ON DELETE CASCADE on user FKs so deleting a user actually succeeds
-- instead of erroring on restrict. Drop the existing FKs first, then re-add with
-- CASCADE.

-- food_entries.userId
ALTER TABLE "food_entries" DROP CONSTRAINT IF EXISTS "food_entries_userId_fkey";
ALTER TABLE "food_entries"
  ADD CONSTRAINT "food_entries_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- workout_progress.userId + workoutSessionId
ALTER TABLE "workout_progress" DROP CONSTRAINT IF EXISTS "workout_progress_userId_fkey";
ALTER TABLE "workout_progress"
  ADD CONSTRAINT "workout_progress_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "workout_progress" DROP CONSTRAINT IF EXISTS "workout_progress_workoutSessionId_fkey";
ALTER TABLE "workout_progress"
  ADD CONSTRAINT "workout_progress_workoutSessionId_fkey"
  FOREIGN KEY ("workoutSessionId") REFERENCES "workout_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- progress_entries.userId
ALTER TABLE "progress_entries" DROP CONSTRAINT IF EXISTS "progress_entries_userId_fkey";
ALTER TABLE "progress_entries"
  ADD CONSTRAINT "progress_entries_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- messages.senderId + receiverId
ALTER TABLE "messages" DROP CONSTRAINT IF EXISTS "messages_senderId_fkey";
ALTER TABLE "messages"
  ADD CONSTRAINT "messages_senderId_fkey"
  FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "messages" DROP CONSTRAINT IF EXISTS "messages_receiverId_fkey";
ALTER TABLE "messages"
  ADD CONSTRAINT "messages_receiverId_fkey"
  FOREIGN KEY ("receiverId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Composite index for unread-count lookup (messages where receiverId=X AND read=false)
CREATE INDEX IF NOT EXISTS "messages_receiverId_read_idx" ON "messages"("receiverId", "read");

-- notifications.userId
ALTER TABLE "notifications" DROP CONSTRAINT IF EXISTS "notifications_userId_fkey";
ALTER TABLE "notifications"
  ADD CONSTRAINT "notifications_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
