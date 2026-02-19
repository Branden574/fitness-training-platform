const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env.local' });

const prisma = new PrismaClient();

async function createAdminUser() {
  try {
    console.log('🔧 Creating admin user...');

    // Check if admin already exists
    const existingAdmin = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    });

    if (existingAdmin) {
      console.log('✅ Admin user already exists:', existingAdmin.email);
      return;
    }

    // Create admin user
    const hashedPassword = await bcrypt.hash('admin123!', 12);
    
    const adminUser = await prisma.user.create({
      data: {
        name: 'Platform Administrator',
        email: 'admin@fitness-platform.com',
        password: hashedPassword,
        role: 'ADMIN',
        isActive: true,
        loginCount: 0,
        emailVerified: new Date()
      }
    });

    console.log('✅ Admin user created successfully!');
    console.log('📧 Email: admin@fitness-platform.com');
    console.log('🔑 Password: admin123!');
    console.log('🆔 User ID:', adminUser.id);
    
    console.log('\n🎯 You can now access the admin dashboard at:');
    console.log('   http://localhost:3000/admin');

  } catch (error) {
    console.error('❌ Error creating admin user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdminUser();