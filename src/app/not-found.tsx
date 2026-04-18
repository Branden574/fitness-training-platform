import Link from 'next/link';
import { Home, ArrowRight } from 'lucide-react';
import { Btn } from '@/components/ui/mf';

export const metadata = { title: '404 · Not found' };

export default function NotFound() {
  return (
    <div
      data-mf
      className="mf-bg mf-fg"
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div style={{ maxWidth: 560, textAlign: 'center' }}>
        <div
          className="mf-eyebrow"
          style={{ marginBottom: 12, color: 'var(--mf-accent)' }}
        >
          HTTP · 404
        </div>
        <div
          className="mf-font-display mf-tnum mf-accent"
          style={{
            fontSize: 'clamp(96px, 18vw, 200px)',
            lineHeight: 0.9,
            letterSpacing: '-0.02em',
          }}
        >
          404
        </div>
        <div
          className="mf-font-display"
          style={{
            fontSize: 28,
            lineHeight: 1.1,
            letterSpacing: '-0.01em',
            textTransform: 'uppercase',
            marginTop: 16,
          }}
        >
          Nothing at this rep.
        </div>
        <p
          className="mf-fg-dim"
          style={{ fontSize: 14, lineHeight: 1.6, marginTop: 12, maxWidth: 420, marginInline: 'auto' }}
        >
          The page you tried to load doesn&apos;t exist — or maybe it moved. Head back
          to the dashboard and pick up where you left off.
        </p>
        <div
          className="flex items-center justify-center gap-2"
          style={{ marginTop: 32 }}
        >
          <Link href="/">
            <Btn variant="primary" icon={Home}>
              Home
            </Btn>
          </Link>
          <Link href="/auth/signin">
            <Btn icon={ArrowRight}>Sign in</Btn>
          </Link>
        </div>
      </div>
    </div>
  );
}
