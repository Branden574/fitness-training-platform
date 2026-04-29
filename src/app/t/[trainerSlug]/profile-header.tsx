import Link from 'next/link';
import { ArrowRight, Clock, Instagram, MapPin, MessageSquare, Video } from 'lucide-react';
import Btn from '@/components/ui/mf/Btn';
import RoundAvatar from '@/components/ui/mf/RoundAvatar';
import StatusPill from '@/components/ui/mf/StatusPill';
import TrainerCover from '@/components/ui/mf/TrainerCover';
import type { ProfileData } from './types';

function TikTokIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
    </svg>
  );
}

export default function ProfileHeader({ p }: { p: ProfileData }) {
  return (
    <>
      <div style={{ position: 'relative' }}>
        <TrainerCover
          imageUrl={p.coverImageUrl}
          alt={`${p.name} cover`}
          height={320}
          radius={0}
          tone="warm"
          sizes="100vw"
          priority
        />
      </div>

      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px' }}>
        {/* Avatar sits above everything else and overlaps the cover. Name +
            CTAs live below it so the heading is never clipped by the
            circle, regardless of viewport width. */}
        <div style={{ marginTop: -84, marginBottom: 16 }}>
          <RoundAvatar
            initials={p.initials}
            image={p.photoUrl}
            alt={p.name}
            size={140}
          />
        </div>

        <div style={{ paddingBottom: 32 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 24,
              flexWrap: 'wrap',
            }}
          >
            <div style={{ minWidth: 0, flex: '1 1 320px' }}>
              <div
                className="mf-eyebrow"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  flexWrap: 'wrap',
                  marginBottom: 10,
                }}
              >
                <span>TRAINER · L1 VERIFIED</span>
                <span className="mf-fg-mute">·</span>
                <StatusPill
                  kind={
                    p.clientStatus === 'ACCEPTING'
                      ? 'accepting'
                      : p.clientStatus === 'WAITLIST'
                      ? 'waitlist'
                      : 'closed'
                  }
                />
              </div>
              <h1
                className="mf-font-display"
                style={{
                  fontSize: 'clamp(36px, 6vw, 64px)',
                  lineHeight: 0.95,
                  letterSpacing: '-0.015em',
                  textTransform: 'uppercase',
                  fontWeight: 600,
                  margin: 0,
                  wordBreak: 'break-word',
                }}
              >
                {p.name}
              </h1>
              {p.headline ? (
                <div
                  className="mf-fg-dim"
                  style={{
                    fontSize: 15,
                    marginTop: 12,
                    lineHeight: 1.5,
                    maxWidth: 560,
                  }}
                >
                  {p.headline}
                </div>
              ) : null}
              <div
                className="mf-font-mono mf-fg-mute"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  marginTop: 16,
                  fontSize: 11,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  flexWrap: 'wrap',
                }}
              >
                {p.location ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <MapPin size={11} />
                    {p.location}
                  </span>
                ) : null}
                {p.accepting ? (
                  <>
                    <span>·</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Clock size={11} />
                      Responds within 4h
                    </span>
                  </>
                ) : null}
              </div>
            </div>
            <div
              data-profile-cta
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                flexWrap: 'wrap',
              }}
            >
              {p.instagramHandle ? (
                <a
                  href={`https://instagram.com/${p.instagramHandle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Instagram @${p.instagramHandle}`}
                  className="mf-btn mf-btn-ghost"
                  style={{ width: 40, height: 40, padding: 0 }}
                >
                  <Instagram size={16} />
                </a>
              ) : null}
              {p.tiktokHandle ? (
                <a
                  href={`https://tiktok.com/@${p.tiktokHandle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`TikTok @${p.tiktokHandle}`}
                  className="mf-btn mf-btn-ghost"
                  style={{ width: 40, height: 40, padding: 0 }}
                >
                  <TikTokIcon size={16} />
                </a>
              ) : null}
              {p.youtubeHandle ? (
                <a
                  href={`https://youtube.com/@${encodeURIComponent(p.youtubeHandle)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="YouTube channel"
                  className="mf-btn mf-btn-ghost"
                  style={{ width: 40, height: 40, padding: 0 }}
                >
                  <Video size={16} />
                </a>
              ) : null}
              <div
                style={{
                  width: 1,
                  height: 24,
                  background: 'var(--mf-hairline)',
                  margin: '0 6px',
                }}
              />
              <Btn icon={MessageSquare} style={{ height: 40 }}>
                Message
              </Btn>
              <Link
                href={`/apply/${p.slug}`}
                className="mf-btn mf-btn-primary"
                style={{ height: 40, padding: '0 20px', gap: 8 }}
              >
                {p.clientStatus === 'ACCEPTING'
                  ? 'Book Consultation'
                  : p.clientStatus === 'WAITLIST'
                  ? 'Join Waitlist'
                  : 'Get notified'}
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
