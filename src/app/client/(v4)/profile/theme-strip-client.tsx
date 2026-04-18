'use client';

import { useTheme } from '@/components/ThemeProvider';
import { Moon, Sun, Zap } from 'lucide-react';

export default function ProfileThemeStripClient() {
  const { theme, setTheme } = useTheme();

  const options: Array<{ key: 'dark' | 'light' | 'auto'; label: string; Icon: typeof Moon }> = [
    { key: 'dark', label: 'Dark', Icon: Moon },
    { key: 'light', label: 'Light', Icon: Sun },
    { key: 'auto', label: 'Auto', Icon: Zap },
  ];

  return (
    <div className="grid grid-cols-3 gap-2">
      {options.map(({ key, label, Icon }) => {
        const active = theme === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => setTheme(key)}
            className="mf-btn"
            style={{
              height: 48,
              flexDirection: 'column',
              gap: 4,
              background: active ? 'var(--mf-accent)' : undefined,
              color: active ? 'var(--mf-accent-ink)' : undefined,
              borderColor: active ? 'var(--mf-accent)' : undefined,
            }}
            aria-pressed={active}
          >
            <Icon size={16} />
            <span className="mf-font-mono" style={{ fontSize: 10, letterSpacing: '0.1em' }}>
              {label.toUpperCase()}
            </span>
          </button>
        );
      })}
    </div>
  );
}
