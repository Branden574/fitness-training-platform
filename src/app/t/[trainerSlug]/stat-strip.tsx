import { Clock, Dumbbell, Users, Zap } from 'lucide-react';
import StatTile from '@/components/ui/mf/StatTile';
import type { ProfileData } from './types';

export default function StatStrip({ p }: { p: ProfileData }) {
  const tiles: Array<{
    key: string;
    label: string;
    value: string | number;
    unit?: string;
    icon: typeof Clock;
    accent?: boolean;
  }> = [];

  if (p.experience > 0) {
    tiles.push({
      key: 'years',
      label: 'YEARS COACHING',
      value: p.experience,
      unit: 'YRS',
      icon: Clock,
    });
  }
  if (p.clientsTrained && p.clientsTrained > 0) {
    tiles.push({
      key: 'clients',
      label: 'CLIENTS TRAINED',
      value: `${p.clientsTrained}+`,
      icon: Users,
    });
  } else if (p.activeClients > 0) {
    tiles.push({
      key: 'active',
      label: 'ACTIVE CLIENTS',
      value: p.activeClients,
      icon: Users,
    });
  }
  if (p.specialties[0]) {
    tiles.push({
      key: 'primary',
      label: 'PRIMARY',
      value: p.specialties[0],
      icon: Dumbbell,
    });
  }
  if (p.accepting) {
    tiles.push({
      key: 'availability',
      label: 'AVAILABILITY',
      value: 'Open',
      unit: 'THIS MONTH',
      icon: Zap,
      accent: true,
    });
  }

  if (tiles.length === 0) return null;

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(auto-fit, minmax(180px, 1fr))`,
        gap: 12,
        paddingTop: 8,
      }}
    >
      {tiles.map((t) => (
        <StatTile
          key={t.key}
          label={t.label}
          value={t.value}
          unit={t.unit}
          icon={t.icon}
          accent={t.accent}
        />
      ))}
    </div>
  );
}
