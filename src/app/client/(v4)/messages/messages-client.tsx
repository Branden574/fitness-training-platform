'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Paperclip, Send } from 'lucide-react';
import { Avatar, Chip } from '@/components/ui/mf';

interface Message {
  id: string;
  content: string;
  fromMe: boolean;
  at: string;
}

interface MessagesClientProps {
  selfId: string;
  selfInitials: string;
  trainer: { id: string; name: string | null; photoUrl: string | null };
  initialMessages: Message[];
}

function trainerInitials(name: string | null): string {
  if (!name) return 'CO';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
  return parts[0]!.slice(0, 2).toUpperCase();
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function formatDateHeader(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yest = new Date();
  yest.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'TODAY';
  if (d.toDateString() === yest.toDateString()) return 'YESTERDAY';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase();
}

export default function MessagesClient({
  selfId,
  trainer,
  initialMessages,
}: MessagesClientProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const fetchFull = useCallback(async () => {
    try {
      const res = await fetch(`/api/messages?with=${trainer.id}`, { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      setMessages(
        (data as Array<{ id: string; content: string; senderId: string; createdAt: string }>).map((m) => ({
          id: m.id,
          content: m.content,
          fromMe: m.senderId === selfId,
          at: m.createdAt,
        })),
      );
    } catch {
      // ignore transient errors
    }
  }, [trainer.id, selfId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Realtime: SSE stream pushes new messages as they arrive, with a polling fallback
  useEffect(() => {
    let es: EventSource | null = null;
    let pollId: ReturnType<typeof setInterval> | null = null;

    function startPolling() {
      pollId = setInterval(() => {
        if (document.visibilityState === 'visible') void fetchFull();
      }, 8000);
    }

    try {
      es = new EventSource(`/api/messages/stream?with=${trainer.id}`);
      es.onmessage = (evt) => {
        try {
          const payload = JSON.parse(evt.data) as Array<{
            id: string;
            content: string;
            senderId: string;
            createdAt: string;
          }>;
          if (!Array.isArray(payload) || payload.length === 0) return;
          setMessages((prev) => {
            const existingIds = new Set(prev.filter((m) => !m.id.startsWith('temp-')).map((m) => m.id));
            const incoming = payload
              .filter((m) => !existingIds.has(m.id))
              .map((m) => ({
                id: m.id,
                content: m.content,
                fromMe: m.senderId === selfId,
                at: m.createdAt,
              }));
            if (!incoming.length) return prev;
            // Drop optimistic temps that now have a real id with the same content
            const withoutDupes = prev.filter(
              (m) =>
                !(m.id.startsWith('temp-') &&
                  incoming.some((x) => x.fromMe === m.fromMe && x.content === m.content)),
            );
            return [...withoutDupes, ...incoming];
          });
        } catch {
          // Malformed frame — ignore
        }
      };
      es.onerror = () => {
        es?.close();
        es = null;
        if (!pollId) startPolling();
      };
    } catch {
      startPolling();
    }

    return () => {
      es?.close();
      if (pollId) clearInterval(pollId);
    };
  }, [trainer.id, selfId, fetchFull]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const content = draft.trim();
    if (!content) return;
    setSending(true);
    setError(null);

    // Optimistic append
    const tempId = `temp-${Date.now()}`;
    setMessages((prev) => [...prev, { id: tempId, content, fromMe: true, at: new Date().toISOString() }]);
    setDraft('');

    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiverId: trainer.id, content }),
      });
      if (!res.ok) throw new Error('Could not send');
      await fetchFull();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send');
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    } finally {
      setSending(false);
    }
  }

  // Group messages by date so we can show day chips
  const grouped: Array<{ label: string; items: Message[] }> = [];
  for (const m of messages) {
    const label = formatDateHeader(m.at);
    const last = grouped[grouped.length - 1];
    if (last && last.label === label) last.items.push(m);
    else grouped.push({ label, items: [m] });
  }

  return (
    <main
      className="flex flex-col md:hidden"
      style={{ height: '100%' }}
    >
      {/* Header */}
      <div
        style={{
          padding: '12px 20px',
          borderBottom: '1px solid var(--mf-hairline)',
          flexShrink: 0,
        }}
      >
        <div className="mf-eyebrow">COACH</div>
        <div className="flex items-center gap-3" style={{ marginTop: 4 }}>
          <Avatar
            initials={trainerInitials(trainer.name)}
            image={trainer.photoUrl}
            alt={trainer.name ?? 'Your coach'}
            active
          />
          <div>
            <div
              className="mf-font-display"
              style={{ fontSize: 18, letterSpacing: '-0.01em' }}
            >
              {(trainer.name ?? 'Your coach').toUpperCase()}
            </div>
            <div className="mf-font-mono mf-fg-mute" style={{ fontSize: 10 }}>
              HEAD COACH
            </div>
          </div>
        </div>
      </div>

      {/* Thread */}
      <div
        className="mf-scroll"
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 16px',
          background: 'var(--mf-bg)',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        {grouped.length === 0 && (
          <div
            className="mf-fg-mute mf-font-mono"
            style={{ textAlign: 'center', padding: '48px 24px', fontSize: 11, letterSpacing: '0.1em' }}
          >
            NO MESSAGES YET. SAY HI.
          </div>
        )}
        {grouped.map((g, gi) => (
          <div key={gi} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ textAlign: 'center' }}>
              <Chip>{g.label}</Chip>
            </div>
            {g.items.map((m) => (
              <div
                key={m.id}
                style={{
                  display: 'flex',
                  justifyContent: m.fromMe ? 'flex-end' : 'flex-start',
                }}
              >
                <div style={{ maxWidth: '78%' }}>
                  <div
                    style={{
                      padding: '10px 14px',
                      borderRadius: 10,
                      fontSize: 14,
                      lineHeight: 1.4,
                      background: m.fromMe ? 'var(--mf-accent)' : 'var(--mf-surface-3)',
                      color: m.fromMe ? 'var(--mf-accent-ink)' : 'var(--mf-fg)',
                      borderTopRightRadius: m.fromMe ? 4 : undefined,
                      borderTopLeftRadius: m.fromMe ? undefined : 4,
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                    }}
                  >
                    {m.content}
                  </div>
                  <div
                    className="mf-font-mono mf-fg-mute"
                    style={{
                      fontSize: 9,
                      marginTop: 4,
                      textAlign: m.fromMe ? 'right' : 'left',
                    }}
                  >
                    {formatTime(m.at)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {/* Composer */}
      <form
        onSubmit={handleSend}
        style={{
          borderTop: '1px solid var(--mf-hairline)',
          padding: '8px 12px',
          paddingBottom: 'max(8px, env(safe-area-inset-bottom))',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flexShrink: 0,
        }}
      >
        <button
          type="button"
          className="mf-btn mf-btn-ghost"
          style={{ height: 36, width: 36, padding: 0 }}
          aria-label="Attach"
        >
          <Paperclip size={16} />
        </button>
        <input
          className="mf-input"
          style={{ height: 40 }}
          placeholder={`Message ${(trainer.name ?? 'your coach').split(' ')[0]}…`}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          disabled={sending}
        />
        <button
          type="submit"
          disabled={sending || !draft.trim()}
          className="mf-btn mf-btn-primary"
          style={{ height: 40, width: 40, padding: 0 }}
          aria-label="Send"
        >
          <Send size={16} />
        </button>
      </form>

      {error && (
        <div
          className="mf-chip mf-chip-bad"
          style={{ margin: '0 16px 8px', display: 'block', height: 'auto', padding: '6px 10px' }}
          role="alert"
        >
          {error}
        </div>
      )}
    </main>
  );
}
