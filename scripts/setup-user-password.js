// Check and set user password for login
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

async function setupUserPassword() {
  try {
    console.log('🔐 Setting up user password for login...');
    
    const user = await prisma.user.findUnique({
      where: { email: 'branden574@gmail.com' }
    });
    
    if (!user) {
      console.log('❌ User not found');
      return;
    }
    
    console.log('👤 User found:', user.email);
    console.log('🔒 Has password:', !!user.password);
    
    if (!user.password) {
      console.log('🔧 Setting default password "password123" for testing...');
      
      // Hash the password
      const hashedPassword = await bcrypt.hash('password123', 12);
      
      // Update user with password
      await prisma.user.update({
        where: { id: user.id },
        data: { 
          password: hashedPassword,
          passwordChangeRequired: false  // Set to false for easier testing
        }
      });
      
      console.log('✅ Password set successfully!');
      console.log('📋 Login credentials:');
      console.log('   Email: branden574@gmail.com');
      console.log('   Password: password123');
      
    } else {
      console.log('✅ User already has a password');
      console.log('📋 You can login with existing credentials');
    }
    
    console.log('\n🌐 Next steps:');
    console.log('1. Go to http://localhost:3000');
    console.log('2. Click Sign In');
    console.log('3. Use the credentials above');
    console.log('4. Navigate to Client Dashboard');
    console.log('5. Check Progress tab for charts');
    
  } catch (error) {
    console.error('❌ Error setting up password:', error);
  } finally {
    await prisma.$disconnect();
  }
}

setupUserPassword();