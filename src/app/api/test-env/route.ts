import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        console.log('🔍 Testing Next.js environment variables and Prisma connection...');
        
        const envInfo = {
            NODE_ENV: process.env.NODE_ENV,
            DATABASE_URL_EXISTS: !!process.env.DATABASE_URL,
            DATABASE_URL_LENGTH: process.env.DATABASE_URL?.length || 0,
            DATABASE_URL_START: process.env.DATABASE_URL?.substring(0, 30) + '...'
        };
        
        console.log('Environment info:', envInfo);
        
        // Test direct Prisma connection
        console.log('Testing Prisma $connect...');
        await prisma.$connect();
        console.log('✅ Prisma connected successfully');
        
        console.log('Testing Prisma query...');
        const userCount = await prisma.user.count();
        console.log('✅ Prisma query successful, user count:', userCount);
        
        await prisma.$disconnect();
        console.log('✅ Prisma disconnected successfully');
        
        return NextResponse.json({
            success: true,
            environment: envInfo,
            userCount,
            message: 'Next.js Prisma connection successful'
        });
        
    } catch (error) {
        console.error('❌ Next.js Prisma test failed:', error);
        
        const errorInfo = {
            message: error instanceof Error ? error.message : 'Unknown error',
            name: error instanceof Error ? error.name : 'Unknown',
            code: error instanceof Error && 'code' in error ? error.code : undefined
        };
        
        return NextResponse.json({
            success: false,
            error: errorInfo,
            environment: {
                NODE_ENV: process.env.NODE_ENV,
                DATABASE_URL_EXISTS: !!process.env.DATABASE_URL,
                DATABASE_URL_LENGTH: process.env.DATABASE_URL?.length || 0
            }
        }, { status: 500 });
    }
}