'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

interface TrainerSelection {
  id: string | null;
  name: string | null;
}

export interface ApplyFormProps {
  selection: TrainerSelection;
  trainerPhone?: string | null;
  waitlist?: boolean;
}

export function ApplyForm({
  selection,
  trainerPhone,
  waitlist = false,
}: ApplyFormProps) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [goal, setGoal] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [heightFt, setHeightFt] = useState('');
  const [heightIn, setHeightIn] = useState('');
  const [weightLb, setWeightLb] = useState('');
  const [primaryGoal, setPrimaryGoal] = useState('');
  const [trainingExperience, setTrainingExperience] = useState('');
  const [daysPerWeek, setDaysPerWeek] = useState('');
  const [injuries, setInjuries] = useState('');
  const [limitations, setLimitations] = useState('');

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim() || !email.trim()) {
      setError('Name and email are required.');
      return;
    }
    if (goal.trim().length < 3) {
      setError('Tell your trainer what you’re trying to do — at least a few words.');
      return;
    }
    setSubmitting(true);
    try {
      const ft = parseInt(heightFt, 10);
      const inch = parseInt(heightIn, 10);
      // Require feet to be present. A bare inches value (e.g. user typed
      // "11" in the in field but left ft blank) is almost always a typo,
      // so we drop both rather than store 0'11" as someone's height.
      const totalInches = Number.isFinite(ft)
        ? ft * 12 + (Number.isFinite(inch) ? inch : 0)
        : undefined;
      const weight = parseFloat(weightLb);
      const days = parseInt(daysPerWeek, 10);

      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || undefined,
          trainerId: selection.id ?? undefined,
          goal: goal.trim() || undefined,
          heightInches: totalInches,
          weightLb: Number.isFinite(weight) ? weight : undefined,
          primaryGoal: primaryGoal || undefined,
          trainingExperience: trainingExperience || undefined,
          limitations: limitations.trim() || undefined,
          daysPerWeek: Number.isFinite(days) ? days : undefined,
          // injuries is sent so the existing schema column gets populated.
          injuries: injuries.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.message || data.error || 'Submission failed. Try again.');
        return;
      }
      router.push('/apply/success');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const hasPhone = !!trainerPhone && trainerPhone.trim().length > 0;
  const phoneHref = hasPhone ? `sms:${trainerPhone!.replace(/[^\d+]/g, '')}` : '';

  return (
    <form onSubmit={onSubmit} style={{ display: 'grid', gap: 16 }}>
      {/* Direct channel card — only rendered when the selected trainer has
          configured a contact phone in their profile. Generic /apply hides
          this until the applicant picks a trainer. */}
      {hasPhone && (
        <div
          style={{
            padding: 16,
            background: 'var(--mf-surface-2, #0E0E10)',
            border: '1px solid var(--mf-hairline, #1F1F22)',
            borderRadius: 6,
          }}
        >
          <div
            className="mf-eyebrow"
            style={{ marginBottom: 8 }}
          >
            FASTEST REPLY
          </div>
          <a
            href={phoneHref}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              height: 40,
              padding: '0 16px',
              background: 'var(--mf-accent, #FF4D1C)',
              color: '#0A0A0B',
              fontFamily: 'var(--font-mf-mono), monospace',
              fontSize: 11,
              letterSpacing: '.18em',
              fontWeight: 700,
              borderRadius: 4,
              textDecoration: 'none',
            }}
          >
            Text · {trainerPhone}
          </a>
          <div
            className="mf-fg-dim"
            style={{ fontSize: 11, marginTop: 8 }}
          >
            Or write it out below.
          </div>
        </div>
      )}

      {/* Selection chip */}
      <div
        className="mf-eyebrow"
        style={{ marginBottom: -6 }}
      >
        {selection.id
          ? `APPLYING TO · ${selection.name?.toUpperCase()}`
          : 'APPLYING · NO PREFERENCE'}
      </div>

      <Field label="NAME" required>
        <input
          className="mf-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          minLength={2}
          maxLength={120}
        />
      </Field>

      <Field label="EMAIL" required>
        <input
          type="email"
          className="mf-input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </Field>

      <Field label="PHONE" hint="Faster reply if you include it">
        <input
          type="tel"
          className="mf-input"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      </Field>

      <Field
        label="WHAT ARE YOU TRYING TO DO?"
        required
        hint="Tell your trainer what you want to accomplish — they read this before reaching out."
      >
        <textarea
          className="mf-input"
          rows={3}
          maxLength={300}
          minLength={3}
          required
          placeholder="e.g. Lose 20 lbs by summer, get stronger for hiking season, rehab a shoulder…"
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
        />
      </Field>

      <div
        className="mf-eyebrow"
        style={{ marginBottom: -6, marginTop: 8 }}
      >
        ABOUT YOU
      </div>
      <div
        className="mf-fg-mute"
        style={{ fontSize: 11, marginTop: -10, marginBottom: -4 }}
      >
        Trainers use this to write your first program — skip anything
        you&apos;d rather discuss in person.
      </div>

      <Field label="HEIGHT" hint="Optional">
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            className="mf-input"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="ft"
            value={heightFt}
            onChange={(e) => setHeightFt(e.target.value.replace(/\D/g, ''))}
            maxLength={1}
            style={{ width: 80 }}
          />
          <input
            className="mf-input"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="in"
            value={heightIn}
            onChange={(e) => setHeightIn(e.target.value.replace(/\D/g, ''))}
            maxLength={2}
            style={{ width: 80 }}
          />
        </div>
      </Field>

      <Field label="CURRENT WEIGHT" hint="lb · optional">
        <input
          className="mf-input"
          inputMode="decimal"
          placeholder="175"
          value={weightLb}
          onChange={(e) => setWeightLb(e.target.value)}
          style={{ width: 120 }}
        />
      </Field>

      <Field label="TRAINING EXPERIENCE" hint="Optional">
        <select
          className="mf-input"
          value={trainingExperience}
          onChange={(e) => setTrainingExperience(e.target.value)}
        >
          <option value="">— Select —</option>
          <option value="NONE">New to lifting</option>
          <option value="SOME">Some experience</option>
          <option value="INTERMEDIATE">Intermediate</option>
          <option value="ADVANCED">Advanced</option>
        </select>
      </Field>

      <Field label="PRIMARY GOAL" hint="Optional · helps your trainer match programming">
        <select
          className="mf-input"
          value={primaryGoal}
          onChange={(e) => setPrimaryGoal(e.target.value)}
        >
          <option value="">— Select —</option>
          <option value="LOSE_FAT">Lose fat</option>
          <option value="BUILD_MUSCLE">Build muscle</option>
          <option value="GET_STRONGER">Get stronger</option>
          <option value="SPORT_SPECIFIC">Sport-specific</option>
          <option value="GENERAL_HEALTH">General health</option>
          <option value="OTHER">Other</option>
        </select>
      </Field>

      <Field label="DAYS / WEEK YOU CAN TRAIN" hint="Optional">
        <select
          className="mf-input"
          value={daysPerWeek}
          onChange={(e) => setDaysPerWeek(e.target.value)}
          style={{ width: 120 }}
        >
          <option value="">—</option>
          {[1, 2, 3, 4, 5, 6, 7].map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </Field>

      <Field
        label="PREVIOUS INJURIES"
        hint="Optional · so your trainer can program around them"
      >
        <textarea
          className="mf-input"
          rows={2}
          maxLength={500}
          placeholder="e.g. Rotator cuff strain 2024 — still avoid overhead press"
          value={injuries}
          onChange={(e) => setInjuries(e.target.value)}
        />
      </Field>

      <Field
        label="PHYSICAL LIMITATIONS"
        hint="Optional · anything that affects how you move"
      >
        <textarea
          className="mf-input"
          rows={2}
          maxLength={500}
          placeholder="e.g. Bad knees on stairs, mild lower back from desk job"
          value={limitations}
          onChange={(e) => setLimitations(e.target.value)}
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

      <button
        type="submit"
        disabled={submitting}
        className="mf-btn mf-btn-primary"
        style={{ height: 44 }}
      >
        {submitting
          ? 'Submitting…'
          : waitlist
            ? 'Join waitlist'
            : 'Submit application →'}
      </button>
    </form>
  );
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label style={{ display: 'block' }}>
      <div
        style={{
          fontFamily: 'var(--font-mf-mono), monospace',
          fontSize: 10,
          letterSpacing: '.15em',
          color: 'var(--mf-fg-dim, #86868B)',
          marginBottom: 6,
        }}
      >
        {label}
        {required && (
          <span style={{ color: 'var(--mf-accent, #FF4D1C)', marginLeft: 4 }}>
            *
          </span>
        )}
      </div>
      {children}
      {hint && (
        <div
          style={{
            fontSize: 10,
            color: 'var(--mf-fg-mute, #6b6b70)',
            marginTop: 4,
          }}
        >
          {hint}
        </div>
      )}
    </label>
  );
}
