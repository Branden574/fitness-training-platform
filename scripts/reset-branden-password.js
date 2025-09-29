/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unused-vars */
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function resetBrandenPassword() {
  try {
    // Hash a simple password
    const newPassword = await bcrypt.hash('branden123', 12);
    
    // Update Branden's password
    const updated = await prisma.user.update({
      where: { email: 'branden574@gmail.com' },
      data: { password: newPassword }
    });
    
    console.log('✅ Updated password for Branden Vincent-Walker');
    console.log('');
    console.log('🔑 NEW CLIENT LOGIN CREDENTIALS:');
    console.log('   Email: branden574@gmail.com');
    console.log('   Password: branden123');
    console.log('');
    console.log('🔑 TRAINER LOGIN CREDENTIALS:');
    console.log('   Email: brent@trainer.com');
    console.log('   Password: trainer123');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetBrandenPassword();