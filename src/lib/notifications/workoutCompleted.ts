// Pure builder for the WORKOUT_COMPLETED notification payload. Kept separate
// from the route handler so the copy can be tweaked in one place and so a
// unit test can be added later without touching the API surface.

export interface WorkoutCompletedInput {
  clientName: string | null;
  workoutTitle: string | null;
  completedSetCount: number;
  totalSetCount: number;
  durationMs: number;
  clientId: string;
}

export interface WorkoutCompletedPayload {
  title: string;
  body: string;
  actionUrl: string;
}

export function buildWorkoutCompletedNotification(
  input: WorkoutCompletedInput,
): WorkoutCompletedPayload {
  const name = input.clientName?.trim() || 'A client';
  const workout = input.workoutTitle?.trim() || 'a workout';
  const minutes = Math.floor(input.durationMs / 60000);
  const durationLabel = minutes < 1 ? '< 1' : String(minutes);

  return {
    title: name,
    body: `completed ${workout} • ${input.completedSetCount} of ${input.totalSetCount} sets • ${durationLabel} min`,
    actionUrl: `/trainer/clients/${input.clientId}`,
  };
}
