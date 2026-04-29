import Link from 'next/link';
import { Clock, MapPin, Star } from 'lucide-react';
import RoundAvatar from '@/components/ui/mf/RoundAvatar';
import SpecialtyChip from '@/components/ui/mf/SpecialtyChip';
import StatusPill from '@/components/ui/mf/StatusPill';
import TrainerCover, { type TrainerCoverTone } from '@/components/ui/mf/TrainerCover';

export interface TrainerCardData {
  id: string;
  name: string | null;
  image: string | null;
  trainerSlug: string | null;
  trainerAcceptingClients: boolean;
  trainerClientStatus?: 'ACCEPTING' | 'WAITLIST' | 'NOT_ACCEPTING';
  trainer: {
    bio: string | null;
    headline: string | null;
    photoUrl: string | null;
    coverImageUrl: string | null;
    location: string | null;
    experience: number;
    specialties: string[];
    priceTier: string | null;
    clientsTrained?: number | null;
  } | null;
}

const TONES: TrainerCoverTone[] = ['default', 'warm', 'cool', 'olive', 'clay', 'smoke'];

function initialsFrom(name: string | null): string {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return '??';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

function locationCity(location: string | null): string | null {
  if (!location) return null;
  return location.split('·')[0]?.trim() ?? null;
}

export default function TrainerCard({
  trainer,
  tone = 'default',
}: {
  trainer: TrainerCardData;
  tone?: TrainerCoverTone;
}) {
  if (!trainer.trainerSlug) return null;
  const t = trainer.trainer;
  const initials = initialsFrom(trainer.name);
  const headline = t?.headline ?? t?.bio ?? '';
  const specialties = t?.specialties ?? [];
  const visible = specialties.slice(0, 3);
  const extra = Math.max(0, specialties.length - visible.length);
  const city = locationCity(t?.location ?? null);

  return (
    <Link
      href={`/t/${trainer.trainerSlug}`}
      className="mf-card group block"
      style={{
        padding: 0,
        overflow: 'hidden',
        textDecoration: 'none',
        color: 'inherit',
        transition: 'border-color 150ms ease, transform 120ms ease',
      }}
    >
      <div style={{ position: 'relative', padding: 10, paddingBottom: 0 }}>
        <TrainerCover
          imageUrl={t?.coverImageUrl ?? null}
          alt={`${trainer.name ?? 'Trainer'} cover`}
          height={170}
          radius={8}
          tone={tone}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 420px"
        />
        <div style={{ position: 'absolute', top: 18, right: 18 }}>
          <StatusPill
            kind={(() => {
              const s =
                trainer.trainerClientStatus ??
                (trainer.trainerAcceptingClients ? 'ACCEPTING' : 'WAITLIST');
              return s === 'ACCEPTING' ? 'accepting' : s === 'WAITLIST' ? 'waitlist' : 'closed';
            })()}
          />
        </div>
        <div style={{ position: 'absolute', left: 20, bottom: -28 }}>
          <RoundAvatar
            initials={initials}
            image={t?.photoUrl ?? trainer.image ?? null}
            alt={trainer.name ?? 'Trainer'}
            size={60}
          />
        </div>
      </div>

      <div style={{ padding: '36px 20px 20px' }}>
        <div
          className="mf-font-display"
          style={{
            fontSize: 20,
            letterSpacing: '-0.01em',
            lineHeight: 1.1,
            textTransform: 'uppercase',
          }}
        >
          {trainer.name}
        </div>
        {headline ? (
          <div
            className="mf-fg-dim"
            style={{
              fontSize: 13,
              lineHeight: 1.4,
              marginTop: 6,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {headline}
          </div>
        ) : null}

        {visible.length > 0 ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 14 }}>
            {visible.map((s) => (
              <SpecialtyChip key={s}>{s}</SpecialtyChip>
            ))}
            {extra > 0 ? <SpecialtyChip>+{extra} more</SpecialtyChip> : null}
          </div>
        ) : null}

        <div
          className="mf-font-mono"
          style={{
            marginTop: 18,
            paddingTop: 14,
            borderTop: '1px solid var(--mf-hairline)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 11,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {t?.experience && t.experience > 0 ? (
              <span className="mf-fg-dim" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Clock size={11} />
                <span className="tnum">{t.experience}y</span>
                <span className="mf-fg-mute" style={{ fontSize: 10 }}>
                  EXP
                </span>
              </span>
            ) : null}
            {typeof t?.clientsTrained === 'number' && t.clientsTrained > 0 ? (
              <span className="mf-fg-dim" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Star size={11} style={{ color: 'var(--mf-accent)' }} />
                <span className="tnum">{t.clientsTrained}+</span>
                <span className="mf-fg-mute" style={{ fontSize: 10 }}>
                  CLIENTS
                </span>
              </span>
            ) : null}
          </div>
          {city ? (
            <span
              className="mf-fg-mute"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 10,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}
            >
              <MapPin size={10} />
              {city}
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}

export function toneForIndex(idx: number): TrainerCoverTone {
  return TONES[idx % TONES.length]!;
}
