import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Unauthenticated liveness probe. UptimeRobot (and any load balancer)
// hit this every 60-300s to verify the Railway container is up AND
// Postgres is reachable. Returns 503 if the DB probe fails — that's
// the correct signal: if Postgres is wedged, we want an alert, not a
// green "healthy" status. Deliberately does NOT call any auth helper
// so session-layer regressions show up as different alerts.
export async function GET() {
  const at = new Date().toISOString();
  const commit = process.env.RAILWAY_GIT_COMMIT_SHA ?? 'unknown';

  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json(
      { status: 'healthy', at, commit, database: 'connected' },
      { status: 200, headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    console.error('Health check failed:', error);
    return NextResponse.json(
      { status: 'unhealthy', at, commit, database: 'disconnected' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;
