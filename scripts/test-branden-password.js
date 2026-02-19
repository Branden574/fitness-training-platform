// Test common passwords for Branden
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

async function testBrandenPassword() {
  try {
    console.log('🔍 Testing common passwords for Branden...');
    
    const user = await prisma.user.findUnique({
      where: { email: 'branden574@gmail.com' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        password: true,
        passwordChangeRequired: true
      }
    });
    
    if (!user) {
      console.log('❌ User not found');
      return;
    }
    
    console.log('✅ Found user account:');
    console.log(`   Name: ${user.name}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Password change required: ${user.passwordChangeRequired}`);
    
    // Test common passwords
    const possiblePasswords = [
      'Changemetoday1234!',  // From reset script
      'password123',
      'demo123', 
      'client123',
      'branden123',
      'fitness123',
      'test123',
      'BrandFitness2025!',
      'ClientAccess2025!',
      'UltraPassword123!',
      'BrentFitness2025!'
    ];
    
    console.log('\n🔐 Testing possible passwords...');
    
    let foundPassword = null;
    for (const testPassword of possiblePasswords) {
      const isMatch = await bcrypt.compare(testPassword, user.password);
      console.log(`   ${testPassword}: ${isMatch ? '✅ MATCH!' : '❌ No match'}`);
      
      if (isMatch) {
        foundPassword = testPassword;
        break;
      }
    }
    
    if (foundPassword) {
      console.log(`\n🎉 SUCCESS! Found working password: ${foundPassword}`);
      console.log('\n📋 Login credentials:');
      console.log(`   Email: ${user.email}`);
      console.log(`   Password: ${foundPassword}`);
      console.log('\n🌐 You can now login at http://localhost:3000');
    } else {
      console.log('\n❌ No matching password found. You may need to reset it.');
      console.log('💡 Try running a password reset script or use admin access to set a new password.');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testBrandenPassword();