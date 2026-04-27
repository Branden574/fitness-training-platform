'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, Send } from 'lucide-react';
import {
  Avatar,
  Btn,
  Chip,
  ClientDesktopShell,
  StatusDot,
  AttachmentPicker,
  AttachmentBubble,
  PendingAttachmentChip,
} from '@/components/ui/mf';
import type { AttachmentBubbleAttachment } from '@/components/ui/mf';
import { formatMessageDayDivider } from '@/lib/formatTime';

interface Message {
  id: string;
  content: string;
  fromMe: boolean;
  at: string;
  type: 'TEXT' | 'IMAGE' | 'FILE' | 'VIDEO' | 'VOICE';
  attachment?: AttachmentBubbleAttachment | null;
  read?: boolean;
}

export interface MessagesDesktopProps {
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

function relativeShort(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'NOW';
  if (mins < 60) return `${mins}M`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}H`;
  const days = Math.floor(hours / 24);
  return `${days}D`;
}

export default function MessagesDesktop({
  selfId,
  selfInitials,
  trainer,
  initialMessages,
}: MessagesDesktopProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
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
  const router = useRouter();
  const searchParams = useSearchParams();

  const fetchFull = useCallback(async () => {
    try {
      const res = await fetch(`/api/messages?with=${trainer.id}`, { cache: 'no-store' });
      if (!res.ok) return;
      const data = (await res.json()) as Array<{
        id: string;
        content: string;
        senderId: string;
        createdAt: string;
        type?: string;
        attachment?: AttachmentBubbleAttachment | null;
        read?: boolean;
      }>;
      setMessages(
        data.map((m) => ({
          id: m.id,
          content: m.content,
          fromMe: m.senderId === selfId,
          at: m.createdAt,
          type: (m.type ?? 'TEXT') as Message['type'],
          attachment: (m.attachment ?? null) as AttachmentBubbleAttachment | null,
          read: m.read ?? true,
        })),
      );
    } catch {
      // ignore transient errors
    }
  }, [trainer.id, selfId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // One-shot prefill: the workout completion panel and other deeplinks can
  // open this page with ?draft=<text>. We seed the composer with that text
  // and then clear the query string so it doesn't re-prefill on remount.
  const prefillRanRef = useRef(false);
  useEffect(() => {
    if (prefillRanRef.current) return;
    prefillRanRef.current = true;
    const value = searchParams?.get('draft');
    if (value) {
      setDraft(value);
      router.replace('/client/messages');
    }
  }, [searchParams, router]);

  // Realtime: SSE stream pushes new messages, with polling fallback — mirrors mobile client.
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
            type?: string;
            attachment?: AttachmentBubbleAttachment | null;
            read?: boolean;
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
                type: (m.type ?? 'TEXT') as Message['type'],
                attachment: (m.attachment ?? null) as AttachmentBubbleAttachment | null,
                read: m.read ?? true,
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
    let outgoingType: Message['type'] = 'TEXT';

    if (pending) {
      setUploadProgress(0);
      try {
        const fd = new FormData();
        fd.append('intent', pending.intent);
        fd.append('receiverId', trainer.id);
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
          receiverId: trainer.id,
          content,
          type: outgoingType,
          attachment: attachmentMeta ?? undefined,
        }),
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

  const coachName = trainer.name ?? 'Your coach';
  const coachInits = trainerInitials(trainer.name);
  const lastMsg = messages[messages.length - 1];
  const lastPreview = lastMsg?.content ?? 'No messages yet';
  const lastStamp = lastMsg ? relativeShort(lastMsg.at) : '';
  // Unread = received messages I haven't read yet. Server marks-read happens
  // on GET /api/messages?with=…, so by the time this thread is open and
  // fetchFull has run, the count will be 0. SSE-pushed messages arrive
  // unread (read defaults false on server insert) and decrement on next poll.
  const unreadCount = messages.filter(
    (m) => !m.fromMe && !m.id.startsWith('temp-') && m.read === false,
  ).length;

  // Group messages by day so we can show iMessage-style date dividers.
  const grouped: Array<{ label: string; items: Message[] }> = [];
  for (const m of messages) {
    const label = formatMessageDayDivider(m.at);
    const last = grouped[grouped.length - 1];
    if (last && last.label === label) last.items.push(m);
    else grouped.push({ label, items: [m] });
  }

  return (
    <div className="hidden md:block">
      <ClientDesktopShell
        active="messages"
        title="Messages"
        breadcrumbs="CONNECT"
        athleteInitials={selfInitials}
        athleteName="You"
        athleteMeta={trainer.name ? `COACH · ${trainer.name.toUpperCase()}` : undefined}
      >
        <div className="flex" style={{ height: 'calc(100vh - 56px)' }}>
          {/* Thread list rail */}
          <div
            className="shrink-0 mf-scroll"
            style={{
              width: 320,
              borderRight: '1px solid var(--mf-hairline)',
              background: 'var(--mf-surface-1)',
              overflowY: 'auto',
            }}
          >
            <div
              style={{
                padding: 12,
                borderBottom: '1px solid var(--mf-hairline)',
              }}
            >
              <div style={{ position: 'relative' }}>
                <Search
                  size={12}
                  className="mf-fg-mute"
                  style={{
                    position: 'absolute',
                    left: 10,
                    top: '50%',
                    transform: 'translateY(-50%)',
                  }}
                />
                <input
                  className="mf-input"
                  style={{ height: 32, paddingLeft: 28, fontSize: 12, width: '100%' }}
                  placeholder="Search…"
                />
              </div>
            </div>
            <div
              className="flex gap-3"
              style={{
                padding: '12px 16px',
                borderBottom: '1px solid var(--mf-hairline)',
                background: 'var(--mf-surface-3)',
                position: 'relative',
                cursor: 'pointer',
              }}
            >
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
              <Avatar
                initials={coachInits}
                image={trainer.photoUrl}
                alt={coachName}
                size={36}
                active
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
                    {coachName}
                  </span>
                  <span className="mf-font-mono mf-fg-mute" style={{ fontSize: 9 }}>
                    {lastStamp}
                  </span>
                </div>
                <div
                  className="mf-font-mono mf-fg-mute"
                  style={{ fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase' }}
                >
                  HEAD COACH
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
                  {lastPreview}
                </div>
              </div>
              {unreadCount > 0 && (
                <div
                  className="mf-font-mono grid place-items-center"
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 999,
                    fontSize: 9,
                    background: 'var(--mf-accent)',
                    color: 'var(--mf-accent-ink)',
                    alignSelf: 'center',
                  }}
                >
                  {unreadCount > 99 ? '99+' : unreadCount}
                </div>
              )}
            </div>
            <div
              className="mf-font-mono mf-fg-mute"
              style={{
                fontSize: 10,
                letterSpacing: '0.1em',
                padding: '16px 16px 8px',
                textTransform: 'uppercase',
              }}
            >
              Only thread · Coach
            </div>
          </div>

          {/* Thread view */}
          <div className="flex-1 flex flex-col" style={{ minWidth: 0 }}>
            {/* Thread header */}
            <div
              className="flex items-center gap-3 shrink-0"
              style={{
                height: 56,
                borderBottom: '1px solid var(--mf-hairline)',
                padding: '0 20px',
              }}
            >
              <Avatar
                initials={coachInits}
                image={trainer.photoUrl}
                alt={coachName}
                size={36}
                active
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1 }}>{coachName}</div>
                <div
                  className="mf-font-mono mf-fg-mute flex items-center gap-2"
                  style={{ fontSize: 10, marginTop: 4 }}
                >
                  <StatusDot kind="active" /> ONLINE · HEAD COACH
                </div>
              </div>
            </div>

            {/* Thread body */}
            <div
              className="flex-1 mf-scroll"
              style={{
                overflowY: 'auto',
                padding: '24px 24px',
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
              }}
            >
              {messages.length === 0 && (
                <div
                  className="mf-fg-mute mf-font-mono"
                  style={{
                    textAlign: 'center',
                    padding: '64px 24px',
                    fontSize: 11,
                    letterSpacing: '0.1em',
                  }}
                >
                  NO MESSAGES YET. SAY HI.
                </div>
              )}
              {grouped.map((g, gi) => (
                <div key={gi} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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
                      <div style={{ maxWidth: '60%' }}>
                        {m.type !== 'TEXT' && m.attachment ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <AttachmentBubble
                              type={m.type as 'IMAGE' | 'VIDEO' | 'VOICE' | 'FILE'}
                              attachment={m.attachment}
                              fromMe={m.fromMe}
                              maxThumbWidth={320}
                            />
                            {m.content && (
                              <div
                                style={{
                                  padding: '10px 16px',
                                  fontSize: 13,
                                  lineHeight: 1.5,
                                  background: m.fromMe
                                    ? 'var(--mf-accent)'
                                    : 'var(--mf-surface-2)',
                                  color: m.fromMe ? 'var(--mf-accent-ink)' : 'var(--mf-fg)',
                                  borderRadius: m.fromMe
                                    ? '12px 12px 3px 12px'
                                    : '12px 12px 12px 3px',
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
                              padding: '10px 16px',
                              fontSize: 13,
                              lineHeight: 1.5,
                              background: m.fromMe ? 'var(--mf-accent)' : 'var(--mf-surface-2)',
                              color: m.fromMe ? 'var(--mf-accent-ink)' : 'var(--mf-fg)',
                              borderRadius: m.fromMe ? '12px 12px 3px 12px' : '12px 12px 12px 3px',
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
            <div
              className="shrink-0"
              style={{
                borderTop: '1px solid var(--mf-hairline)',
                padding: 16,
              }}
            >
              {error && (
                <div
                  className="mf-chip mf-chip-bad"
                  style={{
                    marginBottom: 8,
                    display: 'inline-block',
                    height: 'auto',
                    padding: '6px 10px',
                  }}
                  role="alert"
                >
                  {error}
                </div>
              )}
              {pending && (
                <div style={{ marginBottom: 8 }}>
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
                className="mf-card flex items-center gap-2"
                style={{ padding: 8 }}
              >
                <AttachmentPicker
                  trigger="plus"
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
                  triggerClassName="grid place-items-center mf-fg-mute"
                />
                <input
                  className="flex-1"
                  style={{
                    background: 'transparent',
                    outline: 'none',
                    border: 'none',
                    fontSize: 13,
                    color: 'var(--mf-fg)',
                  }}
                  placeholder={`Message ${coachName.split(' ')[0]}…`}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  disabled={sending}
                />
                <Btn
                  type="submit"
                  variant="primary"
                  icon={Send}
                  disabled={sending || (!draft.trim() && !pending)}
                >
                  Send
                </Btn>
              </form>
            </div>
          </div>
        </div>
      </ClientDesktopShell>
    </div>
  );
}
