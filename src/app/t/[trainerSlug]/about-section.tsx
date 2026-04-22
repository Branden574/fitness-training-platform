import ProfileSection from './profile-section';
import type { ProfileData } from './types';

export default function AboutSection({ p }: { p: ProfileData }) {
  if (!p.bio && p.quickFacts.length === 0 && p.certifications.length === 0) {
    return null;
  }

  const quickFacts = [
    ...p.quickFacts,
    ...(p.certifications.length > 0 &&
    !p.quickFacts.some((f) => /cert/i.test(f.label))
      ? [{ label: 'CERTIFICATIONS', value: p.certifications.join(', ') }]
      : []),
  ];

  return (
    <ProfileSection num="01 / ABOUT" title={`Who ${p.name.split(' ')[0]} coaches.`} border={false}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(12, minmax(0, 1fr))',
          gap: 32,
        }}
      >
        <div style={{ gridColumn: 'span 7 / span 7', minWidth: 0 }}>
          {p.bio ? (
            <div
              className="mf-fg-dim"
              style={{
                fontSize: 16,
                lineHeight: 1.75,
                maxWidth: '65ch',
                whiteSpace: 'pre-line',
              }}
            >
              {p.bio}
            </div>
          ) : null}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginTop: 32,
              paddingTop: 24,
              borderTop: '1px solid var(--mf-hairline)',
            }}
          >
            <span className="mf-eyebrow">SIGNED</span>
            <span
              className="mf-font-display"
              style={{ fontSize: 22, fontStyle: 'italic', letterSpacing: '-0.01em' }}
            >
              — {p.name.split(' ')[0]}
            </span>
          </div>
        </div>
        {quickFacts.length > 0 ? (
          <div style={{ gridColumn: 'span 5 / span 5', minWidth: 0 }}>
            <div className="mf-card" style={{ padding: 24 }}>
              <div className="mf-eyebrow" style={{ marginBottom: 16 }}>
                QUICK FACTS
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {quickFacts.map((f, i) => (
                  <div
                    key={`${f.label}-${i}`}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '140px 1fr',
                      gap: 12,
                      padding: '14px 0',
                      borderBottom:
                        i < quickFacts.length - 1 ? '1px solid var(--mf-hairline)' : 'none',
                    }}
                  >
                    <div
                      className="mf-font-mono mf-fg-mute"
                      style={{
                        fontSize: 10,
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                      }}
                    >
                      {f.label}
                    </div>
                    <div className="mf-fg" style={{ fontSize: 13 }}>
                      {f.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </ProfileSection>
  );
}
