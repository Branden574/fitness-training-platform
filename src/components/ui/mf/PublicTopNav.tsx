'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import Btn from './Btn';

export interface PublicTopNavProps {
  activeSection?:
    | 'platform'
    | 'pricing'
    | 'trainers'
    | 'clients'
    | 'trainers-dir'
    | null;
}

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

export default function PublicTopNav({ activeSection }: PublicTopNavProps) {
  const linkClass = (key: PublicTopNavProps['activeSection']) =>
    activeSection === key
      ? 'text-[color:var(--mf-fg)]'
      : 'mf-fg-dim hover:text-[color:var(--mf-fg)]';

  return (
    <div
      data-mf
      className="sticky top-0 z-40 mf-bg mf-fg"
      style={{
        borderBottom: '1px solid var(--mf-hairline)',
        backdropFilter: 'blur(10px)',
      }}
    >
      <div
        className="max-w-[1200px] mx-auto px-6 flex items-center justify-between"
        style={{ height: 64 }}
      >
        <div className="flex items-center gap-10">
          <Link href="/" className="flex items-center gap-2">
            <BrandMark />
            <span
              className="mf-font-display"
              style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.01em' }}
            >
              MARTINEZ/FITNESS
            </span>
          </Link>
          <nav
            className="hidden md:flex items-center gap-6"
            style={{ fontSize: 14 }}
          >
            <Link href="/#platform" className={linkClass('platform')}>Platform</Link>
            <Link href="/?as=trainer#role-split" className={linkClass('trainers')}>For Trainers</Link>
            <Link href="/?as=client#role-split" className={linkClass('clients')}>For Clients</Link>
            <Link href="/trainers" className={linkClass('trainers-dir')}>Trainers</Link>
            <Link href="/#pricing" className={linkClass('pricing')}>Pricing</Link>
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/auth/signin">
            <Btn variant="ghost">Sign in</Btn>
          </Link>
          <Link href="/apply">
            <Btn variant="primary" icon={ArrowRight}>Apply</Btn>
          </Link>
        </div>
      </div>
    </div>
  );
}
