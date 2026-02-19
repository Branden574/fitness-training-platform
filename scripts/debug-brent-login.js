const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function debugBrentLogin() {
  try {
    console.log('🔍 Debugging Brent login issue...');
    
    // Find Brent's account
    const brent = await prisma.user.findUnique({
      where: { email: 'martinezfitness559@gmail.com' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        password: true,
        passwordChangeRequired: true,
        createdAt: true
      }
    });
    
    if (!brent) {
      console.log('❌ Brent account not found');
      return;
    }
    
    console.log('✅ Found Brent account:');
    console.log(`   ID: ${brent.id}`);
    console.log(`   Name: ${brent.name}`);
    console.log(`   Email: ${brent.email}`);
    console.log(`   Role: ${brent.role}`);
    console.log(`   Has password: ${!!brent.password}`);
    console.log(`   Password change required: ${brent.passwordChangeRequired}`);
    console.log(`   Created: ${brent.createdAt}`);
    
    // Test the password
    if (brent.password) {
      console.log('\n🔐 Testing password: trainer123');
      const isMatch = await bcrypt.compare('trainer123', brent.password);
      console.log(`   Password matches: ${isMatch ? '✅ YES' : '❌ NO'}`);
      
      if (!isMatch) {
        console.log('\n🔄 Resetting password to trainer123...');
        const newHash = await bcrypt.hash('trainer123', 12);
        await prisma.user.update({
          where: { id: brent.id },
          data: { 
            password: newHash,
            passwordChangeRequired: false
          }
        });
        console.log('✅ Password reset complete');
      }
    } else {
      console.log('❌ No password set - setting password now...');
      const newHash = await bcrypt.hash('trainer123', 12);
      await prisma.user.update({
        where: { id: brent.id },
        data: { 
          password: newHash,
          passwordChangeRequired: false
        }
      });
      console.log('✅ Password set to trainer123');
    }
    
    console.log('\n🔑 LOGIN CREDENTIALS:');
    console.log('   Email: martinezfitness559@gmail.com');
    console.log('   Password: trainer123');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugBrentLogin();