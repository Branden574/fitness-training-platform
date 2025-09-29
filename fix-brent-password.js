const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env.local' });

const prisma = new PrismaClient();

async function fixBrentPassword() {
  try {
    console.log('🔧 Fixing Brent\'s password settings...');

    // Update Brent's account to NOT require password change
    await prisma.user.update({
      where: { email: 'martinezfitness559@gmail.com' },
      data: {
        passwordChangeRequired: false  // Let him change it when HE wants to
      }
    });

    console.log('✅ Fixed! Brent can now sign in normally without being forced to change password');
    console.log('📧 Email: martinezfitness559@gmail.com');
    console.log('🔑 Password: BrentFitness2025!');
    console.log('💡 He can change his password later through profile settings when he\'s ready');

  } catch (error) {
    console.error('❌ Error fixing password:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixBrentPassword();