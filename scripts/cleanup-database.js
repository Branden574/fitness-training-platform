/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unused-vars */
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function cleanupAndCreateCorrectUsers() {
  try {
    console.log('=== CLEANING UP DATABASE ===');
    
    // First, delete all messages to avoid foreign key constraints
    await prisma.message.deleteMany({});
    console.log('✅ Deleted all messages');
    
    // Delete all users except Branden Vincent-Walker
    const brandenUser = await prisma.user.findUnique({
      where: { email: 'branden574@gmail.com' }
    });
    
    if (brandenUser) {
      // Delete all other users
      await prisma.user.deleteMany({
        where: {
          NOT: {
            email: 'branden574@gmail.com'
          }
        }
      });
      console.log('✅ Deleted all users except Branden Vincent-Walker');
      
      // Update Branden to be CLIENT with correct trainer assignment (we'll create trainer next)
      await prisma.user.update({
        where: { email: 'branden574@gmail.com' },
        data: {
          role: 'CLIENT',
          trainerId: null // Will assign after creating trainer
        }
      });
    }
    
    // Create Brent Martinez as TRAINER with correct credentials
    const hashedPassword = await bcrypt.hash('trainer123', 12);
    
    const brentMartinez = await prisma.user.create({
      data: {
        name: 'Brent Martinez',
        email: 'brent@trainer.com', // New email for trainer
        password: hashedPassword,
        role: 'TRAINER'
      }
    });
    
    console.log('✅ Created Brent Martinez as TRAINER');
    console.log('   Email: brent@trainer.com');
    console.log('   Password: trainer123');
    
    // Now assign Branden to Brent as trainer
    if (brandenUser) {
      await prisma.user.update({
        where: { email: 'branden574@gmail.com' },
        data: { trainerId: brentMartinez.id }
      });
      console.log('✅ Assigned Branden Vincent-Walker to Brent Martinez');
    }
    
    console.log('\n=== FINAL DATABASE STATE ===');
    const finalUsers = await prisma.user.findMany({
      select: { name: true, email: true, role: true, trainerId: true },
      include: {
        assignedTrainer: {
          select: { name: true, email: true }
        }
      }
    });
    
    finalUsers.forEach(user => {
      console.log(`${user.name} (${user.email}) - ${user.role}`);
      if (user.assignedTrainer) {
        console.log(`  → Trainer: ${user.assignedTrainer.name}`);
      }
    });
    
    console.log('\n🎯 LOGIN CREDENTIALS:');
    console.log('TRAINER: brent@trainer.com / trainer123');
    console.log('CLIENT: branden574@gmail.com / (existing password)');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanupAndCreateCorrectUsers();