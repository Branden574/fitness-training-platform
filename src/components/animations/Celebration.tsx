'use client';

import { useEffect, useRef, useState } from 'react';
import type { CelebrationPreset } from './celebrations';
import { CelebrationIcon } from './CelebrationIcon';
import { Confetti } from './Confetti';

export interface CelebrationCoach {
  initials: string;
  firstName: string;
}

interface Props {
  preset: CelebrationPreset;
  onClose?: () => void;
  coach?: CelebrationCoach;
}

const DEFAULT_COACH: CelebrationCoach = { initials: 'BM', firstName: 'BRENT' };

export function Celebration({ preset, onClose, coach = DEFAULT_COACH }: Props) {
  const [show, setShow] = useState(false);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = requestAnimationFrame(() => setShow(true));
    });
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const handleClose = () => {
    setShow(false);
    setTimeout(() => onClose?.(), 260);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 8000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: show ? 'rgba(0,0,0,0.72)' : 'rgba(0,0,0,0)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        transition: 'background .25s ease',
      }}
      onClick={handleClose}
    >
      <Confetti accent={preset.accent} />

      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: 600,
          height: 600,
          transform: 'translate(-50%,-50%)',
          background: `radial-gradient(circle, ${preset.accent}25 0%, transparent 55%)`,
          opacity: show ? 1 : 0,
          transition: 'opacity .4s ease',
          pointerEvents: 'none',
        }}
      />

      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          zIndex: 3,
          width: 340,
          background: '#151518',
          border: `1px solid ${preset.accent}60`,
          borderRadius: 12,
          overflow: 'hidden',
          boxShadow: `0 40px 100px rgba(0,0,0,.7), 0 0 0 1px ${preset.accent}20, 0 0 60px ${preset.accent}30`,
          transform: show ? 'translateY(0) scale(1)' : 'translateY(20px) scale(.92)',
          opacity: show ? 1 : 0,
          transition:
            'transform .45s cubic-bezier(.2,.8,.2,1), opacity .3s ease',
        }}
      >
        <div
          style={{
            background: `linear-gradient(135deg, ${preset.accent} 0%, ${preset.accent}CC 100%)`,
            padding: '20px 22px',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              opacity: 0.15,
              backgroundImage:
                'repeating-linear-gradient(0deg, rgba(0,0,0,.4) 0 1px, transparent 1px 3px)',
              pointerEvents: 'none',
            }}
          />
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              position: 'relative',
            }}
          >
            <div
              style={{
                width: 58,
                height: 58,
                background: 'rgba(0,0,0,0.15)',
                borderRadius: 8,
                display: 'grid',
                placeItems: 'center',
                border: '2px solid rgba(0,0,0,0.2)',
                animation: show
                  ? 'mfBadge 1s cubic-bezier(.2,.8,.2,1) both'
                  : 'none',
              }}
            >
              <CelebrationIcon kind={preset.icon} color="#0A0A0B" />
            </div>
            <div>
              <div
                style={{
                  fontFamily: 'var(--font-mf-mono), monospace',
                  fontSize: 9,
                  letterSpacing: '.2em',
                  color: 'rgba(10,10,11,.7)',
                }}
              >
                ACHIEVEMENT · UNLOCKED
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-display), sans-serif',
                  fontSize: 22,
                  fontWeight: 600,
                  color: '#0A0A0B',
                  letterSpacing: '.02em',
                  lineHeight: 1.1,
                  marginTop: 2,
                }}
              >
                {preset.title}
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-mf-mono), monospace',
                  fontSize: 10,
                  color: 'rgba(10,10,11,.75)',
                  marginTop: 4,
                  letterSpacing: '.08em',
                }}
              >
                {preset.subtitle}
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            padding: '24px 22px 10px',
            textAlign: 'center',
            borderBottom: '1px solid #1F1F22',
            background: `radial-gradient(circle at 50% 0%, ${preset.accent}15, transparent 70%)`,
          }}
        >
          <div
            style={{
              fontFamily: 'var(--font-display), sans-serif',
              fontSize: 54,
              fontWeight: 700,
              color: preset.accent,
              lineHeight: 1,
              letterSpacing: '-.01em',
              textShadow: `0 0 30px ${preset.accent}60`,
              animation: show
                ? 'mfNumber .8s cubic-bezier(.2,.8,.2,1) .2s both'
                : 'none',
            }}
          >
            {preset.bigNumber}
          </div>
          <div
            style={{
              fontFamily: 'var(--font-mf-mono), monospace',
              fontSize: 10,
              color: '#86868B',
              letterSpacing: '.22em',
              marginTop: 6,
            }}
          >
            {preset.bigLabel}
          </div>
        </div>

        <div
          style={{
            padding: '12px 16px',
            display: 'grid',
            gridTemplateColumns: 'repeat(4,1fr)',
            gap: 4,
          }}
        >
          {preset.stats.map(([l, v], i) => (
            <div
              key={l}
              style={{
                padding: '8px 6px',
                textAlign: 'center',
                animation: show
                  ? `mfStat .5s ease ${0.4 + i * 0.08}s both`
                  : 'none',
              }}
            >
              <div
                style={{
                  fontFamily: 'var(--font-display), sans-serif',
                  fontSize: 15,
                  color: '#F4F4F5',
                  lineHeight: 1,
                  fontFeatureSettings: '"tnum"',
                }}
              >
                {v}
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-mf-mono), monospace',
                  fontSize: 8,
                  color: '#86868B',
                  letterSpacing: '.15em',
                  marginTop: 4,
                }}
              >
                {l}
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            padding: '12px 18px',
            borderTop: '1px solid #1F1F22',
            background: '#0E0E10',
            display: 'flex',
            gap: 10,
            alignItems: 'flex-start',
          }}
        >
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: 999,
              background: '#1F1F22',
              display: 'grid',
              placeItems: 'center',
              flexShrink: 0,
              fontFamily: 'var(--font-display), sans-serif',
              fontSize: 10,
              color: '#F4F4F5',
            }}
          >
            {coach.initials}
          </div>
          <div>
            <div
              style={{
                fontFamily: 'var(--font-mf-mono), monospace',
                fontSize: 8,
                color: '#86868B',
                letterSpacing: '.15em',
              }}
            >
              COACH {coach.firstName.toUpperCase()}
            </div>
            <div
              style={{
                fontSize: 12,
                color: '#D4D4D8',
                lineHeight: 1.4,
                marginTop: 2,
              }}
            >
              &ldquo;{preset.message}&rdquo;
            </div>
          </div>
        </div>

        <div
          style={{
            padding: 12,
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 8,
          }}
        >
          <button
            onClick={handleClose}
            style={{
              height: 38,
              background: '#1F1F22',
              color: '#D4D4D8',
              fontFamily: 'var(--font-mf-mono), monospace',
              fontSize: 10,
              letterSpacing: '.18em',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
            }}
          >
            DISMISS
          </button>
          <button
            onClick={handleClose}
            style={{
              height: 38,
              background: preset.accent,
              color: '#0A0A0B',
              fontFamily: 'var(--font-mf-mono), monospace',
              fontSize: 10,
              letterSpacing: '.18em',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
              fontWeight: 700,
            }}
          >
            SHARE · ▸
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes mfBadge {
          0% {
            transform: scale(0.3) rotate(-30deg);
            opacity: 0;
          }
          60% {
            transform: scale(1.15) rotate(6deg);
            opacity: 1;
          }
          100% {
            transform: scale(1) rotate(0);
            opacity: 1;
          }
        }
        @keyframes mfNumber {
          0% {
            transform: translateY(20px) scale(0.7);
            opacity: 0;
          }
          60% {
            transform: translateY(-4px) scale(1.05);
            opacity: 1;
          }
          100% {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
        }
        @keyframes mfStat {
          from {
            opacity: 0;
            transform: translateY(6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
