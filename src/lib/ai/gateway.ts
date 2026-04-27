// src/lib/ai/gateway.ts
//
// Single AI call surface for the platform. Wraps the Vercel AI Gateway via
// the `ai` SDK with three operational guarantees:
//   1. Hard 4-second timeout — no AI call ever blocks a user-facing path
//      indefinitely.
//   2. Feature-flag gate — AI_GATEWAY_ENABLED !== "true" short-circuits
//      every call to null without a network hop. Lets ops disable AI in
//      seconds without a redeploy.
//   3. Structured logging — failures are recorded with enough context to
//      diagnose from Railway logs alone.
//
// Returns null on disabled / timeout / error. Callers MUST treat null as
// the no-AI fallback path. The caller is responsible for choosing what to
// show or skip when AI is unavailable.

import 'server-only';
import { generateText } from 'ai';

export interface AICompletionInput {
  systemPrompt: string;
  userPrompt: string;
  /** Hard token cap on the model's output. Default 200. */
  maxOutputTokens?: number;
  /** Hard timeout in milliseconds. Default 4000. */
  timeoutMs?: number;
  /** Optional context for log lines — e.g. "summarizeWorkout sessionId=abc". */
  logContext?: string;
}

export interface AICompletionResult {
  text: string;
}

const DEFAULT_MODEL = 'anthropic/claude-haiku-4-5';

function modelString(): string {
  return process.env.AI_GATEWAY_MODEL || DEFAULT_MODEL;
}

function isEnabled(): boolean {
  return process.env.AI_GATEWAY_ENABLED === 'true';
}

export async function aiComplete(
  input: AICompletionInput,
): Promise<AICompletionResult | null> {
  if (!isEnabled()) return null;
  if (!process.env.AI_GATEWAY_API_KEY) {
    console.error('[ai/gateway] AI_GATEWAY_ENABLED=true but AI_GATEWAY_API_KEY is unset', input.logContext);
    return null;
  }

  const timeoutMs = input.timeoutMs ?? 4000;
  const maxOutputTokens = input.maxOutputTokens ?? 200;

  try {
    const res = await generateText({
      model: modelString(),
      system: input.systemPrompt,
      prompt: input.userPrompt,
      maxOutputTokens,
      abortSignal: AbortSignal.timeout(timeoutMs),
    });
    const text = (res.text ?? '').trim();
    if (!text) {
      console.error('[ai/gateway] empty response', input.logContext);
      return null;
    }
    return { text };
  } catch (err) {
    const name = err instanceof Error ? err.name : 'UnknownError';
    const message = err instanceof Error ? err.message : String(err);
    console.error(
      `[ai/gateway] failed (${name}): ${message}`,
      input.logContext ?? '',
    );
    return null;
  }
}
