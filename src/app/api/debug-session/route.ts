import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Debug Session API called');
    
    const session = await getServerSession(authOptions);
    console.log('📋 Full session object:', JSON.stringify(session, null, 2));
    
    if (!session?.user?.email) {
      return NextResponse.json({ 
        error: 'No session found',
        session: null 
      });
    }

    // Look up user in database
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    console.log('👤 Database user:', JSON.stringify(user, null, 2));

    return NextResponse.json({
      session: {
        userEmail: session.user.email,
        userId: session.user.id,
        userRole: session.user.role,
        fullSession: session
      },
      databaseUser: {
        id: user?.id,
        email: user?.email,
        role: user?.role,
        fullUser: user
      },
      comparison: {
        sessionIdMatchesDb: session.user.id === user?.id,
        emailMatches: session.user.email === user?.email,
        roleMatches: session.user.role === user?.role
      }
    });

  } catch (error) {
    console.error('❌ Debug session error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error },
      { status: 500 }
    );
  }
}