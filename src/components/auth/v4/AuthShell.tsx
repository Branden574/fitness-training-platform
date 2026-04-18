import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export interface AuthShellProps {
  title: string;
  eyebrow: string;
  footer?: string;
  showBack?: boolean;
  backHref?: string;
  children: ReactNode;
}

function BrandMark() {
  return (
    <div
      className="grid place-items-center shrink-0"
      style={{ width: 28, height: 28, background: 'var(--mf-accent)', borderRadius: 4 }}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#0A0A0B"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m7 13-2 2 3 3 2-2" />
        <path d="m17 11 2-2-3-3-2 2" />
      </svg>
    </div>
  );
}

export default function AuthShell({
  title,
  eyebrow,
  footer,
  showBack,
  backHref = '/',
  children,
}: AuthShellProps) {
  return (
    <div
      data-mf
      className="mf-bg mf-fg grid md:grid-cols-2"
      style={{ minHeight: '100vh' }}
    >
      {/* Form side */}
      <div
        className="flex items-center justify-center order-2 md:order-1"
        style={{ padding: '32px 48px' }}
      >
        <div className="w-full" style={{ maxWidth: 400 }}>
          <Link href="/" className="flex items-center gap-2" style={{ marginBottom: 40 }}>
            <BrandMark />
            <span
              className="mf-font-display"
              style={{
                fontSize: 18,
                fontWeight: 600,
                letterSpacing: '-0.01em',
              }}
            >
              MARTINEZ/FITNESS
            </span>
          </Link>

          {showBack && (
            <Link
              href={backHref}
              className="inline-flex items-center gap-1.5 mf-fg-dim hover:text-[color:var(--mf-fg)]"
              style={{ fontSize: 12, marginBottom: 24 }}
            >
              <ArrowLeft size={12} /> Back
            </Link>
          )}

          <div className="mf-eyebrow" style={{ marginBottom: 8 }}>{eyebrow}</div>
          <h1
            className="mf-font-display"
            style={{
              fontSize: 44,
              lineHeight: 0.95,
              letterSpacing: '-0.01em',
              textTransform: 'uppercase',
              marginBottom: 32,
            }}
          >
            {title}
          </h1>

          {children}
        </div>
      </div>

      {/* Scoreboard / visual side */}
      <div
        className="relative order-1 md:order-2 mf-s1"
        style={{
          height: 'auto',
          minHeight: 240,
          overflow: 'hidden',
        }}
      >
        {/* Duotone athlete placeholder fills the panel */}
        <div className="mf-duotone" style={{ position: 'absolute', inset: 0 }}>
          <div
            className="mf-ph-img"
            style={{ position: 'absolute', inset: 0 }}
          >
            <span style={{ position: 'relative', zIndex: 2 }}>HEAVY // FOCUSED</span>
          </div>
        </div>
        <div
          className="absolute inset-0 flex items-end"
          style={{ padding: 40, zIndex: 3 }}
        >
          <div>
            <div
              className="mf-eyebrow"
              style={{ color: 'rgba(255,255,255,0.6)', marginBottom: 12 }}
            >
              LIVE SCOREBOARD
            </div>
            <div
              className="mf-font-display"
              style={{
                fontSize: 'clamp(36px, 6vw, 72px)',
                lineHeight: 0.95,
                letterSpacing: '-0.01em',
                textTransform: 'uppercase',
                color: '#fff',
              }}
            >
              1,284 <span className="mf-accent">ATHLETES</span>
              <br />
              TRAINING RIGHT NOW.
            </div>
            <div
              className="mf-font-mono"
              style={{
                marginTop: 16,
                fontSize: 12,
                color: 'rgba(255,255,255,0.6)',
              }}
            >
              ▲ 42,180 SETS LOGGED THIS WEEK
            </div>
          </div>
        </div>
        {/* Corner marks */}
        {(
          [
            { top: 16, left: 16 },
            { top: 16, right: 16 },
            { bottom: 16, left: 16 },
            { bottom: 16, right: 16 },
          ] as const
        ).map((pos, i) => (
          <div
            key={i}
            className="mf-font-mono"
            style={{
              position: 'absolute',
              fontSize: 10,
              color: 'rgba(255,255,255,0.4)',
              ...pos,
              zIndex: 4,
            }}
          >
            +
          </div>
        ))}
      </div>

      {footer && (
        <div
          className="md:col-span-2 mf-font-mono mf-fg-mute order-3"
          style={{
            borderTop: '1px solid var(--mf-hairline)',
            padding: '16px 0',
            textAlign: 'center',
            fontSize: 11,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
          }}
        >
          {footer}
        </div>
      )}
    </div>
  );
}
