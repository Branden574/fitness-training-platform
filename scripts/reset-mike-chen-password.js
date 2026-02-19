const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function resetMikeChenPassword() {
  console.log('🔑 Setting Mike Chen password to "password"...');

  try {
    const hashedPassword = await bcrypt.hash('password', 12);
    
    const user = await prisma.user.update({
      where: { email: 'mike.chen@email.com' },
      data: { 
        password: hashedPassword,
        passwordChangeRequired: false
      }
    });

    console.log('✅ Password updated for Mike Chen');
    console.log('📧 Email:', user.email);
    console.log('🔐 Password: password');
    console.log('🆔 User ID:', user.id);

  } catch (error) {
    console.error('❌ Error updating password:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetMikeChenPassword();