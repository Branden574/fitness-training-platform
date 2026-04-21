import 'server-only';

import { Resend } from 'resend';

const FROM = 'Martinez Fitness <noreply@noreplybrentmartinezfitness.com>';

function resendClient(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

function baseUrl(): string {
  return process.env.NEXTAUTH_URL || 'http://localhost:3000';
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

interface EmailShellOptions {
  eyebrow: string;
  title: string;
  bodyHtml: string;
  ctaLabel?: string;
  ctaHref?: string;
}

function renderShell({ eyebrow, title, bodyHtml, ctaLabel, ctaHref }: EmailShellOptions): string {
  const cta =
    ctaLabel && ctaHref
      ? `
        <div style="margin:32px 0;">
          <a href="${ctaHref}"
            style="display:inline-block;background:#FF4D1C;color:#0A0A0B;text-decoration:none;
                   font-family:Helvetica,Arial,sans-serif;font-weight:700;font-size:14px;
                   padding:14px 24px;border-radius:6px;letter-spacing:0.05em;text-transform:uppercase;">
            ${escapeHtml(ctaLabel)}
          </a>
        </div>`
      : '';

  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#0A0A0B;font-family:Helvetica,Arial,sans-serif;color:#F4F4F5;">
    <div style="max-width:560px;margin:0 auto;padding:32px 24px;">
      <div style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:0.15em;color:#6E6E76;text-transform:uppercase;margin-bottom:12px;">
        ${escapeHtml(eyebrow)}
      </div>
      <h1 style="font-size:28px;letter-spacing:-0.01em;line-height:1.1;text-transform:uppercase;margin:0 0 16px 0;">
        ${escapeHtml(title)}
      </h1>
      <div style="font-size:14px;line-height:1.6;color:#A1A1A6;">
        ${bodyHtml}
      </div>
      ${cta}
      <div style="margin-top:32px;padding-top:16px;border-top:1px solid #232327;
                  font-family:'Courier New',monospace;font-size:10px;letter-spacing:0.1em;
                  color:#6E6E76;text-transform:uppercase;">
        Martinez Fitness · martinezfitness559.com
      </div>
    </div>
  </body>
</html>`;
}

/** Best-effort send — logs + swallows errors so callers are always fire-and-forget. */
async function safeSend(args: {
  to: string;
  subject: string;
  html: string;
  tag: string;
}): Promise<void> {
  const resend = resendClient();
  if (!resend) {
    // Intentionally quiet in dev — missing RESEND_API_KEY is expected
    return;
  }
  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to: args.to,
      subject: args.subject,
      html: args.html,
      tags: [{ name: 'type', value: args.tag }],
    });
    if (error) {
      console.warn(`[email:${args.tag}] send failed:`, error);
    }
  } catch (e) {
    console.warn(`[email:${args.tag}] exception:`, e);
  }
}

// ──────────────────────────────────────────────────────────────────
// New message from coach/client
// ──────────────────────────────────────────────────────────────────
export async function sendNewMessageEmail(args: {
  toEmail: string;
  toName: string | null;
  fromName: string | null;
  fromRole: 'CLIENT' | 'TRAINER' | 'ADMIN';
  preview: string;
}): Promise<void> {
  const firstName = (args.toName ?? 'there').split(' ')[0]!;
  const sender = args.fromName ?? (args.fromRole === 'TRAINER' ? 'Your coach' : 'Your athlete');
  const ctaHref =
    args.fromRole === 'TRAINER'
      ? `${baseUrl()}/client/messages`
      : `${baseUrl()}/trainer/messages`;

  const preview = escapeHtml(args.preview.length > 240 ? `${args.preview.slice(0, 240)}…` : args.preview);

  await safeSend({
    to: args.toEmail,
    subject: `New message from ${sender}`,
    tag: 'new_message',
    html: renderShell({
      eyebrow: 'NEW MESSAGE',
      title: `${sender} sent you a note.`,
      bodyHtml: `
        <p style="margin:0 0 16px 0;">Hey ${escapeHtml(firstName)},</p>
        <div style="padding:16px;background:#141416;border:1px solid #232327;border-radius:6px;margin:16px 0;">
          <div style="font-style:italic;color:#F4F4F5;">${preview}</div>
        </div>
        <p style="margin:0;">Jump in and reply — the thread keeps the full workout context inline.</p>
      `,
      ctaLabel: 'Open messages',
      ctaHref,
    }),
  });
}

// ──────────────────────────────────────────────────────────────────
// Personal record
// ──────────────────────────────────────────────────────────────────
export async function sendPRAchievedEmail(args: {
  trainerEmail: string;
  trainerName: string | null;
  athleteName: string | null;
  exerciseName: string;
  newWeight: number;
  previousWeight: number | null;
  reps: number | null;
  clientId: string;
}): Promise<void> {
  const firstName = (args.trainerName ?? 'Coach').split(' ')[0]!;
  const delta =
    args.previousWeight != null
      ? `+${(args.newWeight - args.previousWeight).toFixed(1)} lb`
      : 'first recorded';
  const ctaHref = `${baseUrl()}/trainer/clients/${args.clientId}`;

  await safeSend({
    to: args.trainerEmail,
    subject: `PR — ${args.athleteName ?? 'Athlete'} hit ${args.newWeight} on ${args.exerciseName}`,
    tag: 'pr_achieved',
    html: renderShell({
      eyebrow: 'NEW PR',
      title: `${args.athleteName ?? 'An athlete'} just set a new record.`,
      bodyHtml: `
        <p style="margin:0 0 16px 0;">${escapeHtml(firstName)},</p>
        <div style="padding:20px;background:linear-gradient(180deg,rgba(255,77,28,0.08),transparent 60%);border:1px solid #FF4D1C;border-radius:8px;margin:16px 0;">
          <div style="font-family:Helvetica,Arial,sans-serif;font-weight:700;font-size:56px;color:#FF4D1C;line-height:1;">
            ${args.newWeight}
          </div>
          <div style="font-size:14px;margin-top:8px;text-transform:uppercase;letter-spacing:0.05em;">
            LB${args.reps != null ? ` × ${args.reps}` : ''} · ${escapeHtml(args.exerciseName)}
          </div>
          <div style="font-family:'Courier New',monospace;font-size:11px;color:#6E6E76;margin-top:8px;letter-spacing:0.1em;text-transform:uppercase;">
            ${delta.toUpperCase()}
          </div>
        </div>
        <p style="margin:0;">Solid lift. Consider flagging the next bump in their program.</p>
      `,
      ctaLabel: 'View athlete',
      ctaHref,
    }),
  });
}

// ──────────────────────────────────────────────────────────────────
// Program assigned (coach assigns a program template to a client)
// ──────────────────────────────────────────────────────────────────
export async function sendProgramAssignedEmail(args: {
  toEmail: string;
  toName: string | null;
  trainerName: string | null;
  programName: string;
  durationWks: number;
  startDate: Date;
  mealPlans: Array<{
    name: string;
    startWeek: number;
    endWeek: number | null;
    dailyCalorieTarget: number;
    dailyProteinTarget: number;
    dailyCarbTarget: number;
    dailyFatTarget: number;
  }>;
}): Promise<void> {
  const firstName = (args.toName ?? 'there').split(' ')[0]!;
  const coach = args.trainerName ?? 'Your coach';
  const startLabel = args.startDate.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  const ctaHref = `${baseUrl()}/client`;

  const mealPlansHtml =
    args.mealPlans.length === 0
      ? ''
      : `
        <div style="margin:20px 0 4px 0;font-family:'Courier New',monospace;font-size:10px;letter-spacing:0.15em;color:#6E6E76;text-transform:uppercase;">
          Nutrition · ${args.mealPlans.length} plan${args.mealPlans.length === 1 ? '' : 's'}
        </div>
        ${args.mealPlans
          .map((mp) => {
            const range =
              mp.endWeek != null
                ? `WK ${String(mp.startWeek).padStart(2, '0')}–${String(mp.endWeek).padStart(2, '0')}`
                : mp.startWeek > 1
                  ? `WK ${String(mp.startWeek).padStart(2, '0')}–END`
                  : 'WHOLE PROGRAM';
            return `
              <div style="padding:12px 14px;background:#141416;border:1px solid #232327;border-radius:6px;margin-top:8px;">
                <div style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:0.1em;color:#6E6E76;margin-bottom:4px;">
                  ${escapeHtml(range)}
                </div>
                <div style="font-weight:600;font-size:14px;margin-bottom:6px;">
                  ${escapeHtml(mp.name)}
                </div>
                <div style="font-family:'Courier New',monospace;font-size:11px;color:#A1A1A6;letter-spacing:0.05em;">
                  ${mp.dailyCalorieTarget.toLocaleString()} KCAL · ${mp.dailyProteinTarget}P · ${mp.dailyCarbTarget}C · ${mp.dailyFatTarget}F
                </div>
              </div>
            `;
          })
          .join('')}
      `;

  await safeSend({
    to: args.toEmail,
    subject: `${coach} assigned you a new program — ${args.programName}`,
    tag: 'program_assigned',
    html: renderShell({
      eyebrow: 'NEW PROGRAM',
      title: `${coach} assigned you ${args.programName}.`,
      bodyHtml: `
        <p style="margin:0 0 16px 0;">Hey ${escapeHtml(firstName)},</p>
        <div style="padding:16px;background:#141416;border:1px solid #232327;border-radius:6px;margin:16px 0;">
          <div style="font-weight:700;font-size:16px;margin-bottom:6px;">${escapeHtml(args.programName)}</div>
          <div style="font-family:'Courier New',monospace;font-size:11px;color:#6E6E76;letter-spacing:0.1em;text-transform:uppercase;">
            ${args.durationWks} WEEKS · STARTS ${escapeHtml(startLabel.toUpperCase())}
          </div>
        </div>
        ${mealPlansHtml}
        <p style="margin:20px 0 0 0;">Open the app when you're ready — your week 1 is waiting.</p>
      `,
      ctaLabel: 'Open program',
      ctaHref,
    }),
  });
}

// ──────────────────────────────────────────────────────────────────
// Appointment status change (approved / denied / cancelled)
// ──────────────────────────────────────────────────────────────────
export type AppointmentStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';

export async function sendAppointmentStatusEmail(args: {
  toEmail: string;
  toName: string | null;
  title: string;
  startTime: Date;
  status: AppointmentStatus;
  actorName: string | null;
  appointmentId: string;
  recipientRole?: 'CLIENT' | 'TRAINER' | 'ADMIN';
}): Promise<void> {
  const firstName = (args.toName ?? 'there').split(' ')[0]!;
  const when = args.startTime.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
  const eyebrow =
    args.status === 'APPROVED'
      ? 'APPOINTMENT APPROVED'
      : args.status === 'REJECTED'
        ? 'APPOINTMENT DECLINED'
        : args.status === 'CANCELLED'
          ? 'APPOINTMENT CANCELLED'
          : args.status === 'COMPLETED'
            ? 'APPOINTMENT COMPLETED'
            : args.status === 'NO_SHOW'
              ? 'MARKED NO-SHOW'
              : 'APPOINTMENT UPDATED';
  const titleLine =
    args.status === 'APPROVED'
      ? 'Your session is on the books.'
      : args.status === 'REJECTED'
        ? 'Your session request was declined.'
        : args.status === 'CANCELLED'
          ? 'Your session was cancelled.'
          : args.status === 'COMPLETED'
            ? 'Session logged as complete.'
            : args.status === 'NO_SHOW'
              ? 'Session marked as no-show.'
              : 'Appointment details changed.';
  const ctaHref =
    args.recipientRole === 'TRAINER'
      ? `${baseUrl()}/trainer/schedule`
      : `${baseUrl()}/client`;

  await safeSend({
    to: args.toEmail,
    subject: `${eyebrow.replace('_', ' ').replace(/^\w/, (c) => c.toUpperCase())} — ${args.title}`,
    tag: `appointment_${args.status.toLowerCase()}`,
    html: renderShell({
      eyebrow,
      title: titleLine,
      bodyHtml: `
        <p style="margin:0 0 16px 0;">Hey ${escapeHtml(firstName)},</p>
        <div style="padding:16px;background:#141416;border:1px solid #232327;border-radius:6px;margin:16px 0;">
          <div style="font-weight:600;margin-bottom:4px;">${escapeHtml(args.title)}</div>
          <div style="font-family:'Courier New',monospace;font-size:11px;color:#6E6E76;letter-spacing:0.1em;text-transform:uppercase;">
            ${escapeHtml(when)}
          </div>
        </div>
        <p style="margin:0;">${
          args.actorName
            ? `Updated by ${escapeHtml(args.actorName)}.`
            : 'See your dashboard for the latest.'
        }</p>
      `,
      ctaLabel: 'Open dashboard',
      ctaHref,
    }),
  });
}
