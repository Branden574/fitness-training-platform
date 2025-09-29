const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function setupRailwayAccounts() {
  try {
    console.log('🚂 Setting up Railway database with essential accounts...');
    
    // 1. Create/Update Brent's Admin Account
    console.log('👨‍💼 Creating admin account...');
    const adminPassword = await bcrypt.hash('admin123', 12);
    const admin = await prisma.user.upsert({
      where: { email: 'admin@brentmartinezfitness.com' },
      update: {},
      create: {
        name: 'Brent Martinez',
        email: 'admin@brentmartinezfitness.com',
        password: adminPassword,
        role: 'ADMIN',
        isActive: true,
        loginCount: 0
      }
    });
    console.log('✅ Admin created:', admin.email);
    
    // 2. Create Brent's Trainer Account
    console.log('👨‍🏋️ Creating trainer account...');
    const trainerPassword = await bcrypt.hash('trainer123', 12);
    const trainer = await prisma.user.upsert({
      where: { email: 'martinezfitness559@gmail.com' },
      update: {},
      create: {
        name: 'Brent Martinez',
        email: 'martinezfitness559@gmail.com',
        password: trainerPassword,
        role: 'TRAINER',
        isActive: true,
        loginCount: 0
      }
    });
    
    // Create trainer profile
    await prisma.trainer.upsert({
      where: { userId: trainer.id },
      update: {},
      create: {
        userId: trainer.id,
        bio: 'Certified personal trainer specializing in strength training and nutrition.',
        specializations: ['Strength Training', 'Weight Loss', 'Nutrition'],
        experience: 5,
        certifications: ['ACSM-CPT', 'Nutrition Specialist'],
        hourlyRate: 75.00
      }
    });
    console.log('✅ Trainer created:', trainer.email);
    
    // 3. Create Branden574 Client Account
    console.log('👤 Creating branden574 client account...');
    const clientPassword = await bcrypt.hash('branden123', 12);
    const client = await prisma.user.upsert({
      where: { email: 'branden574@gmail.com' },
      update: {},
      create: {
        name: 'Branden Vincent-Walker',
        email: 'branden574@gmail.com',
        password: clientPassword,
        role: 'CLIENT',
        isActive: true,
        trainerId: trainer.id, // Assign to Brent as trainer
        loginCount: 0
      }
    });
    
    // Create client profile
    await prisma.clientProfile.upsert({
      where: { userId: client.id },
      update: {},
      create: {
        userId: client.id,
        age: 25,
        height: 72, // 6 feet
        weight: 180,
        fitnessGoals: ['Weight Loss', 'Muscle Building'],
        fitnessLevel: 'INTERMEDIATE',
        preferences: {
          workoutDays: ['Monday', 'Wednesday', 'Friday'],
          workoutTime: 'Morning',
          equipment: ['Free Weights', 'Machines']
        }
      }
    });
    console.log('✅ Client created:', client.email, '(assigned to trainer)');
    
    // Clean up any unwanted test accounts
    await prisma.user.deleteMany({
      where: {
        email: {
          notIn: [
            'admin@brentmartinezfitness.com',
            'martinezfitness559@gmail.com', 
            'branden574@gmail.com'
          ]
        }
      }
    });
    
    console.log('\\n🎉 Railway database setup complete!');
    console.log('═══════════════════════════════════════');
    console.log('📧 Login Credentials:');
    console.log('👨‍💼 Admin: admin@brentmartinezfitness.com / admin123');
    console.log('👨‍🏋️ Trainer: martinezfitness559@gmail.com / trainer123');
    console.log('👤 Client: branden574@gmail.com / branden123');
    console.log('═══════════════════════════════════════');
    
  } catch (error) {
    console.error('❌ Error setting up accounts:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  setupRailwayAccounts();
}

module.exports = { setupRailwayAccounts };