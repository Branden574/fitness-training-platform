'use client';

import { useEffect, useState } from 'react';

type Phase = 0 | 1 | 2 | 3;
type Message = [durationMs: number, label: string, percent: number];

interface Props {
  onDone?: () => void;
  messages?: Message[];
}

const DEFAULT_MESSAGES: Message[] = [
  [120, 'INITIALIZING', 0],
  [340, 'CALIBRATING · HRV MONITOR', 18],
  [340, 'LOADING · PROGRAM · WK 9/12', 42],
  [280, 'SYNCING · 127 EXERCISES', 68],
  [260, 'READY · MARTINEZ FITNESS', 100],
];

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

export function BootLoader({ onDone, messages = DEFAULT_MESSAGES }: Props) {
  const [phase, setPhase] = useState<Phase>(0);
  const [pct, setPct] = useState(0);
  const [msg, setMsg] = useState('INITIALIZING');

  useEffect(() => {
    if (prefersReducedMotion()) {
      const t = setTimeout(() => onDone?.(), 100);
      return () => clearTimeout(t);
    }

    let cancelled = false;
    (async () => {
      setPhase(1);
      for (const [d, m, p] of messages) {
        if (cancelled) return;
        setMsg(m);
        setPct(p);
        await new Promise((r) => setTimeout(r, d));
      }
      if (cancelled) return;
      setPhase(2);
      await new Promise((r) => setTimeout(r, 180));
      if (cancelled) return;
      setPhase(3);
      await new Promise((r) => setTimeout(r, 420));
      if (cancelled) return;
      onDone?.();
    })();
    return () => {
      cancelled = true;
    };
  }, [messages, onDone]);

  const bars = 36;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: '#0A0A0B',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: phase === 3 ? 0 : 1,
        transition: 'opacity .4s ease',
        pointerEvents: phase === 3 ? 'none' : 'auto',
      }}
    >
      <div style={{ position: 'relative', width: 360, height: 360 }}>
        {Array.from({ length: bars }).map((_, i) => {
          const deg = (i / bars) * 360;
          const lit = (i / bars) * 100 <= pct;
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                width: 2,
                height: 22,
                transform: `translate(-50%,-50%) rotate(${deg}deg) translateY(-130px)`,
                background: lit ? '#FF4D1C' : '#1F1F22',
                transition: `background .25s ease ${i * 8}ms, height .25s ease`,
                boxShadow: lit ? '0 0 8px rgba(255,77,28,0.7)' : 'none',
                borderRadius: 1,
              }}
            />
          );
        })}

        <svg
          viewBox="0 0 360 360"
          style={{
            position: 'absolute',
            inset: 0,
            animation: phase < 2 ? 'mfSpin 2.4s linear infinite' : 'none',
            opacity: phase === 2 ? 0 : 0.9,
          }}
        >
          <circle
            cx="180"
            cy="180"
            r="100"
            fill="none"
            stroke="url(#arcG)"
            strokeWidth="1.5"
            strokeDasharray="30 628"
            strokeLinecap="round"
          />
          <defs>
            <linearGradient id="arcG" x1="0" x2="1">
              <stop offset="0%" stopColor="#FF4D1C" stopOpacity="0" />
              <stop offset="100%" stopColor="#FF4D1C" />
            </linearGradient>
          </defs>
        </svg>

        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              display: 'grid',
              placeItems: 'center',
              background: '#FF4D1C',
              borderRadius: 4,
              transform: phase === 2 ? 'scale(1.15)' : 'scale(1)',
              transition: 'transform .3s ease',
              boxShadow:
                phase === 2
                  ? '0 0 80px rgba(255,77,28,0.6)'
                  : '0 0 30px rgba(255,77,28,0.3)',
            }}
          >
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#0A0A0B"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M6.5 6.5 17.5 17.5" />
              <path d="M21 21l-1-1" />
              <path d="M3 3l1 1" />
              <path d="M18 22l4-4" />
              <path d="M2 6l4-4" />
              <path d="m7 13-2 2 3 3 2-2" />
              <path d="m17 11 2-2-3-3-2 2" />
            </svg>
          </div>
          <div
            style={{
              fontFamily: 'var(--font-display), sans-serif',
              color: '#F4F4F5',
              fontSize: 26,
              letterSpacing: '.08em',
              fontWeight: 600,
              marginTop: 6,
            }}
          >
            MARTINEZ FITNESS
          </div>
          <div
            style={{
              fontFamily: 'var(--font-mf-mono), monospace',
              fontSize: 10,
              color: '#FF4D1C',
              letterSpacing: '.2em',
            }}
          >
            {msg}
          </div>
          <div
            style={{
              width: 180,
              height: 2,
              background: '#1F1F22',
              borderRadius: 1,
              overflow: 'hidden',
              marginTop: 6,
            }}
          >
            <div
              style={{
                width: `${pct}%`,
                height: '100%',
                background: '#FF4D1C',
                transition: 'width .3s ease',
                boxShadow: '0 0 8px rgba(255,77,28,0.7)',
              }}
            />
          </div>
          <div
            style={{
              fontFamily: 'var(--font-mf-mono), monospace',
              fontSize: 9,
              color: '#86868B',
              letterSpacing: '.2em',
              marginTop: 2,
            }}
          >
            {String(pct).padStart(3, '0')} / 100
          </div>
        </div>
      </div>

      {phase === 2 && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(circle, rgba(255,77,28,0.25), transparent 60%)',
            animation: 'mfPulse .6s ease-out',
          }}
        />
      )}

      <style jsx>{`
        @keyframes mfSpin {
          to {
            transform: rotate(360deg);
          }
        }
        @keyframes mfPulse {
          0% {
            opacity: 0;
          }
          40% {
            opacity: 1;
          }
          100% {
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
