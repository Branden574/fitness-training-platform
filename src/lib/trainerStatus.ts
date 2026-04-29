// src/lib/trainerStatus.ts
import type { TrainerClientStatus } from '@prisma/client';

export type TrainerStatus = TrainerClientStatus; // 'ACCEPTING' | 'WAITLIST' | 'NOT_ACCEPTING'

export const TRAINER_STATUSES: readonly TrainerStatus[] = [
  'ACCEPTING',
  'WAITLIST',
  'NOT_ACCEPTING',
] as const;

export const TRAINER_STATUS_LABELS: Record<TrainerStatus, string> = {
  ACCEPTING: 'Accepting',
  WAITLIST: 'Waitlist',
  NOT_ACCEPTING: 'Not accepting',
};

export const TRAINER_STATUS_DESCRIPTIONS: Record<TrainerStatus, string> = {
  ACCEPTING:
    'Your apply link shows the normal sign-up form.',
  WAITLIST:
    'Your apply link still works, but framed as joining your waitlist.',
  NOT_ACCEPTING:
    "Your apply form is hidden. Visitors can leave their email and we'll ping them when you flip back to Accepting or Waitlist.",
};

/** True if the apply page should render an apply-style form. */
export function statusShowsApplyForm(s: TrainerStatus): boolean {
  return s === 'ACCEPTING' || s === 'WAITLIST';
}

/** Mirror value for the legacy `trainerAcceptingClients` boolean. */
export function statusToLegacyBoolean(s: TrainerStatus): boolean {
  return s === 'ACCEPTING';
}

/** Backfill mapping from the legacy boolean. */
export function statusFromLegacyBoolean(b: boolean): TrainerStatus {
  return b ? 'ACCEPTING' : 'WAITLIST';
}

export function isTrainerStatus(v: unknown): v is TrainerStatus {
  return v === 'ACCEPTING' || v === 'WAITLIST' || v === 'NOT_ACCEPTING';
}
