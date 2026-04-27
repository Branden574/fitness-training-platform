// src/lib/email/weeklyDigestTemplate.ts
//
// Email template + sender for the weekly trainer digest. Mirrors the
// pattern in src/lib/email.ts (transactional, fail-open). The dashboard
// widget renders the same payload — this template is the email mirror.

import 'server-only';
import type { WeeklyDigestPayload } from '@/lib/digest/buildDigestPayload';

export interface SendWeeklyDigestEmailInput {
  toEmail: string;
  toName: string | null;
  payload: WeeklyDigestPayload;
  appUrl: string;
}

function plainText(input: SendWeeklyDigestEmailInput): string {
  const lines: string[] = [];
  lines.push(`Weekly digest · ${input.payload.clients.length} clients · week of ${input.payload.weekStartIso}`);
  lines.push('');
  lines.push(`Open dashboard: ${input.appUrl}/trainer/dashboard`);
  lines.push('');
  for (const c of input.payload.clients) {
    lines.push(`— ${c.clientName} —`);
    lines.push(`Workouts: ${c.workoutsCompleted}/${c.workoutsAssigned} (${c.adherencePct}%)`);
    if (c.prsThisWeek.length > 0) {
      lines.push(`PRs: ${c.prsThisWeek.map((p) => `${p.exerciseName} ${p.achievement}`).join(', ')}`);
    }
    if (c.regressions.length > 0) {
      lines.push(`Regressions: ${c.regressions.map((r) => r.note).join(', ')}`);
    }
    if (c.aiNote) lines.push(`Coach AI: ${c.aiNote}`);
    lines.push('');
  }
  return lines.join('\n');
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function htmlBody(input: SendWeeklyDigestEmailInput): string {
  const sections = input.payload.clients
    .map(
      (c) => `
    <div style="margin: 24px 0; padding: 16px; border: 1px solid #2a2a2a; border-radius: 8px; background: #111;">
      <h3 style="margin: 0 0 8px; color: #fff; font-family: sans-serif;">${escapeHtml(c.clientName)}</h3>
      <div style="color: #aaa; font-family: monospace; font-size: 12px; margin-bottom: 8px;">
        ${c.workoutsCompleted}/${c.workoutsAssigned} workouts · ${c.adherencePct}% adherence
      </div>
      ${c.prsThisWeek.length > 0
        ? `<div style="color: #4ade80; font-size: 13px; margin: 4px 0;">PRs: ${c.prsThisWeek.map((p) => `${escapeHtml(p.exerciseName)} ${escapeHtml(p.achievement)}`).join(', ')}</div>`
        : ''}
      ${c.regressions.length > 0
        ? `<div style="color: #f87171; font-size: 13px; margin: 4px 0;">Regressions: ${c.regressions.map((r) => escapeHtml(r.note)).join(', ')}</div>`
        : ''}
      ${c.aiNote
        ? `<div style="color: #d4d4d4; font-style: italic; margin-top: 8px; font-family: sans-serif; font-size: 13px;">${escapeHtml(c.aiNote)}</div>`
        : ''}
    </div>`,
    )
    .join('');

  return `<!DOCTYPE html>
<html>
<body style="background: #0a0a0a; color: #fff; font-family: sans-serif; padding: 24px;">
  <h2 style="margin: 0 0 8px;">Weekly digest</h2>
  <div style="color: #aaa; margin-bottom: 24px;">
    ${input.payload.clients.length} clients · week of ${input.payload.weekStartIso}
  </div>
  <a href="${input.appUrl}/trainer/dashboard" style="color: #fb923c; text-decoration: none;">Open dashboard →</a>
  ${sections}
</body>
</html>`;
}

/**
 * Sends the weekly digest email. Fail-open: any error logged but never
 * thrown, mirroring sendNewMessageEmail in src/lib/email.ts.
 */
export async function sendWeeklyDigestEmail(
  input: SendWeeklyDigestEmailInput,
): Promise<void> {
  try {
    const { sendRawEmail } = await import('@/lib/email');
    await sendRawEmail({
      toEmail: input.toEmail,
      toName: input.toName,
      subject: `Weekly digest · ${input.payload.clients.length} clients · week of ${input.payload.weekStartIso}`,
      html: htmlBody(input),
      text: plainText(input),
    });
  } catch (err) {
    console.error('[email/weeklyDigest] send failed', err);
  }
}
