import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { TRAINER_STATUSES, statusToLegacyBoolean } from '@/lib/trainerStatus';
import { sendNotifyWhenOpenForTrainer } from '@/lib/email/notifyWhenOpen';

// Build a Zod enum from the readonly tuple. The cast is required because
// z.enum needs a mutable [string, ...string[]] tuple type.
const ClientStatusSchema = z.enum(
  TRAINER_STATUSES as unknown as [string, ...string[]],
);

const patchSchema = z.object({
  acceptingClients: z.boolean().optional(),       // legacy — kept for one release
  clientStatus: ClientStatusSchema.optional(),    // new
  isPublic: z.boolean().optional(),
});

async function requireTrainer() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { ok: false as const, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  if (session.user.role !== 'TRAINER' && session.user.role !== 'ADMIN') {
    return { ok: false as const, response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  return { ok: true as const, userId: session.user.id };
}

export async function GET() {
  const auth = await requireTrainer();
  if (!auth.ok) return auth.response;

  const me = await prisma.user.findUnique({
    where: { id: auth.userId },
    select: {
      trainerAcceptingClients: true,
      trainerClientStatus: true,
      trainerIsPublic: true,
    },
  });

  if (!me) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json(me);
}

export async function PATCH(request: NextRequest) {
  const auth = await requireTrainer();
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid fields', details: parsed.error.issues },
      { status: 400 },
    );
  }

  // Capture prior status before update so we can detect NOT_ACCEPTING → other.
  const prior = await prisma.user.findUnique({
    where: { id: auth.userId },
    select: { trainerClientStatus: true },
  });
  const prevStatus = prior?.trainerClientStatus ?? 'ACCEPTING';

  const data: Record<string, unknown> = {};

  if (parsed.data.clientStatus !== undefined) {
    const next = parsed.data.clientStatus as 'ACCEPTING' | 'WAITLIST' | 'NOT_ACCEPTING';
    data.trainerClientStatus = next;
    data.trainerAcceptingClients = statusToLegacyBoolean(next);
  } else if (parsed.data.acceptingClients !== undefined) {
    // Legacy callers — derive a status from the boolean.
    data.trainerAcceptingClients = parsed.data.acceptingClients;
    data.trainerClientStatus = parsed.data.acceptingClients ? 'ACCEPTING' : 'WAITLIST';
  }

  if (parsed.data.isPublic !== undefined) data.trainerIsPublic = parsed.data.isPublic;

  const updated = await prisma.user.update({
    where: { id: auth.userId },
    data,
    select: {
      trainerAcceptingClients: true,
      trainerClientStatus: true,
      trainerIsPublic: true,
    },
  });

  // After update: if we transitioned out of NOT_ACCEPTING, fire the notify-when-open
  // mailer fire-and-forget. Failures are logged inside the helper and never break the PATCH.
  const nextStatus = updated.trainerClientStatus;
  if (prevStatus === 'NOT_ACCEPTING' && nextStatus !== 'NOT_ACCEPTING') {
    void sendNotifyWhenOpenForTrainer(auth.userId);
  }

  return NextResponse.json(updated);
}
