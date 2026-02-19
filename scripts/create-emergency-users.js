const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createEmergencyUsers() {
  try {
    console.log('🚑 Creating emergency user accounts for SQLite...');

    // Create Admin user (Branden)
    console.log('👤 Creating admin user...');
    const adminHash = await bcrypt.hash('admin123!', 12);
    
    const admin = await prisma.user.upsert({
      where: { email: 'branden574@gmail.com' },
      update: {},
      create: {
        id: 'cmfshvopt0001xn7cknp53i6g',
        name: 'Branden Vincent-Walker',
        email: 'branden574@gmail.com',
        password: adminHash,
        role: 'CLIENT',  // You can change this to ADMIN if you add that role
        emailVerified: new Date(),
        passwordChangeRequired: false,
        createdAt: new Date('2025-09-20T16:40:29.922Z'),
        updatedAt: new Date()
      }
    });

    // Create Brent's trainer account
    console.log('🏋️ Creating Brent\'s trainer account...');
    const brentHash = await bcrypt.hash('trainer123', 12);
    
    const brent = await prisma.user.upsert({
      where: { email: 'martinezfitness559@gmail.com' },
      update: {},
      create: {
        id: 'cmfrvd24n0000xn64kezt50io',
        name: 'Brent Martinez',
        email: 'martinezfitness559@gmail.com',
        password: brentHash,
        role: 'TRAINER',
        emailVerified: new Date(),
        passwordChangeRequired: false,
        createdAt: new Date('2025-09-20T06:10:09.287Z'),
        updatedAt: new Date()
      }
    });

    console.log('✅ Emergency accounts created successfully!');
    console.log('\n🔑 LOGIN CREDENTIALS:');
    console.log('=====================================');
    console.log('🔧 ADMIN ACCESS:');
    console.log('   Email: branden574@gmail.com');
    console.log('   Password: admin123!');
    console.log('');
    console.log('🏋️ BRENT\'S TRAINER ACCESS:');
    console.log('   Email: martinezfitness559@gmail.com');
    console.log('   Password: trainer123');
    console.log('=====================================');
    console.log('');
    console.log('🌐 Access the app at: http://localhost:3001');
    console.log('');
    console.log('⚠️  NOTE: This is using SQLite temporarily while we fix Supabase');

  } catch (error) {
    console.error('❌ Error creating emergency users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createEmergencyUsers();