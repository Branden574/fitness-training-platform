const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://postgres:a3Ppt6cv.%40R.%217Y@db.zqgaogztrxzsevimqelr.supabase.co:5432/postgres"
    }
  }
});

async function testUserAuth() {
  console.log('🔍 Testing user authentication...\n');
  
  // Test accounts
  const testAccounts = [
    { email: 'admin@fitness-platform.com', password: 'admin123!' },
    { email: 'martinezfitness559@gmail.com', password: 'trainer123' }
  ];
  
  for (const account of testAccounts) {
    console.log(`🧪 Testing: ${account.email}`);
    
    // Find user
    const user = await prisma.user.findUnique({
      where: { email: account.email },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        password: true,
        isActive: true,
        passwordChangeRequired: true
      }
    });
    
    if (!user) {
      console.log(`❌ User not found: ${account.email}\n`);
      continue;
    }
    
    console.log(`✅ User found:`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Name: ${user.name}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Active: ${user.isActive}`);
    console.log(`   Password Change Required: ${user.passwordChangeRequired}`);
    console.log(`   Has Password: ${!!user.password}`);
    
    // Test password
    if (user.password) {
      const isValid = await bcrypt.compare(account.password, user.password);
      console.log(`   Password "${account.password}" valid: ${isValid ? '✅' : '❌'}`);
      
      if (!isValid) {
        console.log('🔄 Resetting password...');
        const newHash = await bcrypt.hash(account.password, 12);
        await prisma.user.update({
          where: { id: user.id },
          data: { password: newHash }
        });
        console.log('✅ Password reset complete');
      }
    }
    
    console.log('');
  }
  
  await prisma.$disconnect();
}

testUserAuth().catch(console.error);