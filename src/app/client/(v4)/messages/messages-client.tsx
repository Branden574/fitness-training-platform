'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Send } from 'lucide-react';
import { Avatar, Chip, AttachmentPicker, AttachmentBubble, PendingAttachmentChip } from '@/components/ui/mf';
import type { AttachmentBubbleAttachment } from '@/components/ui/mf';
import { formatMessageDayDivider } from '@/lib/formatTime';

interface Message {
  id: string;
  content: string;
  fromMe: boolean;
  at: string;
  type: 'TEXT' | 'IMAGE' | 'FILE' | 'VIDEO' | 'VOICE';
  attachment?: AttachmentBubbleAttachment | null;
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

export default function MessagesClient({
  selfId,
  trainer,
  initialMessages,
}: MessagesClientProps) {
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
      }>;
      setMessages(
        data.map((m) => ({
          id: m.id,
          content: m.content,
          fromMe: m.senderId === selfId,
          at: m.createdAt,
          type: (m.type ?? 'TEXT') as Message['type'],
          attachment: (m.attachment ?? null) as AttachmentBubbleAttachment | null,
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
            type?: string;
            attachment?: AttachmentBubbleAttachment | null;
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
                type: (m.type ?? 'TEXT') as Message['type'],
                attachment: (m.attachment ?? null) as AttachmentBubbleAttachment | null,
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

  // Group messages by date so we can show day chips
  const grouped: Array<{ label: string; items: Message[] }> = [];
  for (const m of messages) {
    const label = formatMessageDayDivider(m.at);
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
                            padding: '10px 14px',
                            borderRadius: 10,
                            fontSize: 14,
                            lineHeight: 1.4,
                            background: m.fromMe ? 'var(--mf-accent)' : 'var(--mf-surface-3)',
                            color: m.fromMe ? 'var(--mf-accent-ink)' : 'var(--mf-fg)',
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
      <div style={{ flexShrink: 0 }}>
        {pending && (
          <div style={{ padding: '0 12px' }}>
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
            padding: '8px 12px',
            paddingBottom: 'max(8px, env(safe-area-inset-bottom))',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
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
            style={{ height: 40 }}
            placeholder={`Message ${(trainer.name ?? 'your coach').split(' ')[0]}…`}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            disabled={sending}
          />
          <button
            type="submit"
            disabled={sending || (!draft.trim() && !pending)}
            className="mf-btn mf-btn-primary"
            style={{ height: 40, width: 40, padding: 0 }}
            aria-label="Send"
          >
            <Send size={16} />
          </button>
        </form>
      </div>

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
