-- Drop the unique constraint on WorkoutSession that prevented a user from ever
-- repeating the same workout. The app already handles duplicate-session detection
-- via createdAt ranges, and the constraint was a latent data-corruption footgun.
DROP INDEX IF EXISTS "workout_sessions_workoutId_userId_key";

-- Composite index that serves the (userId, workoutId, startTime) lookup pattern
-- the app uses when reading recent sessions for a client.
CREATE INDEX IF NOT EXISTS "workout_sessions_userId_workoutId_startTime_idx"
  ON "workout_sessions" ("userId", "workoutId", "startTime");

-- Composite index for PR detection: finds max weight per (user, exercise)
-- without scanning all rows for either the user or the exercise.
CREATE INDEX IF NOT EXISTS "workout_progress_userId_exerciseId_idx"
  ON "workout_progress" ("userId", "exerciseId");
