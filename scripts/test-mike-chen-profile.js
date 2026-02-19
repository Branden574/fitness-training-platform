const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testMikeChenProfile() {
  console.log('🧪 Testing Mike Chen profile data...');

  try {
    // Simulate what the profile API does
    const user = await prisma.user.findUnique({
      where: { email: 'mike.chen@email.com' },
      include: {
        assignedTrainer: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        },
        clientProfile: true
      }
    });

    if (!user) {
      console.log('❌ User not found');
      return;
    }

    // Return user profile data like the API does
    const profileData = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      trainerId: user.trainerId,
      trainer: user.assignedTrainer,
      clientProfile: user.clientProfile,
      createdAt: user.createdAt
    };

    console.log('👤 Mike Chen Profile Data:');
    console.log('- Name:', profileData.name);
    console.log('- Email:', profileData.email);
    console.log('- Role:', profileData.role);
    console.log('- TrainerID:', profileData.trainerId);
    console.log('- Trainer Object:', profileData.trainer);

    if (profileData.trainer) {
      console.log('✅ Trainer is assigned:');
      console.log('  - Trainer Name:', profileData.trainer.name);
      console.log('  - Trainer Email:', profileData.trainer.email);
    } else {
      console.log('❌ No trainer found in profile data');
    }

  } catch (error) {
    console.error('❌ Error testing profile:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testMikeChenProfile();