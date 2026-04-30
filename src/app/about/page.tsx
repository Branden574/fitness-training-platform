import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

function BrandMark({ size = 28 }: { size?: number }) {
  return (
    <div
      className="grid place-items-center shrink-0"
      style={{ width: size, height: size, background: 'var(--mf-accent)', borderRadius: 4 }}
    >
      <svg
        width={size * 0.57}
        height={size * 0.57}
        viewBox="0 0 24 24"
        fill="none"
        stroke="#0A0A0B"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M6.5 6.5 17.5 17.5" />
        <path d="m7 13-2 2 3 3 2-2" />
        <path d="m17 11 2-2-3-3-2 2" />
      </svg>
    </div>
  );
}

export const metadata = {
  title: 'About · RepLab',
  description:
    'RepLab is a coaching platform built for independent trainers and the people they coach.',
};

export default function AboutPage() {
  return (
    <main className="mf-bg">
      <section
        className="max-w-[960px] mx-auto px-6"
        style={{ paddingTop: 96, paddingBottom: 64 }}
      >
        <div className="mf-eyebrow" style={{ marginBottom: 16 }}>
          ABOUT
        </div>
        <h1
          className="mf-font-display"
          style={{
            fontSize: 'clamp(36px, 6vw, 64px)',
            lineHeight: 1.05,
            letterSpacing: '-0.02em',
            marginBottom: 24,
          }}
        >
          Built for trainers and the people they coach.
        </h1>
        <p
          className="mf-fg-dim"
          style={{ fontSize: 18, lineHeight: 1.6, maxWidth: 680 }}
        >
          RepLab is a coaching platform for independent trainers — the
          ones running their business out of a notebook, group chat, and
          three different apps. We give them one place to program, track,
          message, and bill, so they can spend time on coaching instead of
          logistics.
        </p>
      </section>

      <section
        style={{
          borderTop: '1px solid var(--mf-hairline)',
          borderBottom: '1px solid var(--mf-hairline)',
        }}
      >
        <div
          className="max-w-[960px] mx-auto px-6"
          style={{
            paddingTop: 64,
            paddingBottom: 64,
            display: 'grid',
            gap: 48,
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          }}
        >
          <Pillar
            eyebrow="FOR TRAINERS"
            title="Run your business in one place."
            body="Programming, nutrition plans, scheduling, payments, and direct messaging — all in one workspace, branded to you. Bring your existing clients with a personal apply link, or get matched with new ones from the trainer directory."
          />
          <Pillar
            eyebrow="FOR ATHLETES"
            title="Train with the best."
            body="Apply to a trainer, log your sessions, watch form videos, see your progress, and message your coach when something feels off. RepLab is the same workspace your trainer uses — no app-switching, no spreadsheets."
          />
          <Pillar
            eyebrow="THE STACK"
            title="Native web + iOS + Android."
            body="One codebase that ships to the browser, the App Store, and Google Play. Push notifications, biometric sign-in, offline workout logging, photo + voice attachments — built for the gym floor, not the desk."
          />
        </div>
      </section>

      <section
        className="max-w-[960px] mx-auto px-6"
        style={{ paddingTop: 96, paddingBottom: 96 }}
      >
        <div className="mf-eyebrow" style={{ marginBottom: 16 }}>
          STORY
        </div>
        <h2
          className="mf-font-display"
          style={{
            fontSize: 'clamp(28px, 4vw, 40px)',
            lineHeight: 1.15,
            letterSpacing: '-0.01em',
            marginBottom: 24,
          }}
        >
          Built in Fresno. Founded 2024.
        </h2>
        <p
          className="mf-fg-dim"
          style={{ fontSize: 16, lineHeight: 1.7, marginBottom: 16 }}
        >
          RepLab started as the toolset Brent Martinez (NASM-CPT, ten
          years coaching) wished he had — a single app that could
          handle programming, nutrition, scheduling, and client
          communication without the duct tape.
        </p>
        <p
          className="mf-fg-dim"
          style={{ fontSize: 16, lineHeight: 1.7, marginBottom: 16 }}
        >
          Co-founded with Branden Vincent-Walker on the engineering
          side, the platform now serves trainers and the athletes they
          coach across the country. Independent, bootstrapped, and built
          for the long haul.
        </p>
      </section>

      <section
        style={{
          borderTop: '1px solid var(--mf-hairline)',
        }}
      >
        <div
          className="max-w-[960px] mx-auto px-6 flex flex-wrap items-center justify-between gap-6"
          style={{ paddingTop: 64, paddingBottom: 96 }}
        >
          <div className="flex items-center gap-3">
            <BrandMark size={32} />
            <div>
              <div
                className="mf-font-display"
                style={{ fontSize: 18, lineHeight: 1.1 }}
              >
                Train with the best.
              </div>
              <div
                className="mf-fg-mute"
                style={{ fontSize: 12, marginTop: 4 }}
              >
                Apply to a trainer · Become a trainer
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/apply"
              className="mf-btn mf-btn-primary"
              style={{
                height: 44,
                padding: '0 20px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <ArrowRight size={16} aria-hidden />
              Apply
            </Link>
            <Link
              href="/for-trainers/signup"
              className="mf-btn"
              style={{
                height: 44,
                padding: '0 20px',
                display: 'inline-flex',
                alignItems: 'center',
              }}
            >
              Become a trainer
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

function Pillar({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body: string;
}) {
  return (
    <div>
      <div className="mf-eyebrow" style={{ marginBottom: 8 }}>
        {eyebrow}
      </div>
      <h3
        className="mf-font-display"
        style={{
          fontSize: 22,
          lineHeight: 1.2,
          letterSpacing: '-0.005em',
          marginBottom: 12,
        }}
      >
        {title}
      </h3>
      <p
        className="mf-fg-dim"
        style={{ fontSize: 14, lineHeight: 1.6 }}
      >
        {body}
      </p>
    </div>
  );
}
