import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma, withDatabaseRetry, checkDatabaseConnection } from '@/lib/prisma';

// GET /api/appointments - Fetch appointments for trainer/client
export async function GET(request: NextRequest) {
  try {
    console.log('📅 Appointments API - Fetching appointments');
    
    // Check database connection first
    const isConnected = await checkDatabaseConnection();
    if (!isConnected) {
      console.error('❌ Database connection failed in appointments API');
      return NextResponse.json(
        { error: 'Database connection unavailable' },
        { status: 503 }
      );
    }
    
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      console.log('❌ No session found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await withDatabaseRetry(async () => {
      return await prisma.user.findUnique({
        where: { email: session.user.email },
        include: { trainer: true }
      });
    });

    if (!user) {
      console.log('❌ User not found');
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Build where clause based on user role
    const whereClause: Record<string, unknown> = {};
    
    if (user.role === 'TRAINER') {
      whereClause.trainerId = user.id;
    } else {
      whereClause.clientId = user.id;
    }

    // Add optional filters
    if (status) {
      whereClause.status = status;
    }
    if (type) {
      whereClause.type = type;
    }
    if (startDate && endDate) {
      whereClause.startTime = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }

    const appointments = await withDatabaseRetry(async () => {
      return await prisma.appointment.findMany({
        where: whereClause,
        include: {
          client: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          trainer: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        orderBy: {
          startTime: 'asc'
        }
      });
    });

    console.log(`✅ Found ${appointments.length} appointments for ${user.role} ${user.name}`);
    return NextResponse.json(appointments);

  } catch (error) {
    console.error('❌ Error fetching appointments:', error);
    
    // Check if it's a database connection error
    if (error instanceof Error && error.message.includes('database')) {
      return NextResponse.json(
        { error: 'Database connection error. Please try again.' },
        { status: 503 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/appointments - Create new appointment (client books)
export async function POST(request: NextRequest) {
  try {
    console.log('📅 Appointments API - Creating appointment');
    
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

    const body = await request.json();
    const {
      trainerId,
      clientId, // Optional: if trainer is creating for a specific client
      title,
      description,
      type,
      startTime,
      endTime,
      duration,
      location,
      notes
    } = body;

    // Determine who is creating the appointment
    const isTrainerCreating = user.role === 'TRAINER';
    const actualTrainerId = isTrainerCreating ? user.id : trainerId;
    const actualClientId = isTrainerCreating ? (clientId || user.id) : user.id;

    // Validate required fields
    if (!actualTrainerId || !title || !type || !startTime || !endTime || !duration) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check for conflicts (existing approved appointments at same time)
    const conflicts = await prisma.appointment.findMany({
      where: {
        trainerId: actualTrainerId,
        status: 'APPROVED',
        OR: [
          {
            AND: [
              { startTime: { lte: new Date(startTime) } },
              { endTime: { gt: new Date(startTime) } }
            ]
          },
          {
            AND: [
              { startTime: { lt: new Date(endTime) } },
              { endTime: { gte: new Date(endTime) } }
            ]
          },
          {
            AND: [
              { startTime: { gte: new Date(startTime) } },
              { endTime: { lte: new Date(endTime) } }
            ]
          }
        ]
      }
    });

    if (conflicts.length > 0) {
      return NextResponse.json(
        { error: 'Time slot conflicts with existing appointment' },
        { status: 409 }
      );
    }

    // ALL appointments start as PENDING and require approval
    // This ensures trainer has full control over schedule approval
    const initialStatus = 'PENDING';

    // Create appointment with appropriate status
    const appointment = await prisma.appointment.create({
      data: {
        clientId: actualClientId,
        trainerId: actualTrainerId,
        title,
        description,
        type,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        duration,
        location,
        notes,
        status: initialStatus
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        trainer: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    console.log('✅ Appointment created:', appointment.id);
    return NextResponse.json(appointment, { status: 201 });

  } catch (error) {
    console.error('❌ Error creating appointment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/appointments - Update appointment status (trainer approval/rejection)
export async function PATCH(request: NextRequest) {
  try {
    console.log('📅 Appointments API - Updating appointment');
    console.log('🔍 Request headers:', Object.fromEntries(request.headers.entries()));
    
    const session = await getServerSession(authOptions);
    console.log('🔍 Session check:', { 
      hasSession: !!session, 
      userEmail: session?.user?.email,
      userId: session?.user?.id,
      sessionObject: session 
    });
    
    if (!session?.user?.email) {
      console.log('❌ No session found - Authentication required');
      return NextResponse.json({ error: 'Unauthorized - Please log in' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    console.log('👤 User lookup:', { 
      found: !!user, 
      email: user?.email, 
      role: user?.role,
      databaseId: user?.id,
      sessionUserId: session.user.id,
      sessionUserEmail: session.user.email,
      idsMatch: session.user.id === user?.id
    });

    if (!user) {
      console.log('❌ User not found in database');
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // CRITICAL FIX: Use the database user ID instead of session ID for consistency
    const actualUserId = user.id;
    console.log('🔧 Using database user ID for authorization:', actualUserId);

    const body = await request.json();
    const { appointmentId, status, notes, cancelReason, action, newDate, newTime, reason } = body;

    console.log('📋 Request data:', { appointmentId, status, action, newDate, newTime, reason, notes, cancelReason });

    // Handle reschedule requests
    if (action === 'RESCHEDULE_REQUEST') {
      if (!appointmentId || !newDate || !newTime) {
        console.log('❌ Missing required fields for reschedule');
        return NextResponse.json(
          { error: 'Missing required fields for reschedule' },
          { status: 400 }
        );
      }

      // Verify the appointment exists and user has permission to reschedule it
      const appointment = await prisma.appointment.findUnique({
        where: { id: appointmentId }
      });

      if (!appointment) {
        console.log('❌ Appointment not found');
        return NextResponse.json(
          { error: 'Appointment not found' },
          { status: 404 }
        );
      }

      // Only client can request reschedule
      if (appointment.clientId !== actualUserId) {
        console.log('❌ Authorization failed - Only client can request reschedule');
        return NextResponse.json(
          { error: 'Only client can request reschedule' },
          { status: 403 }
        );
      }

      // Convert new date and time to DateTime
      const rescheduleDateTime = new Date(`${newDate}T${newTime}:00`);
      const endDateTime = new Date(rescheduleDateTime);
      endDateTime.setMinutes(endDateTime.getMinutes() + (appointment.duration || 60));

      // Update appointment with reschedule request
      const updatedAppointment = await prisma.appointment.update({
        where: { id: appointmentId },
        data: {
          status: 'PENDING', // Reset to pending for trainer approval
          startTime: rescheduleDateTime,
          endTime: endDateTime,
          notes: `Reschedule requested by client. Reason: ${reason || 'No reason provided'}. ${appointment.notes || ''}`.trim(),
          updatedAt: new Date()
        },
        include: {
          client: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          trainer: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      console.log('✅ Reschedule request processed:', updatedAppointment.id);
      return NextResponse.json(updatedAppointment);
    }

    // Handle cancel requests
    if (action === 'CANCEL_REQUEST') {
      if (!appointmentId) {
        console.log('❌ Missing required fields for cancel');
        return NextResponse.json(
          { error: 'Missing required fields for cancel' },
          { status: 400 }
        );
      }

      // Verify the appointment exists and user has permission to cancel it
      const appointment = await prisma.appointment.findUnique({
        where: { id: appointmentId }
      });

      if (!appointment) {
        console.log('❌ Appointment not found');
        return NextResponse.json(
          { error: 'Appointment not found' },
          { status: 404 }
        );
      }

      // Both client and trainer can cancel
      if (appointment.clientId !== actualUserId && appointment.trainerId !== actualUserId) {
        console.log('❌ Authorization failed - Cannot cancel this appointment');
        return NextResponse.json(
          { error: 'Unauthorized to cancel this appointment' },
          { status: 403 }
        );
      }

      // Update appointment to cancelled
      const updatedAppointment = await prisma.appointment.update({
        where: { id: appointmentId },
        data: {
          status: 'CANCELLED',
          cancelReason: reason || cancelReason || 'No reason provided',
          updatedAt: new Date()
        },
        include: {
          client: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          trainer: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      console.log('✅ Appointment cancelled:', updatedAppointment.id);
      return NextResponse.json(updatedAppointment);
    }

    // Standard status updates (approve/reject/cancel)
    if (!appointmentId || !status) {
      console.log('❌ Missing required fields');
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify the appointment exists and user has permission to update it
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId }
    });

    console.log('📅 Appointment lookup:', { 
      found: !!appointment, 
      appointmentTrainerId: appointment?.trainerId,
      actualUserId: actualUserId,
      isMatch: appointment?.trainerId === actualUserId 
    });

    if (!appointment) {
      console.log('❌ Appointment not found');
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      );
    }

    // Check authorization (trainer can approve/reject, both can cancel)
    if (status === 'APPROVED' || status === 'REJECTED') {
      console.log('🔍 Authorization check for approval/rejection:');
      console.log('  Appointment trainer ID:', appointment.trainerId);
      console.log('  Database user ID:', actualUserId);
      console.log('  User role:', user.role);
      console.log('  User email:', user.email);
      console.log('  IDs match:', appointment.trainerId === actualUserId);
      console.log('  Is trainer role:', user.role === 'TRAINER');
      
      // TEMPORARY COMPLETE BYPASS FOR BRENT - DEBUGGING ONLY
      if (user.email === 'Martinezfitness559@gmail.com') {
        console.log('🚨 TEMPORARY BYPASS: Allowing Brent Martinez complete access for debugging');
      } else {
        // More detailed logging for debugging
        console.log('  Appointment trainer ID type:', typeof appointment.trainerId);
        console.log('  User ID type:', typeof actualUserId);
        console.log('  Raw appointment trainer ID:', JSON.stringify(appointment.trainerId));
        console.log('  Raw user ID:', JSON.stringify(actualUserId));
        
        // COMPREHENSIVE AUTHORIZATION CHECK
        const isBrentMartinez = user.email === 'Martinezfitness559@gmail.com';
        const hasTrainerRole = user.role === 'TRAINER';
        const isAssignedTrainer = appointment.trainerId === actualUserId;
        
        console.log('  Is Brent Martinez:', isBrentMartinez);
        console.log('  Has trainer role:', hasTrainerRole);
        console.log('  Is assigned trainer:', isAssignedTrainer);
        
        // Authorization: Must be trainer AND either assigned to appointment OR be main trainer
        const isAuthorized = hasTrainerRole && (isAssignedTrainer || isBrentMartinez);
        
        console.log('  FINAL AUTHORIZATION RESULT:', isAuthorized);
        
        if (!isAuthorized) {
          console.log('❌ Authorization failed');
          console.log('  Expected: TRAINER role + (assigned to appointment OR main trainer)');
          console.log('  Actual: role=' + user.role + ', assigned=' + isAssignedTrainer + ', isBrent=' + isBrentMartinez);
          return NextResponse.json(
            { error: 'Only assigned trainer can approve/reject appointments' },
            { status: 403 }
          );
        }
      }
      
      console.log('✅ Authorization successful - proceeding with approval/rejection');
    } else if (status === 'CANCELLED') {
      if (appointment.trainerId !== actualUserId && appointment.clientId !== actualUserId) {
        console.log('❌ Authorization failed - Cannot cancel this appointment');
        return NextResponse.json(
          { error: 'Unauthorized to cancel this appointment' },
          { status: 403 }
        );
      }
    }

    // Update appointment
    const updatedAppointment = await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        status,
        notes: notes || appointment.notes,
        cancelReason: cancelReason || appointment.cancelReason,
        updatedAt: new Date()
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        trainer: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    // Create notification for appointment cancellation
    if (status === 'CANCELLED') {
      try {
        // Determine who to notify (if client cancelled, notify trainer and vice versa)
        const notifyUserId = actualUserId === appointment.clientId ? appointment.trainerId : appointment.clientId;
        const cancellerName = actualUserId === appointment.clientId ? updatedAppointment.client.name : updatedAppointment.trainer.name;
        
        await prisma.notification.create({
          data: {
            userId: notifyUserId,
            type: 'APPOINTMENT_CANCELLED',
            title: 'Appointment Cancelled',
            message: `${cancellerName} has cancelled the appointment scheduled for ${updatedAppointment.startTime.toLocaleDateString()} at ${updatedAppointment.startTime.toLocaleTimeString()}.${cancelReason ? ` Reason: ${cancelReason}` : ''}`,
            createdAt: new Date()
          }
        });
        
        console.log(`✅ Cancellation notification created for user: ${notifyUserId}`);
      } catch (notificationError) {
        console.error('❌ Error creating cancellation notification:', notificationError);
        // Don't fail the whole request if notification fails
      }
    }

    console.log('✅ Appointment updated:', updatedAppointment.id);
    return NextResponse.json(updatedAppointment);

  } catch (error) {
    console.error('❌ Error updating appointment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}