// src/lib/ai/weeklyDigest.ts
//
// Generates a 1-line coach-voice analytical note about a client's full week
// of training. Same Haiku model and same coach voice as summarizeWorkout,
// but the input window is 7 days of signals — not a single session.

import 'server-only';
import { aiComplete } from './gateway';

export interface SummarizeClientWeekInput {
  clientName: string;
  workoutsCompleted: number;
  workoutsAssigned: number;
  prSummaries: string[];          // e.g. ["bench 145x6 (PR vs 135x8)"]
  regressionSummaries: string[];  // e.g. ["squat skipped Wednesday"]
  lastLoginIso: string | null;
  lastClientMessageIso: string | null;
  contextLogId?: string;
}

const SYSTEM_PROMPT = `You write a single coach-voice analytical note (≤120 chars) about a client's week of training. Highlight the most actionable pattern: missed sessions, PR streak, regression, engagement drop. No greetings, no encouragement, no emoji. Coach shorthand acceptable.`;

export async function summarizeClientWeek(
  input: SummarizeClientWeekInput,
): Promise<string> {
  const adherence = input.workoutsAssigned > 0
    ? Math.round((input.workoutsCompleted / input.workoutsAssigned) * 100)
    : null;

  const userPrompt = [
    `Client: ${input.clientName}`,
    `Workouts: ${input.workoutsCompleted} of ${input.workoutsAssigned} (${adherence ?? 'n/a'}% adherence)`,
    input.prSummaries.length > 0
      ? `PRs: ${input.prSummaries.join('; ')}`
      : 'PRs: none',
    input.regressionSummaries.length > 0
      ? `Regressions/misses: ${input.regressionSummaries.join('; ')}`
      : 'Regressions: none',
    `Last login: ${input.lastLoginIso ?? 'never'}`,
    `Last message from client: ${input.lastClientMessageIso ?? 'never'}`,
  ].join('\n');

  const result = await aiComplete({
    systemPrompt: SYSTEM_PROMPT,
    userPrompt,
    maxOutputTokens: 120,
    timeoutMs: 4000,
    logContext: `summarizeClientWeek ${input.contextLogId ?? input.clientName}`,
  });

  // Empty string is the explicit "no AI note" signal — caller renders empty.
  if (!result) return '';
  return result.text.slice(0, 120);
}
