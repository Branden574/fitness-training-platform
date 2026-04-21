import 'server-only';

// Per-user SSE subscriber registry. This is the server-side in-memory pub/sub
// that the /api/notifications/stream route registers into on open and
// dispatch.ts publishes to on create. A single user may have multiple open
// tabs (or devices) — each gets its own controller.
//
// TODO: Redis pub/sub when scaling. Railway currently deploys with numReplicas=1,
// so module-scoped Map is safe. The moment we scale horizontally this needs to
// become a Redis-backed pub/sub channel keyed on userId; swap the Map for a
// thin client that publishes to Redis and subscribes per-connection. Keep the
// exported surface (subscribe/unsubscribe/publishToUser) identical so only the
// internals change.

type SSEController = ReadableStreamDefaultController<Uint8Array>;

const encoder = new TextEncoder();
const registry = new Map<string, Set<SSEController>>();

export interface SSEEvent {
  event?: string;
  data: unknown;
  id?: string;
}

function formatSSE(evt: SSEEvent): Uint8Array {
  const lines: string[] = [];
  if (evt.event) lines.push(`event: ${evt.event}`);
  if (evt.id) lines.push(`id: ${evt.id}`);
  const data = typeof evt.data === 'string' ? evt.data : JSON.stringify(evt.data);
  // Multi-line data needs each line prefixed with `data: ` per the SSE spec.
  for (const line of data.split('\n')) lines.push(`data: ${line}`);
  return encoder.encode(lines.join('\n') + '\n\n');
}

export function subscribe(userId: string, controller: SSEController): () => void {
  let set = registry.get(userId);
  if (!set) {
    set = new Set();
    registry.set(userId, set);
  }
  set.add(controller);
  return () => {
    const s = registry.get(userId);
    if (!s) return;
    s.delete(controller);
    if (s.size === 0) registry.delete(userId);
  };
}

export function publishToUser(userId: string, evt: SSEEvent): number {
  const subs = registry.get(userId);
  if (!subs || subs.size === 0) return 0;
  const chunk = formatSSE(evt);
  let delivered = 0;
  for (const controller of subs) {
    try {
      controller.enqueue(chunk);
      delivered++;
    } catch {
      // Controller is already closed/errored — subscription cleanup will
      // remove it when the request aborts; silently skip here.
    }
  }
  return delivered;
}

/** Heartbeat keeps idle proxies from closing the connection. */
export function heartbeat(controller: SSEController): void {
  try {
    controller.enqueue(encoder.encode(': ping\n\n'));
  } catch {
    // Controller closed — ignore; the request-abort handler tears down.
  }
}

export function connectionCount(userId: string): number {
  return registry.get(userId)?.size ?? 0;
}
