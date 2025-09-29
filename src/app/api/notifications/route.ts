import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/notifications - Fetch notifications for the authenticated user
export async function GET(request: NextRequest) {
  try {
    // console.log('🔔 Notifications API - Fetching notifications'); // Reduced logging for development
    
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      console.log('❌ No session found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      console.log('❌ User not found');
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const since = searchParams.get('since');
    const sinceDate = since ? new Date(since) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    // console.log('🔍 Fetching notifications since:', sinceDate); // Reduced logging

    // Fetch actual notifications from database
    const dbNotifications = await prisma.notification.findMany({
      where: {
        userId: user.id,
        createdAt: {
          gte: sinceDate
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // console.log(`📋 Found ${dbNotifications.length} database notifications`); // Reduced logging

    // For trainers, also fetch notifications about appointment changes
    if (user.role === 'TRAINER') {
      // Get recent appointment changes that would generate notifications
      const recentChanges = await prisma.appointment.findMany({
        where: {
          trainerId: user.id,
          updatedAt: {
            gte: sinceDate
          },
          OR: [
            { status: 'CANCELLED' },
            { status: 'PENDING' }  // For rescheduled appointments
          ]
        },
        include: {
          client: {
            select: {
              name: true,
              email: true
            }
          }
        },
        orderBy: {
          updatedAt: 'desc'
        }
      });

      // Get dismissed appointment notifications to filter them out
      const dismissedAppointments = await prisma.notification.findMany({
        where: {
          userId: user.id,
          type: 'APPOINTMENT_READ'
        },
        select: {
          appointmentId: true
        }
      });

      const dismissedAppointmentIds = new Set(
        dismissedAppointments
          .map(notif => notif.appointmentId)
          .filter(Boolean) as string[]
      );

      // Also track appointments we've already shown notifications for based on their last update
      let shownAppointmentIds = new Set<string>();
      
      if (recentChanges.length > 0) {
        const shownNotifications = await prisma.notification.findMany({
          where: {
            userId: user.id,
            appointmentId: {
              in: recentChanges.map(a => a.id)
            }
          },
          select: {
            appointmentId: true,
            createdAt: true
          }
        });

        shownAppointmentIds = new Set(
          shownNotifications.map(notif => notif.appointmentId).filter(Boolean) as string[]
        );
      }

      // Convert appointment changes to notifications, filtering out dismissed and already shown ones
      const appointmentNotifications = recentChanges
        .filter(appointment => 
          !dismissedAppointmentIds.has(appointment.id) && 
          !shownAppointmentIds.has(appointment.id)
        )
        .map(appointment => {
          let type: 'APPOINTMENT_CANCELLED' | 'APPOINTMENT_RESCHEDULED' | 'APPOINTMENT_CANCELLED' = 'APPOINTMENT_CANCELLED';
          let title = '';
          let message = '';

          if (appointment.status === 'CANCELLED') {
            type = 'APPOINTMENT_CANCELLED';
            title = 'Appointment Cancelled';
            message = `${appointment.client.name} has cancelled their appointment.`;
          } else if (appointment.status === 'PENDING' && appointment.notes?.includes('Reschedule requested')) {
            type = 'APPOINTMENT_RESCHEDULED';
            title = 'Reschedule Request';
            message = `${appointment.client.name} has requested to reschedule their appointment.`;
          } else if (appointment.status === 'PENDING') {
            type = 'APPOINTMENT_CANCELLED'; // Default to cancelled for now since NEW_APPOINTMENT isn't in our schema
            title = 'New Appointment';
            message = `${appointment.client.name} has booked a new appointment.`;
          }

          return {
            id: `appointment-${appointment.id}`,
            type,
            title,
            message,
            appointmentId: appointment.id,
            clientName: appointment.client.name,
            appointmentTime: appointment.startTime.toISOString(),
            timestamp: appointment.updatedAt,
            read: false
          };
        });

      // Create persistent notification records for new appointment notifications
      // This prevents duplicates on subsequent API calls
      if (appointmentNotifications.length > 0) {
        const notificationRecords = appointmentNotifications.map(notif => ({
          userId: user.id,
          type: 'APPOINTMENT_READ' as const, // Use this type to track shown notifications
          title: notif.title,
          message: notif.message,
          appointmentId: notif.appointmentId,
          read: false
        }));

        await prisma.notification.createMany({
          data: notificationRecords,
          skipDuplicates: true
        });

        console.log(`📝 Created ${notificationRecords.length} notification tracking records`);
      }

      // Combine database notifications with appointment notifications
      const allNotifications = [
        ...dbNotifications.map(notif => ({
          id: notif.id,
          type: notif.type,
          title: notif.title,
          message: notif.message,
          actionUrl: notif.actionUrl,
          appointmentId: notif.appointmentId,
          clientName: notif.appointmentId ? recentChanges.find(a => a.id === notif.appointmentId)?.client.name : undefined,
          appointmentTime: notif.appointmentId ? recentChanges.find(a => a.id === notif.appointmentId)?.startTime.toISOString() : undefined,
          timestamp: notif.createdAt,
          read: notif.read || false
        })),
        ...appointmentNotifications
      ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      // Remove duplicates based on appointmentId to prevent duplicate keys
      const uniqueNotifications = allNotifications.reduce((acc, notification) => {
        // For appointment-based notifications, use appointmentId as the uniqueness key
        if (notification.appointmentId) {
          const existingIndex = acc.findIndex(n => n.appointmentId === notification.appointmentId);
          if (existingIndex === -1) {
            acc.push(notification);
          } else {
            // Keep the newer one (higher timestamp)
            if (new Date(notification.timestamp).getTime() > new Date(acc[existingIndex].timestamp).getTime()) {
              acc[existingIndex] = notification;
            }
          }
        } else {
          // For regular notifications, use id as the uniqueness key
          const existingIndex = acc.findIndex(n => n.id === notification.id);
          if (existingIndex === -1) {
            acc.push(notification);
          }
        }
        return acc;
      }, [] as typeof allNotifications);

      // console.log(`✅ Found ${uniqueNotifications.length} unique notifications (${dbNotifications.length} from DB, ${appointmentNotifications.length} from appointments)`);
      return NextResponse.json(uniqueNotifications);
    }

    // For clients, return their database notifications
    const clientNotifications = dbNotifications.map(notif => ({
      id: notif.id,
      type: notif.type,
      title: notif.title,
      message: notif.message,
      actionUrl: notif.actionUrl,
      timestamp: notif.createdAt,
      read: notif.read || false
    }));

    // console.log(`✅ Found ${clientNotifications.length} notifications for client`); // Reduced logging
    return NextResponse.json(clientNotifications);

  } catch (error) {
    console.error('❌ Error fetching notifications:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/notifications - Create a new notification (for system use)
export async function POST(request: NextRequest) {
  try {
    console.log('🔔 Notifications API - Creating notification');
    
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      console.log('❌ No session found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { type, title, appointmentId } = body;

    // This endpoint could be used by the system to create persistent notifications
    // For now, we're handling notifications dynamically based on appointment changes
    
    console.log('📝 Notification creation requested:', { type, title, appointmentId });
    
    // Return success - in a full implementation, you might store notifications in the database
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('❌ Error creating notification:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/notifications - Clear all notifications for the authenticated user
export async function DELETE(_request: NextRequest) {
  try {
    console.log('🗑️ Notifications API - Clearing all notifications');
    
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      console.log('❌ No session found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🔍 Session found for user:', session.user.email);

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      console.log('❌ User not found');
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    console.log('👤 User found:', user.email, 'Role:', user.role);

    // Delete all database notifications for this user
    console.log('🗑️ Deleting database notifications...');
    const deleteResult = await prisma.notification.deleteMany({
      where: {
        userId: user.id
      }
    });

    console.log(`✅ Deleted ${deleteResult.count} database notifications for user ${user.email}`);

    // For trainers, also dismiss all current appointment notifications
    if (user.role === 'TRAINER') {
      console.log('👨‍🏫 User is trainer, handling appointment notifications...');
      
      // Get all recent appointment changes for this trainer
      const recentChanges = await prisma.appointment.findMany({
        where: {
          trainerId: user.id,
          updatedAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
          },
          status: {
            in: ['CANCELLED', 'PENDING']
          }
        },
        include: {
          client: true
        },
        orderBy: {
          updatedAt: 'desc'
        }
      });

      console.log(`📅 Found ${recentChanges.length} recent appointment changes`);

      // Create dismissal records for all appointment notifications
      const dismissalRecords = recentChanges.map(appointment => ({
        userId: user.id,
        type: 'APPOINTMENT_READ' as const,
        title: 'Dismissed',
        message: 'Dismissed appointment notification',
        appointmentId: appointment.id,
        read: true
      }));

      if (dismissalRecords.length > 0) {
        console.log(`📝 Creating ${dismissalRecords.length} dismissal records...`);
        await prisma.notification.createMany({
          data: dismissalRecords
        });
        console.log(`✅ Created ${dismissalRecords.length} dismissal records for appointment notifications`);
      }
    }
    
    console.log('✅ Clear notifications operation completed successfully');
    return NextResponse.json({ 
      success: true,
      deletedCount: deleteResult.count,
      message: 'All notifications cleared successfully'
    });

  } catch (error) {
    console.error('❌ Error clearing notifications:', error);
    console.error('Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : 'No stack trace available'
    });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}