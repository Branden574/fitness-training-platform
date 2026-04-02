import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Server-Sent Events endpoint for realtime message updates
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const withUserId = searchParams.get('with');

  if (!withUserId) {
    return NextResponse.json({ message: 'Missing "with" parameter' }, { status: 400 });
  }

  const userId = session.user.id;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      let lastMessageId: string | null = null;
      let closed = false;

      const check = async () => {
        if (closed) return;

        try {
          const where: any = {
            OR: [
              { senderId: userId, receiverId: withUserId },
              { senderId: withUserId, receiverId: userId },
            ],
          };

          // Only fetch messages newer than the last one we sent
          if (lastMessageId) {
            where.id = { gt: lastMessageId };
          }

          const messages = await prisma.message.findMany({
            where,
            include: {
              sender: { select: { id: true, name: true, role: true } },
              receiver: { select: { id: true, name: true, role: true } },
            },
            orderBy: { createdAt: 'asc' },
            take: lastMessageId ? 50 : 100, // Initial load vs incremental
          });

          if (messages.length > 0) {
            lastMessageId = messages[messages.length - 1].id;
            const data = `data: ${JSON.stringify(messages)}\n\n`;
            controller.enqueue(encoder.encode(data));
          } else if (!lastMessageId) {
            // Send empty array on first connection so client knows it's connected
            controller.enqueue(encoder.encode(`data: []\n\n`));
          }

          // Send heartbeat to keep connection alive
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        } catch (error) {
          // DB error - don't crash the stream
          console.error('SSE message check error:', error);
        }

        // Poll every 2 seconds
        if (!closed) {
          setTimeout(check, 2000);
        }
      };

      // Start checking
      check();

      // Handle client disconnect
      request.signal.addEventListener('abort', () => {
        closed = true;
        controller.close();
      });
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
