const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env.local' });

const prisma = new PrismaClient();

async function resetBrentPassword() {
  try {
    console.log('🔧 Resetting Brent\'s password...');

    // Find Brent's account
    const brent = await prisma.user.findUnique({
      where: { email: 'martinezfitness559@gmail.com' }
    });

    if (!brent) {
      console.log('❌ Brent\'s account not found');
      return;
    }

    // Generate new password
    const newPassword = 'BrentFitness2025!';
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    
    // Update password
    await prisma.user.update({
      where: { email: 'martinezfitness559@gmail.com' },
      data: {
        password: hashedPassword,
        passwordChangeRequired: true
      }
    });

    console.log('✅ Brent\'s password reset successfully!');
    console.log('📧 Email: martinezfitness559@gmail.com');
    console.log('🔑 New Password: BrentFitness2025!');
    console.log('⚠️  Brent must change this password on next login');

  } catch (error) {
    console.error('❌ Error resetting password:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetBrentPassword();