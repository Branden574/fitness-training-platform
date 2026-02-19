const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testCancellation() {
  console.log('🧪 Testing appointment cancellation notification...');
  
  try {
    // Find a pending appointment to cancel
    const pendingAppointment = await prisma.appointment.findFirst({
      where: { 
        status: 'PENDING',
        trainerId: 'cmfoww8ms0000xnv1w7em4jxg' // Brent's ID
      },
      include: {
        client: { select: { name: true } },
        trainer: { select: { name: true } }
      }
    });
    
    if (!pendingAppointment) {
      console.log('❌ No pending appointment found to test with');
      return;
    }
    
    console.log('📅 Found appointment to cancel:');
    console.log(`  Client: ${pendingAppointment.client.name}`);
    console.log(`  Trainer: ${pendingAppointment.trainer.name}`);
    console.log(`  Time: ${pendingAppointment.startTime}`);
    console.log(`  Status: ${pendingAppointment.status}`);
    
    // Cancel the appointment
    const cancelledAppointment = await prisma.appointment.update({
      where: { id: pendingAppointment.id },
      data: {
        status: 'CANCELLED',
        notes: 'Test cancellation - Client had to cancel due to emergency',
        updatedAt: new Date()
      }
    });
    
    console.log('✅ Appointment cancelled successfully!');
    console.log(`  New status: ${cancelledAppointment.status}`);
    console.log(`  Updated at: ${cancelledAppointment.updatedAt}`);
    
    // Wait a moment then revert it back to pending for further testing
    console.log('⏱️  Waiting 3 seconds then reverting...');
    setTimeout(async () => {
      await prisma.appointment.update({
        where: { id: pendingAppointment.id },
        data: {
          status: 'PENDING',
          notes: pendingAppointment.notes,
          updatedAt: new Date()
        }
      });
      console.log('🔄 Reverted appointment back to PENDING for further testing');
      await prisma.$disconnect();
    }, 3000);
    
  } catch (error) {
    console.error('❌ Error testing cancellation:', error);
    await prisma.$disconnect();
  }
}

testCancellation();