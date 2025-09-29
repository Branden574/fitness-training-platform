import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(_request: NextRequest) {
  try {
    console.log('🔍 Session Debug API called');
    
    const session = await getServerSession(authOptions);
    
    const result: {
      hasSession: boolean;
      userEmail: string | undefined;
      userId: string | undefined;
      userRole: string | undefined;
      timestamp: string;
      databaseUser?: {
        id: string;
        email: string;
        role: string;
        name: string | null;
      };
      databaseError?: string;
    } = {
      hasSession: !!session,
      userEmail: session?.user?.email,
      userId: session?.user?.id,
      userRole: session?.user?.role,
      timestamp: new Date().toISOString()
    };
    
    if (session?.user?.email) {
      try {
        const user = await prisma.user.findUnique({
          where: { email: session.user.email },
          select: { id: true, email: true, role: true, name: true }
        });
        
        if (user) {
          result.databaseUser = user;
        }
      } catch (error) {
        result.databaseError = (error as Error).message;
      }
    }
    
    console.log('🔍 Session debug result:', result);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('❌ Session debug error:', error);
    return NextResponse.json(
      { error: 'Session debug failed', details: (error as Error).message },
      { status: 500 }
    );
  }
}