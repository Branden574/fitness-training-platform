import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { sendNewMessageEmail } from '@/lib/email';
import { dispatchNotification } from '@/lib/notifications/dispatch';
import { z } from 'zod';

const messageSchema = z.object({
  receiverId: z.string(),
  content: z.string().min(1, 'Message cannot be empty'),
  type: z.enum(['TEXT', 'IMAGE', 'FILE']).default('TEXT'),
});

// Get messages for the current user
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const conversationWith = searchParams.get('with'); // User ID to get conversation with

    let messages;

    if (conversationWith) {
      // Get conversation between current user and specific user
      messages = await prisma.message.findMany({
        where: {
          OR: [
            { senderId: session.user.id, receiverId: conversationWith },
            { senderId: conversationWith, receiverId: session.user.id }
          ]
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true
            }
          },
          receiver: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true
            }
          }
        },
        orderBy: {
          createdAt: 'asc'
        }
      });
    } else {
      // Get all conversations for the user
      messages = await prisma.message.findMany({
        where: {
          OR: [
            { senderId: session.user.id },
            { receiverId: session.user.id }
          ]
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true
            }
          },
          receiver: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 50
      });
    }

    return NextResponse.json(messages);
    
  } catch (error) {
    console.error('Get messages error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Send a new message
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validatedData = messageSchema.parse(body);

    // Validate sender-receiver relationship
    const sender = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true, trainerId: true } });
    const receiver = await prisma.user.findUnique({ where: { id: validatedData.receiverId }, select: { id: true, role: true, trainerId: true } });

    if (!receiver) {
      return NextResponse.json({ message: 'Recipient not found' }, { status: 404 });
    }

    // Clients can only message their assigned trainer
    if (sender?.role === 'CLIENT') {
      if (sender.trainerId !== validatedData.receiverId) {
        return NextResponse.json({ message: 'You can only message your assigned trainer' }, { status: 403 });
      }
    }

    // Trainers can only message their assigned clients or admins
    if (sender?.role === 'TRAINER') {
      if (receiver.role === 'CLIENT' && receiver.trainerId !== session.user.id) {
        return NextResponse.json({ message: 'You can only message your assigned clients' }, { status: 403 });
      }
    }

    const message = await prisma.message.create({
      data: {
        senderId: session.user.id,
        receiverId: validatedData.receiverId,
        content: validatedData.content,
        type: validatedData.type,
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        },
        receiver: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      }
    });

    // Fire-and-forget transactional email — never blocks the response
    void sendNewMessageEmail({
      toEmail: message.receiver.email,
      toName: message.receiver.name,
      fromName: message.sender.name,
      fromRole: message.sender.role as 'CLIENT' | 'TRAINER' | 'ADMIN',
      preview: message.content,
    });

    // In-app bell + OS push for the receiver. Dispatch is already fail-open
    // so a broken notification never blocks the message itself. actionUrl
    // routes to the recipient's messages view scoped by role.
    const receiverRole = message.receiver.role;
    const messagesHref =
      receiverRole === 'TRAINER'
        ? `/trainer/messages?with=${message.senderId}`
        : '/client/messages';
    const preview =
      message.content.length > 120
        ? `${message.content.slice(0, 120)}…`
        : message.content;
    void dispatchNotification({
      userId: message.receiverId,
      type: 'MESSAGE_RECEIVED',
      title: `${message.sender.name ?? 'Someone'} sent a message`,
      body: preview,
      actionUrl: messagesHref,
      metadata: { messageId: message.id, senderId: message.senderId },
    });

    return NextResponse.json(message, { status: 201 });
    
  } catch (error) {
    console.error('Send message error:', error);
    
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