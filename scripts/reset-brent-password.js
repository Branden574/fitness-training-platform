/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unused-vars */
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function resetBrentPassword() {
  try {
    // Hash a simple password
    const newPassword = await bcrypt.hash('trainer123', 12);
    
    // Update Brent's password (Martinezfitness account)
    const updated = await prisma.user.update({
      where: { email: 'Martinezfitness559@gmail.com' },
      data: { password: newPassword }
    });
    
    console.log('✅ Updated password for Brent Martinez (Trainer)');
    console.log('');
    console.log('🔑 TRAINER LOGIN CREDENTIALS:');
    console.log('   Email: Martinezfitness559@gmail.com');
    console.log('   Password: trainer123');
    console.log('');
    console.log('🔗 Login URL: http://localhost:3000/auth/signin');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetBrentPassword();