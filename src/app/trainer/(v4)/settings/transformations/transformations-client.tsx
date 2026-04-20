'use client';

import { useEffect, useRef, useState } from 'react';
import { AgreementGate } from '@/components/trainer/AgreementGate';

type Status = 'PENDING' | 'APPROVED' | 'REJECTED' | 'REMOVED';

interface Transformation {
  id: string;
  beforePhotoUrl: string;
  afterPhotoUrl: string;
  caption: string | null;
  durationWeeks: number | null;
  status: Status;
  rejectionReason: string | null;
  createdAt: string;
}

export default function TransformationsClient() {
  return (
    <AgreementGate>
      <TransformationsList />
    </AgreementGate>
  );
}

function TransformationsList() {
  const [items, setItems] = useState<Transformation[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [beforeFile, setBeforeFile] = useState<File | null>(null);
  const [afterFile, setAfterFile] = useState<File | null>(null);
  const [caption, setCaption] = useState('');
  const [durationWeeks, setDurationWeeks] = useState('');
  const beforeRef = useRef<HTMLInputElement>(null);
  const afterRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    refresh();
  }, []);

  const refresh = async () => {
    setLoading(true);
    const res = await fetch('/api/trainers/me/transformations', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      setItems(data.items ?? []);
    }
    setLoading(false);
  };

  const upload = async () => {
    setError(null);
    if (!beforeFile || !afterFile) {
      setError('Both before and after photos are required.');
      return;
    }
    setUploading(true);
    const form = new FormData();
    form.append('before', beforeFile);
    form.append('after', afterFile);
    if (caption.trim()) form.append('caption', caption.trim());
    if (durationWeeks) form.append('durationWeeks', durationWeeks);
    const res = await fetch('/api/trainers/me/transformations', {
      method: 'POST',
      body: form,
    });
    setUploading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || 'Upload failed');
      return;
    }
    setBeforeFile(null);
    setAfterFile(null);
    setCaption('');
    setDurationWeeks('');
    if (beforeRef.current) beforeRef.current.value = '';
    if (afterRef.current) afterRef.current.value = '';
    refresh();
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this transformation?')) return;
    const res = await fetch(`/api/trainers/me/transformations/${id}`, {
      method: 'DELETE',
    });
    if (res.ok) refresh();
  };

  const grouped: Record<Status, Transformation[]> = {
    APPROVED: items.filter((i) => i.status === 'APPROVED'),
    PENDING: items.filter((i) => i.status === 'PENDING'),
    REJECTED: items.filter((i) => i.status === 'REJECTED'),
    REMOVED: items.filter((i) => i.status === 'REMOVED'),
  };

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div className="mf-card" style={{ padding: 16 }}>
        <div className="mf-eyebrow" style={{ marginBottom: 8 }}>
          UPLOAD TRANSFORMATION
        </div>
        <div className="mf-fg-dim" style={{ fontSize: 11, marginBottom: 12 }}>
          By uploading you confirm this content is covered by your accepted Trainer
          Agreement. You accept full responsibility per those terms. Uploads go to
          admin review before appearing on your public profile.
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <FileField
            label="BEFORE PHOTO"
            inputRef={beforeRef}
            file={beforeFile}
            onChange={setBeforeFile}
          />
          <FileField
            label="AFTER PHOTO"
            inputRef={afterRef}
            file={afterFile}
            onChange={setAfterFile}
          />
        </div>
        <div style={{ marginTop: 12 }}>
          <div
            className="mf-font-mono mf-fg-dim"
            style={{ fontSize: 10, letterSpacing: '.15em', marginBottom: 4 }}
          >
            CAPTION (OPTIONAL)
          </div>
          <input
            className="mf-input"
            placeholder="16-week cut, Jordan R."
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            maxLength={200}
          />
        </div>
        <div style={{ marginTop: 12 }}>
          <div
            className="mf-font-mono mf-fg-dim"
            style={{ fontSize: 10, letterSpacing: '.15em', marginBottom: 4 }}
          >
            DURATION (WEEKS, OPTIONAL)
          </div>
          <input
            type="number"
            className="mf-input"
            min={0}
            max={520}
            value={durationWeeks}
            onChange={(e) => setDurationWeeks(e.target.value)}
          />
        </div>
        {error && (
          <div role="alert" style={{ color: '#fca5a5', fontSize: 12, marginTop: 8 }}>
            {error}
          </div>
        )}
        <button
          type="button"
          onClick={upload}
          disabled={uploading}
          className="mf-btn mf-btn-primary"
          style={{ marginTop: 12, height: 40 }}
        >
          {uploading ? 'Uploading…' : 'Submit for review'}
        </button>
      </div>

      {loading ? (
        <div className="mf-fg-dim">Loading…</div>
      ) : (
        <>
          <Group title="LIVE · APPROVED" items={grouped.APPROVED} onDelete={remove} />
          <Group title="PENDING REVIEW" items={grouped.PENDING} onDelete={remove} />
          <Group
            title="REJECTED"
            items={grouped.REJECTED}
            onDelete={remove}
            showRejectionReason
          />
          <Group
            title="REMOVED (TAKEDOWN HONORED)"
            items={grouped.REMOVED}
            onDelete={remove}
            readonly
          />
        </>
      )}
    </div>
  );
}

function FileField({
  label,
  inputRef,
  file,
  onChange,
}: {
  label: string;
  inputRef: React.RefObject<HTMLInputElement | null>;
  file: File | null;
  onChange: (f: File | null) => void;
}) {
  const preview = file ? URL.createObjectURL(file) : null;
  return (
    <div>
      <div
        className="mf-font-mono mf-fg-dim"
        style={{ fontSize: 10, letterSpacing: '.15em', marginBottom: 4 }}
      >
        {label}
      </div>
      <div
        style={{
          aspectRatio: '4 / 5',
          background: 'var(--mf-surface-2)',
          border: '1px solid var(--mf-hairline)',
          borderRadius: 4,
          backgroundImage: preview ? `url(${preview})` : 'none',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          position: 'relative',
          cursor: 'pointer',
        }}
        onClick={() => inputRef.current?.click()}
      >
        {!preview && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'grid',
              placeItems: 'center',
              color: 'var(--mf-fg-dim)',
              fontSize: 11,
            }}
          >
            Click to choose
          </div>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        style={{ display: 'none' }}
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />
    </div>
  );
}

function Group({
  title,
  items,
  onDelete,
  showRejectionReason,
  readonly,
}: {
  title: string;
  items: Transformation[];
  onDelete: (id: string) => void;
  showRejectionReason?: boolean;
  readonly?: boolean;
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <div className="mf-eyebrow" style={{ marginBottom: 8 }}>
        {title} · {items.length}
      </div>
      <div style={{ display: 'grid', gap: 8 }}>
        {items.map((item) => (
          <div key={item.id} className="mf-card" style={{ padding: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.beforePhotoUrl}
                alt="Before"
                style={{ width: '100%', aspectRatio: '4 / 5', objectFit: 'cover', borderRadius: 4 }}
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.afterPhotoUrl}
                alt="After"
                style={{ width: '100%', aspectRatio: '4 / 5', objectFit: 'cover', borderRadius: 4 }}
              />
            </div>
            {item.caption && (
              <div style={{ fontSize: 13, marginTop: 8 }}>{item.caption}</div>
            )}
            {item.durationWeeks && (
              <div className="mf-fg-dim" style={{ fontSize: 11, marginTop: 4 }}>
                {item.durationWeeks} week{item.durationWeeks === 1 ? '' : 's'}
              </div>
            )}
            {showRejectionReason && item.rejectionReason && (
              <div
                className="mf-fg-dim"
                style={{ fontSize: 11, marginTop: 6, color: '#fca5a5' }}
              >
                Rejected: {item.rejectionReason}
              </div>
            )}
            {!readonly && (
              <button
                type="button"
                onClick={() => onDelete(item.id)}
                className="mf-btn"
                style={{ marginTop: 8, padding: '0 12px', height: 32, color: '#fca5a5' }}
              >
                Delete
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
