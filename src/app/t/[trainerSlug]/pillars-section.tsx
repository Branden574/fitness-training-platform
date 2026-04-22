import type { ComponentType } from 'react';
import {
  Apple,
  Award,
  Dumbbell,
  Flame,
  Heart,
  MessageSquare,
  Moon,
  Target,
  TrendingUp,
} from 'lucide-react';
import SpecialtyChip from '@/components/ui/mf/SpecialtyChip';
import ProfileSection from './profile-section';
import type { ProfileData } from './types';

const ICON_MAP: Record<string, ComponentType<{ size?: number; className?: string }>> = {
  TrendingUp,
  Apple,
  Moon,
  MessageSquare,
  Heart,
  Award,
  Dumbbell,
  Flame,
  Target,
};

export default function PillarsSection({ p }: { p: ProfileData }) {
  const hasPillars = p.pillars.length > 0;
  const hasSpecialties = p.specialties.length > 0;
  if (!hasPillars && !hasSpecialties) return null;

  return (
    <ProfileSection num="02 / APPROACH" title="Specialties & method.">
      {hasSpecialties ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 32 }}>
          {p.specialties.map((s) => (
            <SpecialtyChip key={s}>{s}</SpecialtyChip>
          ))}
        </div>
      ) : null}
      {hasPillars ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 16,
          }}
        >
          {p.pillars.map((pi, i) => {
            const Icon = ICON_MAP[pi.icon] ?? Target;
            return (
              <div key={`${pi.title}-${i}`} className="mf-card" style={{ padding: 24 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 20,
                  }}
                >
                  <Icon size={20} className="mf-accent" />
                  <span
                    className="mf-font-mono mf-fg-mute"
                    style={{ fontSize: 10 }}
                  >
                    {String(i + 1).padStart(2, '0')}
                  </span>
                </div>
                <div
                  className="mf-font-display"
                  style={{
                    fontSize: 18,
                    textTransform: 'uppercase',
                    letterSpacing: '-0.005em',
                    lineHeight: 1.15,
                  }}
                >
                  {pi.title}
                </div>
                <div
                  className="mf-fg-dim"
                  style={{ fontSize: 13, marginTop: 12, lineHeight: 1.6 }}
                >
                  {pi.description}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </ProfileSection>
  );
}
