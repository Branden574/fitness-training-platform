const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function recreateBranden574() {
  try {
    console.log('🔄 Recreating branden574 account...');
    
    // First, find the trainer (Brent)
    const trainer = await prisma.user.findFirst({
      where: {
        role: 'TRAINER',
        email: 'martinezfitness559@gmail.com'
      }
    });
    
    if (!trainer) {
      console.log('❌ Trainer not found, creating trainer first...');
      // Create trainer if not exists
      const hashedTrainerPassword = await bcrypt.hash('trainer123', 12);
      const newTrainer = await prisma.user.create({
        data: {
          name: 'Brent Martinez',
          email: 'martinezfitness559@gmail.com',
          password: hashedTrainerPassword,
          role: 'TRAINER',
          isActive: true,
        }
      });
      
      await prisma.trainer.create({
        data: {
          userId: newTrainer.id,
          bio: 'Certified personal trainer specializing in strength training and nutrition.',
          specializations: ['Strength Training', 'Weight Loss', 'Nutrition'],
          experience: 5,
          certifications: ['ACSM-CPT', 'Nutrition Specialist'],
          hourlyRate: 75.00
        }
      });
      
      console.log('✅ Trainer created:', newTrainer.email);
      trainer = newTrainer;
    }
    
    // Check if branden574 already exists
    const existingBranden = await prisma.user.findUnique({
      where: { email: 'branden574@gmail.com' }
    });
    
    if (existingBranden) {
      console.log('👤 branden574 already exists:', existingBranden.email);
      return existingBranden;
    }
    
    // Create branden574 account
    const hashedPassword = await bcrypt.hash('branden123', 12);
    
    const branden = await prisma.user.create({
      data: {
        name: 'Branden Vincent-Walker',
        email: 'branden574@gmail.com',
        password: hashedPassword,
        role: 'CLIENT',
        isActive: true,
        trainerId: trainer.id,
        loginCount: 0
      }
    });
    
    // Create client profile
    await prisma.clientProfile.create({
      data: {
        userId: branden.id,
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
    
    console.log('✅ Successfully created branden574 account!');
    console.log('📧 Email: branden574@gmail.com');
    console.log('🔑 Password: branden123');
    console.log('👨‍🏋️ Assigned to trainer:', trainer.email);
    
    return branden;
    
  } catch (error) {
    console.error('❌ Error creating branden574:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  recreateBranden574();
}

module.exports = { recreateBranden574 };