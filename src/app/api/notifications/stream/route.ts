import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { subscribe, heartbeat } from '@/lib/notifications/sse-registry';

// SSE stream for real-time notifications. Consumed by the NotificationBell
// component via `new EventSource('/api/notifications/stream')`. Events
// dispatched via `publishToUser` in sse-registry land here.
//
// Critical details:
// - `runtime = 'nodejs'` is required — streaming responses with ReadableStream
//   work on Node runtime; Edge has stricter WebStream handling that can cut
//   idle connections early on our proxy.
// - `dynamic = 'force-dynamic'` prevents Next's static cache from short-circuiting
//   this handler.
// - Heartbeat every 25s defeats Railway's HTTP idle-timeout (~30s).
// - Clean up registry entry on request.signal.aborted. EventSource's auto-
//   reconnect means the browser may repeatedly open new streams — each open
//   is a new controller; the old one is cleaned up by the abort handler.
// - X-Accel-Buffering: no tells nginx/cloudflare not to buffer, critical for
//   low-latency delivery.

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = session.user.id;

  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | null = null;
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      // Initial event so the client knows the stream is live (and sets
      // connected=true in the store). `retry: 2000` hints the browser to
      // reconnect after 2s if the stream drops.
      controller.enqueue(encoder.encode('retry: 2000\n\n'));
      controller.enqueue(
        encoder.encode(`event: ready\ndata: ${JSON.stringify({ userId })}\n\n`),
      );

      unsubscribe = subscribe(userId, controller);

      heartbeatTimer = setInterval(() => heartbeat(controller), 25_000);

      // Tear down when the client disconnects (tab closed, navigation,
      // EventSource.close()). AbortSignal fires once per request abort.
      const onAbort = () => {
        if (heartbeatTimer) {
          clearInterval(heartbeatTimer);
          heartbeatTimer = null;
        }
        if (unsubscribe) {
          unsubscribe();
          unsubscribe = null;
        }
        try {
          controller.close();
        } catch {
          // controller may already be closed — ignore
        }
      };
      request.signal.addEventListener('abort', onAbort);
    },
    cancel() {
      if (heartbeatTimer) {
        clearInterval(heartbeatTimer);
        heartbeatTimer = null;
      }
      if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
