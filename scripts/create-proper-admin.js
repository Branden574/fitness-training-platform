const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createProperAdminAccount() {
  try {
    console.log('🔧 Creating proper admin account...');

    // Create the correct admin account
    console.log('👤 Creating admin@fitness-platform.com...');
    const adminHash = await bcrypt.hash('admin123!', 12);
    
    const admin = await prisma.user.upsert({
      where: { email: 'admin@fitness-platform.com' },
      update: {
        password: adminHash,
        role: 'ADMIN',
        passwordChangeRequired: false
      },
      create: {
        name: 'Platform Administrator',
        email: 'admin@fitness-platform.com',
        password: adminHash,
        role: 'ADMIN',
        emailVerified: new Date(),
        passwordChangeRequired: false,
        isActive: true,
        loginCount: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    console.log('✅ Proper admin account created successfully!');
    console.log('\n🔑 CORRECT ADMIN LOGIN CREDENTIALS:');
    console.log('=====================================');
    console.log('🔧 ADMIN ACCESS:');
    console.log('   Email: admin@fitness-platform.com');
    console.log('   Password: admin123!');
    console.log('   Role: ADMIN');
    console.log('=====================================');
    console.log('');
    console.log('🏋️ BRENT\'S TRAINER ACCESS (unchanged):');
    console.log('   Email: martinezfitness559@gmail.com');
    console.log('   Password: trainer123');
    console.log('   Role: TRAINER');
    console.log('=====================================');
    console.log('');
    console.log('🌐 Access the app at: http://localhost:3000');
    console.log('📊 Admin dashboard: http://localhost:3000/admin');

  } catch (error) {
    console.error('❌ Error creating admin account:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createProperAdminAccount();