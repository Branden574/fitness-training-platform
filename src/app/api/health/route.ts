import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Health check endpoint for Railway monitoring
export async function GET() {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;
    
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
    }, { status: 200 });
  } catch (error) {
    console.error('Health check failed:', error);

    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
    }, { status: 503 });
  }
}

// Prevent caching of health checks
export const dynamic = 'force-dynamic';
export const revalidate = 0;
