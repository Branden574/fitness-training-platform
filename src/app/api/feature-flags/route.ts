import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const updateSchema = z.object({
  key: z.string().min(1),
  enabled: z.boolean(),
  description: z.string().optional().nullable(),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const flags = await prisma.featureFlag.findMany({ orderBy: { key: 'asc' } });
  return NextResponse.json(flags);
}

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: z.infer<typeof updateSchema>;
  try {
    body = updateSchema.parse(await request.json());
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: e.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const flag = await prisma.featureFlag.upsert({
    where: { key: body.key },
    create: {
      key: body.key,
      enabled: body.enabled,
      description: body.description ?? null,
      updatedBy: session.user.email ?? session.user.id,
    },
    update: {
      enabled: body.enabled,
      description: body.description ?? undefined,
      updatedBy: session.user.email ?? session.user.id,
    },
  });

  // Audit trail
  await prisma.adminLog.create({
    data: {
      adminEmail: session.user.email ?? 'unknown',
      action: 'FEATURE_FLAG_TOGGLE',
      targetEmail: body.key,
      details: { enabled: body.enabled },
    },
  }).catch(() => {});

  return NextResponse.json(flag);
}
