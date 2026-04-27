'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search, Edit, ChevronLeft, Send, User } from 'lucide-react';
import {
  Avatar,
  Btn,
  Chip,
  TrainerMobileTabs,
  AttachmentPicker,
  AttachmentBubble,
  PendingAttachmentChip,
  VoiceRecorder,
} from '@/components/ui/mf';
import type { AttachmentBubbleAttachment } from '@/components/ui/mf';
import { formatMessageDayDivider } from '@/lib/formatTime';

export interface InboxMobileRailItem {
  id: string;
  name: string | null;
  email: string;
  initials: string;
  image: string | null;
  lastPreview: string | null;
  unreadFromClient: number;
  lastAt: string | null;
}

export interface InboxMobileMessage {
  id: string;
  content: string;
  fromMe: boolean;
  at: string;
  type: 'TEXT' | 'IMAGE' | 'FILE' | 'VIDEO' | 'VOICE';
  attachment?: AttachmentBubbleAttachment | null;
}

export interface InboxMobileProps {
  selfId: string;
  rail: InboxMobileRailItem[];
  activeId: string | null;
  activeName: string | null;
  activeInitials: string;
  activeImage: string | null;
  initialThread: InboxMobileMessage[];
}

type FilterKey = 'ALL' | 'UNREAD' | 'FLAGGED';

function shortTime(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) {
    return d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }
  const yest = new Date(now);
  yest.setDate(now.getDate() - 1);
  const isYest =
    d.getFullYear() === yest.getFullYear() &&
    d.getMonth() === yest.getMonth() &&
    d.getDate() === yest.getDate();
  if (isYest) return 'YST';
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86_400_000);
  if (diffDays < 7) return `${diffDays}d`;
  return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit' }).toUpperCase();
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export default function InboxMobile({
  selfId,
  rail,
  activeId,
  activeName,
  activeInitials,
  activeImage,
  initialThread,
}: InboxMobileProps) {
  const router = useRouter();
  const [filter, setFilter] = useState<FilterKey>('ALL');
  const [messages, setMessages] = useState<InboxMobileMessage[]>(initialThread);
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState<{
    blob: Blob;
    mime: string;
    size: number;
    name: string | null;
    intent: 'image' | 'video' | 'voice' | 'file';
    durationSec?: number;
    width?: number;
    height?: number;
  } | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | undefined>(undefined);
  const [voiceMode, setVoiceMode] = useState(false);
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
      const data = (await res.json()) as Array<{
        id: string;
        content: string;
        senderId: string;
        createdAt: string;
        type?: string;
        attachment?: AttachmentBubbleAttachment | null;
      }>;
      setMessages(
        data.map((m) => ({
          id: m.id,
          content: m.content,
          fromMe: m.senderId === selfId,
          at: m.createdAt,
          type: (m.type ?? 'TEXT') as InboxMobileMessage['type'],
          attachment: (m.attachment ?? null) as AttachmentBubbleAttachment | null,
        })),
      );
    } catch {
      // ignore
    }
  }, [activeId, selfId]);

  // SSE with polling fallback, per active thread
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
            type?: string;
            attachment?: AttachmentBubbleAttachment | null;
          }>;
          if (!Array.isArray(payload) || payload.length === 0) return;
          setMessages((prev) => {
            const existingIds = new Set(
              prev.filter((m) => !m.id.startsWith('temp-')).map((m) => m.id),
            );
            const incoming = payload
              .filter((m) => !existingIds.has(m.id))
              .map((m) => ({
                id: m.id,
                content: m.content,
                fromMe: m.senderId === selfId,
                at: m.createdAt,
                type: (m.type ?? 'TEXT') as InboxMobileMessage['type'],
                attachment: (m.attachment ?? null) as AttachmentBubbleAttachment | null,
              }));
            if (!incoming.length) return prev;
            const withoutDupes = prev.filter(
              (m) =>
                !(
                  m.id.startsWith('temp-') &&
                  incoming.some((x) => x.fromMe === m.fromMe && x.content === m.content)
                ),
            );
            return [...withoutDupes, ...incoming];
          });
        } catch {
          // ignore malformed frames
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

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!activeId) return;
    const content = draft.trim();
    if (!content && !pending) return;
    setSending(true);
    setError(null);

    let attachmentMeta:
      | {
          url: string;
          mime: string;
          size: number;
          name?: string | null;
          durationSec?: number;
          width?: number;
          height?: number;
        }
      | null = null;
    let outgoingType: InboxMobileMessage['type'] = 'TEXT';

    if (pending) {
      setUploadProgress(0);
      try {
        const fd = new FormData();
        fd.append('intent', pending.intent);
        fd.append('receiverId', activeId);
        fd.append('file', pending.blob, pending.name ?? 'attachment');
        const upRes = await fetch('/api/messages/upload', {
          method: 'POST',
          body: fd,
        });
        if (!upRes.ok) {
          const err = (await upRes.json().catch(() => ({}))) as { error?: string };
          throw new Error(err.error ?? 'Upload failed');
        }
        const meta = (await upRes.json()) as {
          url: string;
          mime: string;
          size: number;
          name?: string | null;
        };
        attachmentMeta = {
          ...meta,
          durationSec: pending.durationSec,
          width: pending.width,
          height: pending.height,
        };
        outgoingType =
          pending.intent === 'image'
            ? 'IMAGE'
            : pending.intent === 'video'
              ? 'VIDEO'
              : pending.intent === 'voice'
                ? 'VOICE'
                : 'FILE';
        setUploadProgress(1);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Upload failed');
        setSending(false);
        setUploadProgress(undefined);
        return;
      }
    }

    const tempId = `temp-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      {
        id: tempId,
        content,
        fromMe: true,
        at: new Date().toISOString(),
        type: outgoingType,
        attachment: attachmentMeta as AttachmentBubbleAttachment | null,
      },
    ]);
    setDraft('');
    setPending(null);
    setUploadProgress(undefined);

    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiverId: activeId,
          content,
          type: outgoingType,
          attachment: attachmentMeta ?? undefined,
        }),
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

  const unreadTotal = rail.reduce((s, r) => s + r.unreadFromClient, 0);
  const visibleRail = rail.filter((r) => {
    if (filter === 'UNREAD') return r.unreadFromClient > 0;
    if (filter === 'FLAGGED') return false; // no flag state yet — visual filter only
    return true;
  });

  const filters: Array<{ k: FilterKey; label: string }> = [
    { k: 'ALL', label: `ALL · ${rail.length}` },
    { k: 'UNREAD', label: `UNREAD · ${unreadTotal}` },
    { k: 'FLAGGED', label: 'FLAGGED' },
  ];

  // Detail (thread) view when ?with=<id> is set
  if (activeId) {
    return (
      <div
        data-mf
        className="flex justify-center md:hidden mf-bg mf-fg"
        style={{ minHeight: '100vh' }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: 430,
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            borderInline: '1px solid var(--mf-hairline)',
          }}
        >
          {/* Thread header */}
          <div
            className="mf-s1 flex items-center gap-2"
            style={{
              height: 52,
              padding: '0 12px',
              borderBottom: '1px solid var(--mf-hairline)',
              flexShrink: 0,
            }}
          >
            <Link
              href="/trainer/messages"
              className="grid place-items-center rounded"
              style={{
                width: 36,
                height: 36,
                background: 'var(--mf-surface-2)',
              }}
              aria-label="Back to inbox"
            >
              <ChevronLeft size={16} />
            </Link>
            <Avatar
              initials={activeInitials}
              image={activeImage}
              alt={activeName ?? activeInitials}
              size={32}
              active
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {activeName}
              </div>
              <div
                className="mf-font-mono mf-fg-mute"
                style={{ fontSize: 9, letterSpacing: '0.1em' }}
              >
                CLIENT
              </div>
            </div>
            <Link
              href={`/trainer/clients/${activeId}`}
              className="grid place-items-center rounded"
              style={{
                width: 36,
                height: 36,
                background: 'var(--mf-surface-2)',
              }}
              aria-label="View profile"
            >
              <User size={14} />
            </Link>
          </div>

          {/* Messages */}
          <div
            className="mf-scroll"
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: 12,
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            {messages.length === 0 && (
              <div
                className="mf-fg-mute mf-font-mono"
                style={{
                  textAlign: 'center',
                  padding: '48px 16px',
                  fontSize: 10,
                  letterSpacing: '0.1em',
                }}
              >
                NO MESSAGES YET
              </div>
            )}
            {(() => {
              const grouped: Array<{ label: string; items: InboxMobileMessage[] }> = [];
              for (const m of messages) {
                const label = formatMessageDayDivider(m.at);
                const last = grouped[grouped.length - 1];
                if (last && last.label === label) last.items.push(m);
                else grouped.push({ label, items: [m] });
              }
              return grouped.map((g, gi) => (
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
                        {m.type !== 'TEXT' && m.attachment ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <AttachmentBubble
                              type={m.type as 'IMAGE' | 'VIDEO' | 'VOICE' | 'FILE'}
                              attachment={m.attachment}
                              fromMe={m.fromMe}
                              maxThumbWidth={240}
                            />
                            {m.content && (
                              <div
                                style={{
                                  padding: '8px 12px',
                                  borderRadius: 10,
                                  fontSize: 13,
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
                            )}
                          </div>
                        ) : (
                          <div
                            style={{
                              padding: '8px 12px',
                              borderRadius: 10,
                              fontSize: 13,
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
                        )}
                        <div
                          className="mf-font-mono mf-fg-mute"
                          style={{
                            fontSize: 9,
                            marginTop: 3,
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

          {/* Composer */}
          <div style={{ flexShrink: 0 }}>
            {voiceMode ? (
              <div style={{ padding: '8px 10px' }}>
                <VoiceRecorder
                  onSend={(blob, durationSec) => {
                    setPending({
                      blob,
                      mime: blob.type || 'audio/webm',
                      size: blob.size,
                      name: 'voice-note',
                      intent: 'voice',
                      durationSec,
                    });
                    setVoiceMode(false);
                  }}
                  onCancel={() => setVoiceMode(false)}
                />
              </div>
            ) : (
              <>
                {pending && (
                  <div style={{ padding: '0 10px' }}>
                    <PendingAttachmentChip
                      blob={pending.blob}
                      mime={pending.mime}
                      size={pending.size}
                      name={pending.name}
                      progress={uploadProgress}
                      onRemove={() => {
                        setPending(null);
                        setUploadProgress(undefined);
                      }}
                    />
                  </div>
                )}
                <form
                  onSubmit={handleSend}
                  style={{
                    borderTop: '1px solid var(--mf-hairline)',
                    padding: 10,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <AttachmentPicker
                    trigger="paperclip"
                    onPicked={(intent, file) => {
                      setPending({
                        blob: file,
                        mime: file.type,
                        size: file.size,
                        name: file.name,
                        intent,
                      });
                    }}
                    onVoiceRequest={() => setVoiceMode(true)}
                  />
                  <input
                    className="mf-input"
                    placeholder={`Reply…`}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    disabled={sending}
                    style={{ flex: 1, fontSize: 13, height: 36 }}
                  />
                  <Btn
                    variant="primary"
                    icon={Send}
                    type="submit"
                    disabled={sending || (!draft.trim() && !pending)}
                    aria-label="Send"
                  />
                </form>
              </>
            )}
          </div>
          {error && (
            <div
              className="mf-chip mf-chip-bad"
              style={{
                margin: '0 10px 10px',
                display: 'block',
                height: 'auto',
                padding: '6px 10px',
                fontSize: 11,
              }}
            >
              {error}
            </div>
          )}

          <TrainerMobileTabs active="inbox" unreadInbox={unreadTotal} />
        </div>
      </div>
    );
  }

  // Inbox list view
  return (
    <div
      data-mf
      className="flex justify-center md:hidden mf-bg mf-fg"
      style={{ minHeight: '100vh' }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 430,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          borderInline: '1px solid var(--mf-hairline)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '8px 16px',
            borderBottom: '1px solid var(--mf-hairline)',
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <div
                className="mf-font-mono mf-fg-mute"
                style={{
                  fontSize: 9,
                  textTransform: 'uppercase',
                  letterSpacing: '0.14em',
                }}
              >
                COACHING
              </div>
              <div
                className="mf-font-display"
                style={{
                  fontSize: 22,
                  letterSpacing: '-0.01em',
                  lineHeight: 1,
                  marginTop: 2,
                }}
              >
                INBOX
              </div>
            </div>
            <div className="flex gap-1">
              <button
                type="button"
                className="grid place-items-center rounded"
                style={{
                  width: 36,
                  height: 36,
                  background: 'var(--mf-surface-2)',
                }}
                aria-label="Search inbox"
              >
                <Search size={14} />
              </button>
              <button
                type="button"
                className="grid place-items-center rounded"
                style={{
                  width: 36,
                  height: 36,
                  background: 'var(--mf-accent)',
                  color: 'var(--mf-accent-ink)',
                }}
                aria-label="Compose"
              >
                <Edit size={14} />
              </button>
            </div>
          </div>
          {/* Filter chips */}
          <div
            className="flex gap-1"
            style={{ marginTop: 12, overflowX: 'auto', scrollbarWidth: 'none' }}
          >
            {filters.map((f) => {
              const active = filter === f.k;
              return (
                <button
                  key={f.k}
                  type="button"
                  onClick={() => setFilter(f.k)}
                  className="mf-font-mono"
                  style={{
                    fontSize: 9,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    padding: '4px 10px',
                    borderRadius: 4,
                    flexShrink: 0,
                    background: active ? 'var(--mf-accent)' : 'var(--mf-surface-3)',
                    color: active ? 'var(--mf-accent-ink)' : 'var(--mf-fg-dim)',
                  }}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Thread list */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {visibleRail.length === 0 && (
            <div
              className="mf-fg-mute mf-font-mono"
              style={{
                padding: '48px 16px',
                textAlign: 'center',
                fontSize: 11,
                letterSpacing: '0.1em',
              }}
            >
              {filter === 'UNREAD'
                ? 'NO UNREAD'
                : filter === 'FLAGGED'
                  ? 'NO FLAGGED'
                  : 'NO CONVERSATIONS'}
            </div>
          )}
          {visibleRail.map((r) => {
            const unread = r.unreadFromClient > 0;
            return (
              <Link
                key={r.id}
                href={`/trainer/messages?with=${r.id}`}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                  padding: '12px 16px',
                  borderBottom: '1px solid var(--mf-hairline)',
                  position: 'relative',
                  background: unread ? 'var(--mf-surface-1)' : 'transparent',
                }}
              >
                {unread && (
                  <span
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: 10,
                      bottom: 10,
                      width: 2,
                      background: 'var(--mf-accent)',
                    }}
                  />
                )}
                <Avatar
                  initials={r.initials}
                  image={r.image}
                  alt={r.name ?? r.email}
                  size={38}
                  active={unread}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="flex items-center justify-between">
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {r.name ?? r.email}
                    </span>
                    <span
                      className="mf-font-mono mf-fg-mute"
                      style={{ fontSize: 9, flexShrink: 0, marginLeft: 8 }}
                    >
                      {shortTime(r.lastAt)}
                    </span>
                  </div>
                  <div
                    className="mf-fg-dim"
                    style={{
                      fontSize: 11,
                      marginTop: 2,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {r.lastPreview ?? 'No messages yet'}
                  </div>
                </div>
                {unread && (
                  <div
                    className="mf-font-mono grid place-items-center"
                    style={{
                      flexShrink: 0,
                      width: 20,
                      height: 20,
                      borderRadius: 999,
                      fontSize: 9,
                      background: 'var(--mf-accent)',
                      color: 'var(--mf-accent-ink)',
                    }}
                  >
                    {r.unreadFromClient}
                  </div>
                )}
              </Link>
            );
          })}
        </div>

        <TrainerMobileTabs active="inbox" unreadInbox={unreadTotal} />
      </div>
    </div>
  );
}
