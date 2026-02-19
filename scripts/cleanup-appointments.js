// Clear all stale appointment data and reset to clean state
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanupAndReset() {
  try {
    console.log('🧹 Cleaning up stale appointment data...');
    
    // Get Brent's ID
    const brent = await prisma.user.findUnique({
      where: { email: 'Martinezfitness559@gmail.com' },
      select: { id: true }
    });
    
    if (!brent) {
      console.error('❌ Brent not found');
      return;
    }
    
    console.log('👤 Brent ID:', brent.id);
    
    // Delete all existing appointments to start fresh
    const deletedCount = await prisma.appointment.deleteMany({});
    console.log(`🗑️  Deleted ${deletedCount.count} existing appointments`);
    
    // Create one fresh test appointment
    const newAppointment = await prisma.appointment.create({
      data: {
        title: 'Test Training Session',
        description: 'Fresh test appointment',
        startTime: new Date('2025-09-20T10:00:00Z'),
        endTime: new Date('2025-09-20T11:00:00Z'),
        duration: 60,
        type: 'TRAINING_SESSION',
        status: 'PENDING',
        location: 'Gym',
        trainerId: brent.id,
        clientId: 'cmfn3t3ic0002xninyonutrrn' // Branden's ID
      }
    });
    
    console.log('✅ Created fresh test appointment:', newAppointment.id);
    
    // Clear any stale sessions
    const expiredSessions = await prisma.session.deleteMany({
      where: {
        expires: {
          lt: new Date()
        }
      }
    });
    
    console.log(`🧹 Cleaned up ${expiredSessions.count} expired sessions`);
    
    console.log('\n🎉 Database cleanup complete!');
    console.log('Next steps:');
    console.log('1. Clear browser cache (Cmd+Shift+R)');
    console.log('2. Login fresh as Brent');
    console.log('3. Check trainer dashboard');
    
    await prisma.$disconnect();
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    await prisma.$disconnect();
  }
}

cleanupAndReset();