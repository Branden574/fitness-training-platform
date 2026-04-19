import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    // Rate limit: 5 signup attempts per 15 minutes per IP
    const ip = getClientIp(request);
    const rl = checkRateLimit(`signup:${ip}`, { maxRequests: 5, windowSeconds: 900 });
    if (!rl.allowed) return rateLimitResponse(rl.resetIn);

    const { name, email, password, fitnessLevel, goals } = await request.json();

    if (!email || !name || !password) {
      return NextResponse.json(
        { error: 'Name, email, and password are required' },
        { status: 400 }
      );
    }

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

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

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Always create as CLIENT — role escalation must go through admin
    const user = await prisma.user.create({
      data: {
        name,
        email: normalizedEmail,
        password: hashedPassword,
        role: 'CLIENT',
      }
    });

    // Create client profile
    await prisma.clientProfile.create({
      data: {
        userId: user.id,
        fitnessLevel: fitnessLevel || 'BEGINNER',
        fitnessGoals: goals ? [goals] : undefined,
      }
    });

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
