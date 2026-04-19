'use client';

import { useMemo, type CSSProperties } from 'react';

interface Props {
  accent?: string;
  count?: number;
}

interface Piece {
  id: number;
  color: string;
  w: number;
  h: number;
  dx: number;
  dy: number;
  rot: number;
  delay: number;
  dur: number;
  shape: 'rect' | 'circle';
}

type PieceStyle = CSSProperties & Record<`--${string}`, string>;

export function Confetti({ accent = '#FF4D1C', count = 90 }: Props) {
  const pieces = useMemo<Piece[]>(() => {
    const palette = [accent, '#F4F4F5', '#2BD985', '#F5C14E', '#6A7FDC'];
    return Array.from({ length: count }).map((_, i) => {
      const ang = (Math.random() - 0.5) * 180 - 90;
      const dist = 120 + Math.random() * 360;
      const dx = Math.cos((ang * Math.PI) / 180) * dist;
      const dy = Math.sin((ang * Math.PI) / 180) * dist - Math.random() * 80;
      return {
        id: i,
        color: palette[i % palette.length],
        w: 4 + Math.random() * 6,
        h: 8 + Math.random() * 14,
        dx,
        dy,
        rot: Math.random() * 720 - 360,
        delay: Math.random() * 0.15,
        dur: 1.6 + Math.random() * 1.2,
        shape: Math.random() > 0.7 ? 'circle' : 'rect',
      };
    });
  }, [accent, count]);

  return (
    <div
      style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        width: 0,
        height: 0,
        pointerEvents: 'none',
        zIndex: 2,
      }}
    >
      {pieces.map((p) => {
        const style: PieceStyle = {
          position: 'absolute',
          left: 0,
          top: 0,
          width: p.w,
          height: p.shape === 'circle' ? p.w : p.h,
          background: p.color,
          borderRadius: p.shape === 'circle' ? 999 : 1,
          transformOrigin: 'center',
          animation: `mfConf-${p.id % 20} ${p.dur}s cubic-bezier(.2,.6,.3,1) ${p.delay}s both`,
          opacity: 0,
          '--dx': `${p.dx}px`,
          '--dy': `${p.dy}px`,
          '--rot': `${p.rot}deg`,
        };
        return <span key={p.id} style={style} />;
      })}
      <style jsx>{`
        ${Array.from({ length: 20 })
          .map(
            (_, k) => `
          @keyframes mfConf-${k} {
            0%   { opacity:0; transform:translate(0,0) rotate(0) scale(.6); }
            12%  { opacity:1; }
            60%  { opacity:1; }
            100% { opacity:0; transform:translate(var(--dx), calc(var(--dy) + 180px)) rotate(var(--rot)) scale(1); }
          }
        `,
          )
          .join('\n')}
      `}</style>
    </div>
  );
}
