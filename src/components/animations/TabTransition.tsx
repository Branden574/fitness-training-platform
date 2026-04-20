'use client';

import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type CSSProperties,
} from 'react';

interface Props {
  /** Change this value to trigger the transition (typically the pathname). */
  screenKey: string;
  /** Override the auto-derived LOADING · LABEL text. Defaults to the last segment of screenKey. */
  label?: string;
  children: ReactNode;
}

type State = 'idle' | 'out' | 'loading' | 'in';

function deriveLabel(screenKey: string): string {
  const seg = screenKey.split('/').filter(Boolean).pop() ?? '';
  return seg.replace(/-/g, ' · ').toUpperCase();
}

/**
 * Branded tab-switch loader — blur-out → scan-wipe + corner brackets + spinning
 * dumbbell mark + top progress rail → fade-in. Matches the Martinez Fitness
 * animation handoff. ~520ms total.
 */
export function TabTransition({ screenKey, label: labelProp, children }: Props) {
  const [content, setContent] = useState<ReactNode>(children);
  const [state, setState] = useState<State>('idle');
  const [label, setLabel] = useState(labelProp ?? deriveLabel(screenKey));

  // Refs instead of state for values that the transition effect reads but
  // must NOT re-trigger it. Previously `cur` was state + an effect dep, so
  // setCur() inside the effect re-ran the effect and its cleanup clobbered
  // the pending "in/idle" timeout — freezing every tab change on the loading
  // overlay. Same risk with `children` (parent re-renders hand in a fresh
  // ReactNode reference every pass).
  const curRef = useRef(screenKey);
  const childrenRef = useRef<ReactNode>(children);
  childrenRef.current = children;

  // Sync children into content when we're not mid-transition. This covers
  // data re-fetches on the same screen (e.g. router.refresh) without playing
  // the loader.
  useEffect(() => {
    if (state === 'idle' && curRef.current === screenKey) {
      setContent(children);
    }
  }, [children, screenKey, state]);

  // Drive the transition only off screenKey + labelProp. cur/children live
  // in refs so they can't trip the cleanup mid-flight.
  useEffect(() => {
    if (screenKey === curRef.current) return;
    curRef.current = screenKey;
    setLabel(labelProp ?? deriveLabel(screenKey));
    setState('out');
    const t1 = setTimeout(() => {
      setContent(childrenRef.current);
      setState('loading');
    }, 180);
    const t2 = setTimeout(() => {
      setState('in');
      requestAnimationFrame(() =>
        requestAnimationFrame(() => setState('idle')),
      );
    }, 520);
    // Defensive fallback: if anything throws or the rAF chain is skipped
    // (e.g. tab backgrounded), force the overlay off after ~1.2s so the
    // screen can never remain stuck on "LOADING · X".
    const tFallback = setTimeout(() => setState('idle'), 1200);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(tFallback);
    };
  }, [screenKey, labelProp]);

  const contentStyle = (): CSSProperties => {
    if (state === 'out')
      return {
        opacity: 0,
        transform: 'translateY(4px) scale(0.998)',
        filter: 'blur(4px)',
      };
    if (state === 'loading')
      return {
        opacity: 0.15,
        transform: 'translateY(0) scale(1)',
        filter: 'blur(8px)',
      };
    if (state === 'in')
      return {
        opacity: 0,
        transform: 'translateY(-4px) scale(1.002)',
        filter: 'blur(0)',
      };
    return { opacity: 1, transform: 'translateY(0) scale(1)', filter: 'blur(0)' };
  };

  const overlayActive = state === 'out' || state === 'loading';

  return (
    <div
      style={{ height: '100%', width: '100%', position: 'relative', overflow: 'hidden' }}
    >
      <div
        style={{
          height: '100%',
          width: '100%',
          transition:
            state === 'out'
              ? 'opacity .18s ease-in, transform .18s ease-in, filter .18s ease-in'
              : 'opacity .34s ease-out, transform .34s ease-out, filter .34s ease-out',
          ...contentStyle(),
        }}
      >
        {content}
      </div>

      {/* Loading overlay — scan wipe + progress rail + corner-bracket HUD */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 50,
          opacity: overlayActive ? 1 : 0,
          transition: 'opacity .22s ease',
        }}
      >
        {/* Darkening veil */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(circle at 50% 50%, rgba(10,10,11,.35), rgba(10,10,11,.75))',
            backdropFilter: 'blur(2px)',
            WebkitBackdropFilter: 'blur(2px)',
          }}
        />

        {/* Scan line sweep */}
        <div
          key={state + screenKey}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            height: '100%',
            animation: overlayActive
              ? 'mfScan .52s cubic-bezier(.7,.1,.3,.9) both'
              : 'none',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: 0,
              width: '100%',
              background:
                'linear-gradient(90deg, transparent 0%, rgba(255,77,28,.08) 45%, rgba(255,77,28,.85) 50%, rgba(255,77,28,.08) 55%, transparent 100%)',
              boxShadow: '0 0 40px rgba(255,77,28,.5)',
              mixBlendMode: 'screen',
            }}
          />
        </div>

        {/* Top progress rail */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 2,
            background: 'rgba(31,31,34,.6)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              background: 'var(--mf-accent, #FF4D1C)',
              boxShadow: '0 0 10px rgba(255,77,28,.8)',
              animation: overlayActive
                ? 'mfRail .52s cubic-bezier(.4,.1,.3,1) both'
                : 'none',
            }}
          />
        </div>

        {/* HUD: corner brackets + spinning dumbbell + label */}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%,-50%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <div
            style={{
              position: 'relative',
              width: 150,
              height: 54,
              display: 'grid',
              placeItems: 'center',
            }}
          >
            {/* Corner brackets */}
            {(
              [
                [0, 0, 'tl'],
                [1, 0, 'tr'],
                [0, 1, 'bl'],
                [1, 1, 'br'],
              ] as const
            ).map(([x, y, k]) => (
              <span
                key={k}
                style={{
                  position: 'absolute',
                  left: x ? undefined : 0,
                  right: x ? 0 : undefined,
                  top: y ? undefined : 0,
                  bottom: y ? 0 : undefined,
                  width: 14,
                  height: 14,
                  borderTop: !y ? '1.5px solid var(--mf-accent,#FF4D1C)' : 'none',
                  borderBottom: y ? '1.5px solid var(--mf-accent,#FF4D1C)' : 'none',
                  borderLeft: !x ? '1.5px solid var(--mf-accent,#FF4D1C)' : 'none',
                  borderRight: x ? '1.5px solid var(--mf-accent,#FF4D1C)' : 'none',
                  animation: overlayActive
                    ? 'mfBracket .5s cubic-bezier(.2,.8,.2,1) both'
                    : 'none',
                }}
              />
            ))}
            {/* Small dumbbell mark spinning */}
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--mf-accent,#FF4D1C)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                animation: overlayActive
                  ? 'mfTwist .52s cubic-bezier(.4,0,.2,1) both'
                  : 'none',
              }}
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
              fontFamily: 'var(--font-mf-mono), monospace',
              fontSize: 9,
              letterSpacing: '.28em',
              color: 'var(--mf-accent, #FF4D1C)',
              textShadow: '0 0 8px rgba(255,77,28,.5)',
              animation: overlayActive ? 'mfLabel .5s ease both' : 'none',
            }}
          >
            LOADING · {label}
          </div>
          {/* Dot ticker */}
          <div style={{ display: 'flex', gap: 4 }}>
            {[0, 1, 2, 3, 4].map((i) => (
              <span
                key={i}
                style={{
                  width: 3,
                  height: 3,
                  borderRadius: 999,
                  background: 'var(--mf-accent, #FF4D1C)',
                  opacity: 0.35,
                  animation: overlayActive
                    ? `mfDot .9s ease-in-out ${i * 0.08}s infinite`
                    : 'none',
                }}
              />
            ))}
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes mfScan {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
        @keyframes mfRail {
          0% {
            width: 0%;
          }
          60% {
            width: 85%;
          }
          100% {
            width: 100%;
          }
        }
        @keyframes mfBracket {
          0% {
            opacity: 0;
            transform: scale(0.4);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }
        @keyframes mfTwist {
          0% {
            transform: rotate(-90deg) scale(0.6);
            opacity: 0;
          }
          60% {
            transform: rotate(10deg) scale(1.1);
            opacity: 1;
          }
          100% {
            transform: rotate(0deg) scale(1);
            opacity: 1;
          }
        }
        @keyframes mfLabel {
          0% {
            opacity: 0;
            letter-spacing: 0.14em;
          }
          100% {
            opacity: 1;
            letter-spacing: 0.28em;
          }
        }
        @keyframes mfDot {
          0%,
          100% {
            opacity: 0.25;
            transform: scale(0.8);
          }
          50% {
            opacity: 1;
            transform: scale(1.3);
          }
        }
      `}</style>
    </div>
  );
}
