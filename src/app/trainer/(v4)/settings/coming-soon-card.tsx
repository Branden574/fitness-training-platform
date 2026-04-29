// src/app/trainer/(v4)/settings/coming-soon-card.tsx
const ITEMS = [
  'Default session times',
  'Availability windows',
  'Auto-reply templates',
  'Public directory listing v2',
];

export function ComingSoonCard() {
  return (
    <section>
      <div className="mf-eyebrow" style={{ marginBottom: 8 }}>COMING IN PHASE 2</div>
      <div className="mf-card" style={{ padding: 16, borderStyle: 'dashed' }}>
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 6 }}>
          {ITEMS.map((label) => (
            <li
              key={label}
              className="mf-fg-dim"
              style={{ display: 'flex', gap: 8, fontSize: 12 }}
            >
              <span
                className="mf-fg-mute"
                style={{
                  fontFamily: 'var(--font-mf-mono), monospace',
                  fontSize: 10,
                  marginTop: 2,
                }}
              >
                ·
              </span>
              {label}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
