import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// TEMPORARY debug endpoint — throws a known error so we can verify
// Sentry is actually receiving server-side events in prod. Admin-only
// so nobody else can trigger it. Remove this file once Sentry is
// confirmed wired (you'll see the error in Sentry's Issues tab within
// ~30s of hitting GET /api/debug/sentry).
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // This throw will bubble out of the handler; instrumentation.ts'
  // onRequestError hook sends it to Sentry, and Next.js converts it
  // to a 500 for the client.
  throw new Error(
    'Sentry smoke test — fired from /api/debug/sentry at ' + new Date().toISOString(),
  );
}
