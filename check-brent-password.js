const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function checkBrentPassword() {
  try {
    console.log('🔍 Checking Brent\'s current account status...');
    
    const brent = await prisma.user.findUnique({
      where: { email: 'martinezfitness559@gmail.com' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        password: true,
        passwordChangeRequired: true
      }
    });
    
    if (!brent) {
      console.log('❌ Brent account not found');
      return;
    }
    
    console.log('✅ Found Brent\'s account:');
    console.log(`   ID: ${brent.id}`);
    console.log(`   Name: ${brent.name}`);
    console.log(`   Email: ${brent.email}`);
    console.log(`   Role: ${brent.role}`);
    console.log(`   Password change required: ${brent.passwordChangeRequired}`);
    
    // Test common passwords
    const possiblePasswords = ['trainer123', 'demo123', 'password123'];
    
    console.log('\n🔐 Testing common passwords...');
    for (const testPassword of possiblePasswords) {
      const isMatch = await bcrypt.compare(testPassword, brent.password);
      console.log(`   ${testPassword}: ${isMatch ? '✅ MATCH' : '❌ No match'}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkBrentPassword();