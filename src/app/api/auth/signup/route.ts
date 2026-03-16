import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    // Rate limit: 5 signup attempts per 15 minutes per IP
    const ip = getClientIp(request);
    const rl = checkRateLimit(`signup:${ip}`, { maxRequests: 5, windowSeconds: 900 });
    if (!rl.allowed) return rateLimitResponse(rl.resetIn);

    const { name, email, role, fitnessLevel, goals } = await request.json();

    // Normalize email to lowercase for consistency
    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 400 }
      );
    }

    // Create user (password hashing would be implemented when adding password field to schema)
    const user = await prisma.user.create({
      data: {
        name,
        email: normalizedEmail,
        role: role || 'CLIENT',
      }
    });

    // Create role-specific profiles
    if (role === 'CLIENT') {
      await prisma.clientProfile.create({
        data: {
          userId: user.id,
          fitnessLevel: fitnessLevel || 'BEGINNER',
          fitnessGoals: goals ? JSON.stringify([goals]) : null,
        }
      });
    } else if (role === 'TRAINER') {
      await prisma.trainer.create({
        data: {
          userId: user.id,
          bio: '',
          experience: 0,
        }
      });
    }

    return NextResponse.json(
      { message: 'User created successfully', userId: user.id },
      { status: 201 }
    );
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}