// src/components/ui/mf/VoiceRecorder.tsx
//
// Tap-to-start / tap-to-stop voice recording UI. Uses the browser's
// MediaRecorder API (works inside the Capacitor WebView with the right
// native permission). Returns a Blob + duration via onSend; calls onCancel
// to bail. The composer swaps to this component when the user taps "Voice
// note" in AttachmentPicker.

'use client';

import { useEffect, useRef, useState } from 'react';
import { Mic, Send, X } from 'lucide-react';

export interface VoiceRecorderProps {
  onSend: (blob: Blob, durationSec: number) => void;
  onCancel: () => void;
}

function pickMime(): string {
  const candidates = ['audio/webm', 'audio/mp4', 'audio/mpeg'];
  if (typeof MediaRecorder === 'undefined') return 'audio/webm';
  for (const m of candidates) {
    if ((MediaRecorder as unknown as { isTypeSupported?: (s: string) => boolean }).isTypeSupported?.(m)) {
      return m;
    }
  }
  return 'audio/webm';
}

export default function VoiceRecorder({ onSend, onCancel }: VoiceRecorderProps) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef<number>(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        const mime = pickMime();
        const rec = new MediaRecorder(stream, { mimeType: mime });
        rec.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
        };
        rec.start();
        recorderRef.current = rec;
        startedAtRef.current = Date.now();
        setRecording(true);
        tickRef.current = setInterval(() => {
          setSeconds(Math.floor((Date.now() - startedAtRef.current) / 1000));
        }, 250);
      } catch (err) {
        setError(
          err instanceof Error && err.name === 'NotAllowedError'
            ? 'Microphone permission needed'
            : 'Could not start recording',
        );
      }
    }
    void start();
    return () => {
      cancelled = true;
      if (tickRef.current) clearInterval(tickRef.current);
      const rec = recorderRef.current;
      if (rec && rec.state !== 'inactive') {
        try {
          rec.stop();
        } catch {
          // already stopped
        }
      }
      rec?.stream.getTracks().forEach((t) => t.stop());
    };
  }, []);

  function handleSend() {
    const rec = recorderRef.current;
    if (!rec) return;
    if (tickRef.current) clearInterval(tickRef.current);
    const finalDuration = Math.max(1, Math.floor((Date.now() - startedAtRef.current) / 1000));
    rec.addEventListener(
      'stop',
      () => {
        const mime = rec.mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: mime });
        onSend(blob, finalDuration);
      },
      { once: true },
    );
    try {
      rec.stop();
    } catch {
      // already stopped, fall through
    }
    rec.stream.getTracks().forEach((t) => t.stop());
  }

  function handleCancel() {
    if (tickRef.current) clearInterval(tickRef.current);
    const rec = recorderRef.current;
    if (rec && rec.state !== 'inactive') {
      try {
        rec.stop();
      } catch {
        // already stopped
      }
    }
    rec?.stream.getTracks().forEach((t) => t.stop());
    onCancel();
  }

  if (error) {
    return (
      <div
        className="mf-card mf-chip-bad"
        style={{
          padding: 10,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 13,
        }}
      >
        <span>{error}</span>
        <button
          type="button"
          onClick={handleCancel}
          style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer' }}
        >
          Dismiss
        </button>
      </div>
    );
  }

  const mm = Math.floor(seconds / 60);
  const ss = seconds % 60;
  return (
    <div
      className="mf-card"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '8px 12px',
      }}
    >
      <span
        aria-hidden
        style={{
          width: 10,
          height: 10,
          borderRadius: 999,
          background: '#ff3b30',
          animation: recording ? 'mf-pulse 1.2s ease-in-out infinite' : undefined,
        }}
      />
      <Mic size={16} className="mf-fg-mute" />
      <span style={{ flex: 1, fontFamily: 'monospace', fontSize: 13 }}>
        {`${mm}:${String(ss).padStart(2, '0')}`}
      </span>
      <button
        type="button"
        onClick={handleCancel}
        aria-label="Cancel recording"
        className="mf-btn mf-btn-ghost"
        style={{ height: 32, width: 32, padding: 0 }}
      >
        <X size={14} />
      </button>
      <button
        type="button"
        onClick={handleSend}
        aria-label="Send voice note"
        className="mf-btn mf-btn-primary"
        style={{ height: 32, width: 32, padding: 0 }}
      >
        <Send size={14} />
      </button>
    </div>
  );
}
