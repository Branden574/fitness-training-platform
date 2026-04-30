// src/lib/intake.ts
// Formatters and label maps for ContactSubmission's expanded intake fields.
// Used by the trainer applications inbox + future client-detail surfaces.

export type PrimaryGoal =
  | 'LOSE_FAT'
  | 'BUILD_MUSCLE'
  | 'GET_STRONGER'
  | 'SPORT_SPECIFIC'
  | 'GENERAL_HEALTH'
  | 'OTHER';

export type TrainingExperience = 'NONE' | 'SOME' | 'INTERMEDIATE' | 'ADVANCED';

export const PRIMARY_GOAL_LABEL: Record<PrimaryGoal, string> = {
  LOSE_FAT: 'Lose fat',
  BUILD_MUSCLE: 'Build muscle',
  GET_STRONGER: 'Get stronger',
  SPORT_SPECIFIC: 'Sport-specific',
  GENERAL_HEALTH: 'General health',
  OTHER: 'Other',
};

export const TRAINING_EXPERIENCE_LABEL: Record<TrainingExperience, string> = {
  NONE: 'New to lifting',
  SOME: 'Some experience',
  INTERMEDIATE: 'Intermediate',
  ADVANCED: 'Advanced',
};

export function humanizePrimaryGoal(value: string | null | undefined): string {
  if (!value) return '—';
  return PRIMARY_GOAL_LABEL[value as PrimaryGoal] ?? value;
}

export function humanizeTrainingExperience(
  value: string | null | undefined,
): string {
  if (!value) return '—';
  return TRAINING_EXPERIENCE_LABEL[value as TrainingExperience] ?? value;
}

/** Format total inches as `Xʹ Yʺ` using straight quotes for monospace look. */
export function formatHeightInches(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—';
  const ft = Math.floor(value / 12);
  const inch = value - ft * 12;
  return `${ft}'${inch}"`;
}

/** Format pounds with up to one decimal place, trimming trailing `.0`. */
export function formatWeightLb(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—';
  const rounded = Math.round(value * 10) / 10;
  return `${rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1)} lb`;
}
