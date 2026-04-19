export type CelebrationKind =
  | 'workout'
  | 'pr'
  | 'weight'
  | 'bodyfat'
  | 'mood'
  | 'sleep';

export type CelebrationIconKind =
  | 'trophy'
  | 'flame'
  | 'trending'
  | 'target'
  | 'star'
  | 'moon';

export interface CelebrationPreset {
  title: string;
  subtitle: string;
  bigNumber: string;
  bigLabel: string;
  icon: CelebrationIconKind;
  accent: string;
  stats: Array<[string, string]>;
  message: string;
}

export type CelebrationOverrides = Partial<CelebrationPreset>;

export const CELEBRATIONS: Record<CelebrationKind, CelebrationPreset> = {
  workout: {
    title: 'WORKOUT COMPLETE',
    subtitle: 'UPPER / PUSH · 52:18',
    bigNumber: '+3,420 LB',
    bigLabel: 'VOLUME',
    icon: 'trophy',
    accent: '#FF4D1C',
    stats: [
      ['SETS', '18'],
      ['PR SETS', '2'],
      ['AVG RPE', '7.8'],
      ['STREAK', '24'],
    ],
    message:
      "Biggest Upper/Push in 4 weeks. Coach was right — that +5lb worked.",
  },
  pr: {
    title: 'NEW PR',
    subtitle: 'BENCH PRESS · 245 × 5',
    bigNumber: '+5',
    bigLabel: 'LB FROM LAST',
    icon: 'flame',
    accent: '#FF4D1C',
    stats: [
      ['E1RM', '283'],
      ['PREV', '240 × 5'],
      ['RPE', '8'],
      ['MONTH', 'APR 17'],
    ],
    message:
      "Moved 245 for 5 at RPE 8 — room for more. 7th PR in this block.",
  },
  weight: {
    title: 'WEIGHT MILESTONE',
    subtitle: 'BODY WEIGHT · 181.2 LB',
    bigNumber: '−5.8',
    bigLabel: 'LB IN 6 WK',
    icon: 'trending',
    accent: '#2BD985',
    stats: [
      ['START', '187.0 LB'],
      ['TARGET', '175 LB'],
      ['RATE', '−0.97/WK'],
      ['STREAK', '42 DAYS'],
    ],
    message:
      "Right in the lean-recomp window. Keep protein at 185g, don't cut more.",
  },
  bodyfat: {
    title: 'BODY FAT MILESTONE',
    subtitle: 'DEXA SCAN · 13.4%',
    bigNumber: '−2.1',
    bigLabel: '% IN 8 WK',
    icon: 'target',
    accent: '#2BD985',
    stats: [
      ['START', '15.5%'],
      ['LEAN MASS', '+1.2 LB'],
      ['FAT LOST', '−4.6 LB'],
      ['PHASE', 'P2 · WK 8'],
    ],
    message:
      "Textbook recomp — lean mass up while fat dropped. Rare and real.",
  },
  mood: {
    title: 'MOOD STREAK',
    subtitle: 'DAILY CHECK-IN · 14 DAYS',
    bigNumber: '4.6',
    bigLabel: 'AVG / 5',
    icon: 'star',
    accent: '#F5C14E',
    stats: [
      ['STREAK', '14 DAYS'],
      ['ENERGY', '4.8'],
      ['FOCUS', '4.5'],
      ['BEST', 'TUE 4/15'],
    ],
    message:
      "Two-week streak of high-mood days — your sleep window is locked in.",
  },
  sleep: {
    title: 'SLEEP MILESTONE',
    subtitle: '7-DAY AVG · 7h 48m',
    bigNumber: '+42',
    bigLabel: 'MIN VS BASELINE',
    icon: 'moon',
    accent: '#6A7FDC',
    stats: [
      ['BEDTIME', '22:34'],
      ['DEEP', '1h 54m'],
      ['REM', '1h 38m'],
      ['CONSISTENCY', '92%'],
    ],
    message:
      "Your recovery scores are finally catching up. Hard work showing up.",
  },
};
