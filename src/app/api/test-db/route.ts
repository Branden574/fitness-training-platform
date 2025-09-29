import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    console.log('🔍 Testing database connection...');
    
    // Test database connection
    await prisma.$connect();
    console.log('✅ Database connected');
    
    // Test finding users
    const users = await prisma.user.findMany({
      where: {
        email: {
          in: ['admin@fitness-platform.com', 'martinezfitness559@gmail.com']
        }
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        password: true
      }
    });
    
    console.log(`Found ${users.length} users`);
    
    return NextResponse.json({
      success: true,
      message: 'Database connection working',
      users: users.map(user => ({
        email: user.email,
        name: user.name,
        role: user.role,
        hasPassword: !!user.password
      }))
    });
    
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}