require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function showUserInfo() {
  try {
    console.log('🔍 Fetching user information...\n');
    
    // Get all users with their basic info
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        // Note: We don't select the password hash for security reasons
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log('👥 Users in the system:');
    console.log('========================\n');

    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name || 'No name'}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Created: ${user.createdAt.toLocaleDateString()}`);
      console.log(`   ID: ${user.id}`);
      console.log('');
    });

    console.log('\n📝 Note: Passwords are securely hashed and cannot be displayed.');
    console.log('💡 To reset a password, use the password reset functionality.');

    // Find Brent specifically
    const brent = users.find(user => 
      user.email.toLowerCase().includes('brent') || 
      user.name?.toLowerCase().includes('brent')
    );

    if (brent) {
      console.log('\n🎯 Found Brent:');
      console.log(`   Name: ${brent.name}`);
      console.log(`   Email: ${brent.email}`);
      console.log(`   Role: ${brent.role}`);
    } else {
      console.log('\n❓ No user found with "brent" in name or email');
    }

  } catch (error) {
    console.error('❌ Error fetching user info:', error);
  } finally {
    await prisma.$disconnect();
  }
}

showUserInfo();