const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function testUserCredentials() {
  try {
    console.log('=== USER ACCOUNT STATUS ===\n');

    const users = await prisma.user.findMany({
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

    console.log(`Found ${users.length} users:\n`);

    for (const user of users) {
      console.log(`📧 ${user.email}`);
      console.log(`   Name: ${user.name}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Has Password: ${user.password ? 'Yes' : 'No'}`);
      console.log(`   Password Change Required: ${user.passwordChangeRequired}`);
      console.log(`   Created: ${user.createdAt.toLocaleDateString()}`);
      
      // Test if password matches common defaults
      if (user.password) {
        const commonPasswords = [
          'Changemetoday1234!',
          'password123',
          'password',
          'Changemetoday1234',
          'Branden123!',
          'Brent123!'
        ];
        
        for (const testPassword of commonPasswords) {
          const isMatch = await bcrypt.compare(testPassword, user.password);
          if (isMatch) {
            console.log(`   ✅ Password is: "${testPassword}"`);
            break;
          }
        }
      }
      console.log('');
    }

    console.log('=== SIGN-IN INSTRUCTIONS ===');
    console.log('To test the trainer-client relationship:');
    console.log('1. Sign in as Brent (trainer): brent@trainer.com');
    console.log('2. Go to trainer dashboard to see Branden in clients list');
    console.log('3. Sign out and sign in as Branden: branden574@gmail.com');
    console.log('4. Go to client dashboard to see Brent as assigned trainer');

  } catch (error) {
    console.error('Error testing credentials:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testUserCredentials();