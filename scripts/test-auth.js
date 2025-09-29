/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unused-vars */
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function testAuth() {
  try {
    // Find the admin user
    const admin = await prisma.user.findUnique({
      where: { email: 'admin@brentmartinezfitness.com' }
    });

    if (admin) {
      console.log('Admin user found:', {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
        hasPassword: !!admin.password
      });

      // Test password verification
      if (admin.password) {
        const isValid = await bcrypt.compare('admin123', admin.password);
        console.log('Password verification test:', isValid);
      }
    } else {
      console.log('Admin user not found');
    }

    // List all users
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        password: true
      }
    });

    console.log('\nAll users:');
    allUsers.forEach(user => {
      console.log(`- ${user.email} (${user.role}) - Has password: ${!!user.password}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testAuth();