// Test environment variable loading in Next.js context
import { prisma } from '@/lib/prisma';

export async function testNextjsEnvironment() {
    console.log('🔍 Testing environment in Next.js context...');
    
    console.log('Environment variables:');
    console.log('- NODE_ENV:', process.env.NODE_ENV);
    console.log('- DATABASE_URL exists:', !!process.env.DATABASE_URL);
    console.log('- DATABASE_URL length:', process.env.DATABASE_URL?.length || 0);
    
    try {
        console.log('Testing Prisma connection in Next.js...');
        await prisma.$connect();
        const count = await prisma.user.count();
        console.log('✅ Next.js connection works! User count:', count);
        await prisma.$disconnect();
        return { success: true, count };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ Next.js connection failed:', errorMessage);
        return { success: false, error: errorMessage };
    }
}

export default testNextjsEnvironment;