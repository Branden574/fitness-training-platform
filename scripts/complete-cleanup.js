/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unused-vars */
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function completeCleanup() {
  try {
    console.log('=== COMPLETE DATABASE CLEANUP ===');
    
    // Delete all dependent records first
    await prisma.notification.deleteMany({});
    await prisma.invitation.deleteMany({});
    await prisma.contactSubmission.deleteMany({});
    await prisma.message.deleteMany({});
    await prisma.progressEntry.deleteMany({});
    await prisma.exerciseProgress.deleteMany({});
    await prisma.workoutSession.deleteMany({});
    await prisma.mealItem.deleteMany({});
    await prisma.meal.deleteMany({});
    await prisma.mealPlan.deleteMany({});
    await prisma.workoutExercise.deleteMany({});
    await prisma.workout.deleteMany({});
    await prisma.exercise.deleteMany({});
    await prisma.food.deleteMany({});
    await prisma.clientProfile.deleteMany({});
    await prisma.trainer.deleteMany({});
    await prisma.session.deleteMany({});
    await prisma.account.deleteMany({});
    
    console.log('✅ Deleted all dependent records');
    
    // Now delete all users
    await prisma.user.deleteMany({});
    console.log('✅ Deleted all users');
    
    // Create Brent Martinez as TRAINER
    const hashedTrainerPassword = await bcrypt.hash('trainer123', 12);
    const brentMartinez = await prisma.user.create({
      data: {
        name: 'Brent Martinez',
        email: 'brent@trainer.com',
        password: hashedTrainerPassword,
        role: 'TRAINER'
      }
    });
    console.log('✅ Created Brent Martinez (TRAINER)');
    
    // Create Branden Vincent-Walker as CLIENT
    const hashedClientPassword = await bcrypt.hash('client123', 12);
    const brandenClient = await prisma.user.create({
      data: {
        name: 'Branden Vincent-Walker',
        email: 'branden574@gmail.com',
        password: hashedClientPassword,
        role: 'CLIENT',
        trainerId: brentMartinez.id
      }
    });
    console.log('✅ Created Branden Vincent-Walker (CLIENT)');
    
    console.log('\n=== DATABASE CLEAN AND READY ===');
    console.log('TRAINER LOGIN:');
    console.log('  Email: brent@trainer.com');
    console.log('  Password: trainer123');
    console.log('');
    console.log('CLIENT LOGIN:');
    console.log('  Email: branden574@gmail.com');
    console.log('  Password: client123');
    
    // Verify the setup
    const users = await prisma.user.findMany({
      include: {
        assignedTrainer: {
          select: { name: true, email: true }
        }
      }
    });
    
    console.log('\n=== VERIFICATION ===');
    users.forEach(user => {
      console.log(`${user.name} (${user.email}) - ${user.role}`);
      if (user.assignedTrainer) {
        console.log(`  → Trainer: ${user.assignedTrainer.name}`);
      }
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

completeCleanup();