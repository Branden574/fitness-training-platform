import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// PATCH /api/notifications/[id] - Mark notification as read
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const { read } = body;

    // Check if this is an appointment notification (ID starts with "appointment-")
    if (id.startsWith('appointment-')) {
      const appointmentId = id.replace('appointment-', '');
      
      // For appointment notifications, we mark the appointment as "acknowledged" 
      // by updating the appointment's updatedAt field to indicate it's been seen
      // This prevents it from showing up in future notification queries
      try {
        const appointment = await prisma.appointment.findFirst({
          where: {
            id: appointmentId,
            OR: [
              { clientId: user.id },
              { trainerId: user.id }
            ]
          }
        });

        if (!appointment) {
          return NextResponse.json(
            { error: 'Appointment notification not found or access denied' },
            { status: 404 }
          );
        }

        // Create a "read" record for this appointment notification
        // Check if a read record already exists for this appointment notification
        const existingReadRecord = await prisma.notification.findFirst({
          where: {
            userId: user.id,
            type: 'APPOINTMENT_READ',
            appointmentId: appointmentId
          }
        });

        if (existingReadRecord) {
          // Update existing read record
          await prisma.notification.update({
            where: { id: existingReadRecord.id },
            data: { read: read }
          });
        } else {
          // Create new read record
          await prisma.notification.create({
            data: {
              userId: user.id,
              type: 'APPOINTMENT_READ',
              appointmentId: appointmentId,
              title: 'Appointment Notification Read',
              message: 'Appointment notification marked as read',
              read: read
            }
          });
        }

        return NextResponse.json({ 
          success: true, 
          read: read,
          id: id
        });

      } catch (appointmentError) {
        console.error('❌ Error handling appointment notification:', appointmentError);
        return NextResponse.json(
          { error: 'Failed to mark appointment notification as read' },
          { status: 500 }
        );
      }
    }

    // Handle regular database notifications
    const updatedNotification = await prisma.notification.update({
      where: {
        id: id,
        userId: user.id // Ensure user can only update their own notifications
      },
      data: {
        read: read
      }
    });

    return NextResponse.json({ 
      success: true, 
      read: updatedNotification.read,
      id: updatedNotification.id
    });

  } catch (error) {
    console.error('❌ Error updating notification:', error);
    
    // Check if it's a record not found error
    if (error instanceof Error && error.message.includes('Record to update not found')) {
      return NextResponse.json(
        { error: 'Notification not found or access denied' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/notifications/[id] - Delete notification
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if this is an appointment notification (ID starts with "appointment-")
    if (id.startsWith('appointment-')) {
      const appointmentId = id.replace('appointment-', '');
      
      try {
        const appointment = await prisma.appointment.findFirst({
          where: {
            id: appointmentId,
            OR: [
              { clientId: user.id },
              { trainerId: user.id }
            ]
          }
        });

        if (!appointment) {
          return NextResponse.json(
            { error: 'Appointment notification not found or access denied' },
            { status: 404 }
          );
        }

        // Create a dismissed record for this appointment notification
        await prisma.notification.create({
          data: {
            userId: user.id,
            type: 'APPOINTMENT_READ',
            appointmentId: appointmentId,
            title: 'Appointment Notification Dismissed',
            message: 'Appointment notification dismissed',
            read: true // Mark as read/dismissed
          }
        });

        return NextResponse.json({ 
          success: true,
          message: 'Appointment notification dismissed successfully'
        });

      } catch (appointmentError) {
        console.error('❌ Error dismissing appointment notification:', appointmentError);
        return NextResponse.json(
          { error: 'Failed to dismiss appointment notification' },
          { status: 500 }
        );
      }
    }

    // Handle regular database notifications
    await prisma.notification.delete({
      where: {
        id: id,
        userId: user.id // Ensure user can only delete their own notifications
      }
    });

    return NextResponse.json({ 
      success: true,
      message: 'Notification deleted successfully'
    });

  } catch (error) {
    console.error('❌ Error deleting notification:', error);
    
    // Check if it's a record not found error
    if (error instanceof Error && error.message.includes('Record to delete does not exist')) {
      return NextResponse.json(
        { error: 'Notification not found or access denied' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}