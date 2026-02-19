// Direct password reset for branden574@gmail.com account
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env.local' });

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

async function resetBrandenPassword() {
  try {
    console.log('🔐 Resetting password for branden574@gmail.com...');
    
    // Find the user
    const user = await prisma.user.findUnique({
      where: { email: 'branden574@gmail.com' },
      select: { id: true, name: true, email: true, role: true }
    });
    
    if (!user) {
      console.log('❌ User not found');
      return;
    }
    
    console.log('👤 Found user:', user.name, '(' + user.email + ')');
    
    // Set new password
    const newPassword = 'Changemetoday1234!';
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    
    // Update the password
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordChangeRequired: true
      }
    });
    
    console.log('✅ Password reset successful!');
    console.log('📋 New login credentials:');
    console.log('Email:', user.email);
    console.log('Password:', newPassword);
    console.log('');
    console.log('⚠️  User will be prompted to change password on next login');
    
    await prisma.$disconnect();
    
  } catch (error) {
    console.error('❌ Error resetting password:', error);
    await prisma.$disconnect();
  }
}

resetBrandenPassword();