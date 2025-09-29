const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

// Let's test a few different connection strings
const connectionStrings = [
  "postgresql://postgres:iE27%26%2BnQ7VdHp8%23@db.zqgaogztrxzsevimqelr.supabase.co:5432/postgres",
  "postgresql://postgres.zqgaogztrxzsevimqelr:GhYDHFVcjQ41Td4L@aws-1-us-west-1.pooler.supabase.com:5432/postgres",
  "postgresql://postgres:GhYDHFVcjQ41Td4L@db.zqgaogztrxzsevimqelr.supabase.co:5432/postgres"
];

async function testConnections() {
  console.log('🔍 Testing database connections...\n');
  
  for (let i = 0; i < connectionStrings.length; i++) {
    console.log(`Testing connection ${i + 1}/3...`);
    
    const prisma = new PrismaClient({
      datasources: {
        db: {
          url: connectionStrings[i]
        }
      }
    });
    
    try {
      await prisma.$connect();
      console.log(`✅ Connection ${i + 1} successful!`);
      
      // If successful, try to query users
      const users = await prisma.user.findMany({
        select: {
          email: true,
          name: true,
          role: true
        }
      });
      
      console.log(`Found ${users.length} users:`);
      users.forEach(user => {
        console.log(`   - ${user.name} (${user.email}) - ${user.role}`);
      });
      
      await prisma.$disconnect();
      console.log(`\nWorking connection string:\n${connectionStrings[i]}\n`);
      return connectionStrings[i];
    } catch (error) {
      console.log(`❌ Connection ${i + 1} failed: ${error.message}`);
      await prisma.$disconnect();
    }
  }
  
  console.log('\n❌ All connections failed. Database may be inactive.');
  return null;
}

testConnections().catch(console.error);