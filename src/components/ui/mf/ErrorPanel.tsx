'use client';

import Link from 'next/link';
import { RotateCw, Home } from 'lucide-react';
import Btn from './Btn';

export interface ErrorPanelProps {
  title?: string;
  message?: string;
  digest?: string;
  onRetry?: () => void;
  homeHref?: string;
  homeLabel?: string;
  variant?: 'mobile' | 'desktop';
}

export default function ErrorPanel({
  title = 'Something went sideways.',
  message,
  digest,
  onRetry,
  homeHref = '/',
  homeLabel = 'Go home',
  variant = 'desktop',
}: ErrorPanelProps) {
  const isMobile = variant === 'mobile';
  return (
    <div
      data-mf
      className="mf-bg mf-fg"
      style={{
        minHeight: isMobile ? '80vh' : '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        className="mf-card-elev"
        style={{
          maxWidth: 480,
          width: '100%',
          padding: 32,
          textAlign: 'center',
        }}
      >
        <div className="mf-eyebrow" style={{ marginBottom: 12, color: 'var(--mf-red)' }}>
          ERROR
        </div>
        <div
          className="mf-font-display"
          style={{
            fontSize: 28,
            lineHeight: 1.1,
            letterSpacing: '-0.01em',
            textTransform: 'uppercase',
            marginBottom: 12,
          }}
        >
          {title}
        </div>
        {message ? (
          <p className="mf-fg-dim" style={{ fontSize: 14, lineHeight: 1.6, marginBottom: 16 }}>
            {message}
          </p>
        ) : null}
        {digest ? (
          <div
            className="mf-font-mono mf-fg-mute"
            style={{
              fontSize: 10,
              letterSpacing: '0.1em',
              marginBottom: 24,
              padding: '6px 10px',
              border: '1px solid var(--mf-hairline)',
              borderRadius: 4,
              display: 'inline-block',
            }}
          >
            REF · {digest}
          </div>
        ) : null}
        <div className="flex items-center justify-center gap-2" style={{ marginTop: 8 }}>
          {onRetry ? (
            <Btn variant="primary" icon={RotateCw} onClick={onRetry}>
              Try again
            </Btn>
          ) : null}
          <Link href={homeHref}>
            <Btn icon={Home}>{homeLabel}</Btn>
          </Link>
        </div>
      </div>
    </div>
  );
}
