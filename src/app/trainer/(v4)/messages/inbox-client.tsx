'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Paperclip, Send, User } from 'lucide-react';
import { Avatar, Btn, Chip } from '@/components/ui/mf';
import { formatMessageDayDivider } from '@/lib/formatTime';

interface RailItem {
  id: string;
  name: string | null;
  email: string;
  initials: string;
  image: string | null;
  lastPreview: string | null;
  unreadFromClient: number;
  lastAt: string | null;
}

interface Message {
  id: string;
  content: string;
  fromMe: boolean;
  at: string;
}

interface Props {
  selfId: string;
  rail: RailItem[];
  activeId: string | null;
  activeName: string | null;
  activeInitials: string;
  activeImage: string | null;
  initialThread: Message[];
  totalUnread: number;
}

function relative(iso: string | null): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export default function TrainerInboxClient({
  selfId,
  rail,
  activeId,
  activeName,
  activeInitials,
  activeImage,
  initialThread,
  totalUnread,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<Message[]>(initialThread);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMessages(initialThread), [initialThread, activeId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchFull = useCallback(async () => {
    if (!activeId) return;
    try {
      const res = await fetch(`/api/messages?with=${activeId}`, { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      setMessages(
        (data as Array<{ id: string; content: string; senderId: string; createdAt: string }>).map(
          (m) => ({
            id: m.id,
            content: m.content,
            fromMe: m.senderId === selfId,
            at: m.createdAt,
          }),
        ),
      );
    } catch {
      // ignore
    }
  }, [activeId, selfId]);

  // Realtime: SSE stream with polling fallback per active thread
  useEffect(() => {
    if (!activeId) return;
    let es: EventSource | null = null;
    let pollId: ReturnType<typeof setInterval> | null = null;

    function startPolling() {
      pollId = setInterval(() => {
        if (document.visibilityState === 'visible') void fetchFull();
      }, 8000);
    }

    try {
      es = new EventSource(`/api/messages/stream?with=${activeId}`);
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
  }, [activeId, selfId, fetchFull]);

  const filteredRail = rail.filter((r) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (r.name ?? '').toLowerCase().includes(q) || r.email.toLowerCase().includes(q);
  });

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!activeId) return;
    const content = draft.trim();
    if (!content) return;
    setSending(true);
    setError(null);

    const tempId = `temp-${Date.now()}`;
    setMessages((prev) => [...prev, { id: tempId, content, fromMe: true, at: new Date().toISOString() }]);
    setDraft('');

    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiverId: activeId, content }),
      });
      if (!res.ok) throw new Error('Could not send');
      await fetchFull();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send');
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    } finally {
      setSending(false);
    }
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', height: '100%' }}>
      {/* Left rail */}
      <div
        className="mf-scroll"
        style={{ borderRight: '1px solid var(--mf-hairline)', overflowY: 'auto' }}
      >
        <div style={{ padding: 12, borderBottom: '1px solid var(--mf-hairline)' }}>
          <input
            className="mf-input"
            placeholder="Search conversations…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ height: 36, fontSize: 13 }}
          />
          {totalUnread > 0 && (
            <div className="mf-font-mono mf-fg-mute" style={{ fontSize: 10, marginTop: 8, letterSpacing: '0.1em' }}>
              {totalUnread} UNREAD
            </div>
          )}
        </div>
        {filteredRail.length === 0 && (
          <div
            className="mf-fg-mute mf-font-mono"
            style={{ padding: 24, textAlign: 'center', fontSize: 11, letterSpacing: '0.1em' }}
          >
            NO CLIENTS {query ? 'MATCHING' : 'YET'}
          </div>
        )}
        {filteredRail.map((r) => {
          const active = r.id === activeId;
          return (
            <Link
              key={r.id}
              href={`/trainer/messages?with=${r.id}`}
              className="flex gap-3"
              style={{
                padding: 12,
                borderBottom: '1px solid var(--mf-hairline)',
                background: active ? 'var(--mf-surface-3)' : 'transparent',
                position: 'relative',
              }}
            >
              {active && (
                <span
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 8,
                    bottom: 8,
                    width: 2,
                    background: 'var(--mf-accent)',
                  }}
                />
              )}
              <Avatar initials={r.initials} image={r.image} alt={r.name ?? r.email} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="flex items-center justify-between">
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {r.name ?? r.email}
                  </span>
                  <span className="mf-font-mono mf-fg-mute" style={{ fontSize: 10 }}>
                    {relative(r.lastAt)}
                  </span>
                </div>
                <div
                  className="mf-fg-dim"
                  style={{
                    fontSize: 12,
                    marginTop: 2,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {r.lastPreview ?? <span className="mf-fg-mute">No messages yet</span>}
                </div>
              </div>
              {r.unreadFromClient > 0 && (
                <span
                  className="mf-font-mono self-center"
                  style={{
                    fontSize: 9,
                    padding: '2px 6px',
                    borderRadius: 4,
                    background: 'var(--mf-accent)',
                    color: 'var(--mf-accent-ink)',
                  }}
                >
                  {r.unreadFromClient}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* Thread */}
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        {activeId ? (
          <>
            <div
              className="mf-s1 flex items-center justify-between"
              style={{
                height: 56,
                padding: '0 24px',
                borderBottom: '1px solid var(--mf-hairline)',
                flexShrink: 0,
              }}
            >
              <div className="flex items-center gap-3">
                <Avatar
                  initials={activeInitials}
                  image={activeImage}
                  alt={activeName ?? activeInitials}
                  active
                />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>
                    {activeName}
                  </div>
                  <div className="mf-font-mono mf-fg-mute" style={{ fontSize: 10 }}>
                    CLIENT
                  </div>
                </div>
              </div>
              <div className="flex gap-1">
                {activeId && (
                  <Link href={`/trainer/clients/${activeId}`}>
                    <Btn variant="ghost" icon={User}>View profile</Btn>
                  </Link>
                )}
              </div>
            </div>
            <div
              className="mf-scroll"
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: 24,
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}
            >
              {messages.length === 0 && (
                <div
                  className="mf-fg-mute mf-font-mono"
                  style={{
                    textAlign: 'center',
                    padding: '48px 24px',
                    fontSize: 11,
                    letterSpacing: '0.1em',
                  }}
                >
                  NO MESSAGES YET
                </div>
              )}
              {(() => {
                const grouped: Array<{ label: string; items: Message[] }> = [];
                for (const m of messages) {
                  const label = formatMessageDayDivider(m.at);
                  const last = grouped[grouped.length - 1];
                  if (last && last.label === label) last.items.push(m);
                  else grouped.push({ label, items: [m] });
                }
                return grouped.map((g, gi) => (
                  <div key={gi} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ textAlign: 'center' }}>
                      <Chip>{g.label}</Chip>
                    </div>
                    {g.items.map((m) => (
                      <div
                        key={m.id}
                        style={{ display: 'flex', justifyContent: m.fromMe ? 'flex-end' : 'flex-start' }}
                      >
                        <div style={{ maxWidth: '60%' }}>
                          <div
                            style={{
                              padding: '10px 16px',
                              borderRadius: 10,
                              fontSize: 14,
                              lineHeight: 1.4,
                              background: m.fromMe ? 'var(--mf-accent)' : 'var(--mf-surface-2)',
                              color: m.fromMe ? 'var(--mf-accent-ink)' : 'var(--mf-fg)',
                              border: m.fromMe ? 'none' : '1px solid var(--mf-hairline)',
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
                ));
              })()}
              <div ref={endRef} />
            </div>
            <form
              onSubmit={handleSend}
              style={{
                borderTop: '1px solid var(--mf-hairline)',
                padding: 12,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                flexShrink: 0,
              }}
            >
              <Btn variant="ghost" icon={Paperclip} type="button" aria-label="Attach" />
              <input
                className="mf-input"
                placeholder={`Reply to ${activeName ?? 'client'}…`}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                disabled={sending}
              />
              <Btn variant="primary" icon={Send} type="submit" disabled={sending || !draft.trim()}>
                Send
              </Btn>
            </form>
            {error && (
              <div
                className="mf-chip mf-chip-bad"
                style={{ margin: '0 12px 12px', display: 'block', height: 'auto', padding: '8px 12px' }}
              >
                {error}
              </div>
            )}
          </>
        ) : (
          <div
            className="mf-fg-mute mf-font-mono"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              fontSize: 12,
              letterSpacing: '0.1em',
            }}
          >
            NO CONVERSATIONS. INVITE AN ATHLETE TO GET STARTED.
          </div>
        )}
      </div>
    </div>
  );
}
