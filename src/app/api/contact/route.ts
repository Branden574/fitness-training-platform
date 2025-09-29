import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { ContactStatus } from '@prisma/client';

const contactSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email format'),
  phone: z.string().optional(),
  message: z.string().min(10, 'Message must be at least 10 characters'),
  // Optional enhanced fields
  age: z.string().optional(),
  fitnessLevel: z.string().optional(),
  fitnessGoals: z.string().optional(),
  currentActivity: z.string().optional(),
  injuries: z.string().optional(),
  availability: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Validate the request body
    const validatedData = contactSchema.parse(body);
    
    // Save to database
    const contactSubmission = await prisma.contactSubmission.create({
      data: {
        name: validatedData.name,
        email: validatedData.email,
        phone: validatedData.phone || null,
        message: validatedData.message,
        // Enhanced fitness assessment fields
        age: validatedData.age || null,
        fitnessLevel: validatedData.fitnessLevel || null,
        fitnessGoals: validatedData.fitnessGoals || null,
        currentActivity: validatedData.currentActivity || null,
        injuries: validatedData.injuries || null,
        availability: validatedData.availability || null,
        status: 'NEW',
      },
    });

    // Here you could also send an email notification to the trainer
    // For now, we'll just return success
    
    return NextResponse.json(
      { 
        message: 'Contact form submitted successfully!',
        id: contactSubmission.id 
      },
      { status: 201 }
    );
    
  } catch (error) {
    console.error('Contact form error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          message: 'Validation error',
          errors: error.issues 
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    // This endpoint is for admin to view contact submissions
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    
    const where = status ? { status: status as ContactStatus } : {};
    
    const submissions = await prisma.contactSubmission.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    
    return NextResponse.json(submissions);
    
  } catch (error) {
    console.error('Get contact submissions error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, status } = body;
    
    if (!id || !status) {
      return NextResponse.json(
        { message: 'Submission ID and status are required' },
        { status: 400 }
      );
    }

    // Update the contact submission status
    const updatedSubmission = await prisma.contactSubmission.update({
      where: { id },
      data: { status: status as ContactStatus }
    });

    return NextResponse.json(updatedSubmission);
    
  } catch (error) {
    console.error('Update contact submission error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}