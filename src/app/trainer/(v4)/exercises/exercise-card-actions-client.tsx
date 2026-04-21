'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { MoreHorizontal, Trash2, Pencil, X } from 'lucide-react';

interface Props {
  id: string;
  name: string;
  difficulty: string;
  imageUrl: string | null;
  videoUrl: string | null;
  muscleGroups: string;
  equipment: string;
}

type Difficulty = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';

export default function ExerciseCardActionsClient({
  id,
  name,
  difficulty,
  imageUrl,
  videoUrl,
  muscleGroups,
  equipment,
}: Props) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [menuCoords, setMenuCoords] = useState<{ top: number; right: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Edit form state
  const [formName, setFormName] = useState(name);
  const [formDifficulty, setFormDifficulty] = useState<Difficulty>(
    (difficulty as Difficulty) ?? 'INTERMEDIATE',
  );
  const [formImageUrl, setFormImageUrl] = useState(imageUrl ?? '');
  const [formVideoUrl, setFormVideoUrl] = useState(videoUrl ?? '');
  const [formMuscles, setFormMuscles] = useState(muscleGroups);
  const [formEquipment, setFormEquipment] = useState(equipment);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!menuOpen) return;
    const update = () => {
      const btn = buttonRef.current;
      if (!btn) return;
      const r = btn.getBoundingClientRect();
      setMenuCoords({
        top: r.bottom + 4,
        right: Math.max(8, window.innerWidth - r.right),
      });
    };
    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (
        (buttonRef.current && buttonRef.current.contains(t)) ||
        (menuRef.current && menuRef.current.contains(t))
      )
        return;
      setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const handleDelete = async () => {
    if (
      !confirm(
        `Delete "${name}"? If it's used in any program or workout, delete will be blocked and you'll see a count.`,
      )
    )
      return;
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/exercises/${id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? 'Delete failed');
        return;
      }
      setMenuOpen(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const body: Record<string, unknown> = {
        name: formName.trim(),
        difficulty: formDifficulty,
        imageUrl: formImageUrl.trim() || null,
        videoUrl: formVideoUrl.trim() || null,
        muscleGroups: formMuscles
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        equipment: formEquipment
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      };
      const res = await fetch(`/api/exercises/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? 'Save failed');
        return;
      }
      setEditOpen(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  const menu =
    menuOpen && menuCoords && mounted ? (
      <div
        ref={menuRef}
        role="menu"
        style={{
          position: 'fixed',
          top: menuCoords.top,
          right: menuCoords.right,
          minWidth: 160,
          background: 'var(--mf-surface-2, #0E0E10)',
          border: '1px solid var(--mf-hairline, #1F1F22)',
          borderRadius: 6,
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          zIndex: 1000,
          padding: 4,
          color: 'var(--mf-fg, #F4F4F5)',
        }}
      >
        <MenuItem
          icon={<Pencil size={14} />}
          label="Edit exercise"
          onClick={() => {
            setMenuOpen(false);
            setEditOpen(true);
          }}
        />
        <MenuItem
          icon={<Trash2 size={14} />}
          label={busy ? 'Deleting…' : 'Delete'}
          onClick={handleDelete}
          disabled={busy}
          danger
        />
        {error && (
          <div
            role="alert"
            style={{
              padding: '6px 10px',
              color: '#fca5a5',
              fontSize: 11,
              marginTop: 4,
            }}
          >
            {error}
          </div>
        )}
      </div>
    ) : null;

  const editModal =
    editOpen && mounted ? (
      <div
        role="dialog"
        aria-modal="true"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1100,
          background: 'rgba(0,0,0,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) setEditOpen(false);
        }}
      >
        <form
          onSubmit={handleSave}
          className="mf-card-elev"
          style={{
            width: 'min(560px, 100%)',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: 24,
            display: 'grid',
            gap: 14,
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="mf-eyebrow">EDIT EXERCISE</div>
              <div
                className="mf-font-display"
                style={{
                  fontSize: 20,
                  letterSpacing: '-0.01em',
                  marginTop: 2,
                }}
              >
                {name}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setEditOpen(false)}
              className="mf-btn mf-btn-ghost"
              aria-label="Close"
              style={{ height: 32, width: 32, padding: 0 }}
            >
              <X size={14} />
            </button>
          </div>

          <Field label="NAME">
            <input
              className="mf-input"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              minLength={2}
              maxLength={120}
              required
            />
          </Field>

          <Field label="DIFFICULTY">
            <div style={{ display: 'flex', gap: 6 }}>
              {(['BEGINNER', 'INTERMEDIATE', 'ADVANCED'] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setFormDifficulty(d)}
                  className="mf-btn"
                  style={{
                    flex: 1,
                    height: 36,
                    fontSize: 11,
                    background:
                      formDifficulty === d ? 'var(--mf-accent)' : undefined,
                    color: formDifficulty === d ? '#0A0A0B' : undefined,
                    borderColor:
                      formDifficulty === d ? 'var(--mf-accent)' : undefined,
                  }}
                >
                  {d}
                </button>
              ))}
            </div>
          </Field>

          <Field
            label="IMAGE / GIF URL"
            hint="Animated GIF or still image. Shown as the card thumbnail."
          >
            <input
              type="url"
              className="mf-input"
              value={formImageUrl}
              onChange={(e) => setFormImageUrl(e.target.value)}
              placeholder="https://…"
              maxLength={500}
            />
          </Field>

          <Field label="VIDEO URL (optional)">
            <input
              type="url"
              className="mf-input"
              value={formVideoUrl}
              onChange={(e) => setFormVideoUrl(e.target.value)}
              placeholder="https://…"
              maxLength={500}
            />
          </Field>

          <Field label="MUSCLE GROUPS (comma-separated)">
            <input
              className="mf-input"
              value={formMuscles}
              onChange={(e) => setFormMuscles(e.target.value)}
              placeholder="chest, triceps, shoulders"
              maxLength={400}
            />
          </Field>

          <Field label="EQUIPMENT (comma-separated)">
            <input
              className="mf-input"
              value={formEquipment}
              onChange={(e) => setFormEquipment(e.target.value)}
              placeholder="barbell, bench"
              maxLength={400}
            />
          </Field>

          {error && (
            <div
              role="alert"
              style={{
                padding: '10px 12px',
                background: '#2a1212',
                border: '1px solid #6b1f1f',
                color: '#fca5a5',
                borderRadius: 4,
                fontSize: 12,
              }}
            >
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditOpen(false)}
              className="mf-btn"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="mf-btn mf-btn-primary"
            >
              {busy ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    ) : null;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setMenuOpen((v) => !v);
        }}
        aria-label="Exercise actions"
        className="mf-btn mf-btn-ghost"
        style={{ height: 28, width: 28, padding: 0 }}
      >
        <MoreHorizontal size={14} />
      </button>
      {mounted && menu ? createPortal(menu, document.body) : null}
      {mounted && editModal ? createPortal(editModal, document.body) : null}
    </>
  );
}

function MenuItem({
  icon,
  label,
  onClick,
  disabled,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      disabled={disabled}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '8px 10px',
        background: 'transparent',
        border: 'none',
        borderRadius: 4,
        color: danger ? '#fca5a5' : 'var(--mf-fg)',
        fontSize: 13,
        textAlign: 'left',
        cursor: disabled ? 'wait' : 'pointer',
        opacity: disabled ? 0.6 : 1,
      }}
      onMouseEnter={(e) =>
        (e.currentTarget.style.background = 'var(--mf-surface-3, #14141A)')
      }
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label style={{ display: 'block' }}>
      <div
        style={{
          fontFamily: 'var(--font-mf-mono), monospace',
          fontSize: 10,
          letterSpacing: '.15em',
          color: 'var(--mf-fg-dim)',
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      {children}
      {hint && (
        <div style={{ fontSize: 10, color: 'var(--mf-fg-mute)', marginTop: 4 }}>
          {hint}
        </div>
      )}
    </label>
  );
}
