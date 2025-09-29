/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unused-vars */
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createTestAccounts() {
  try {
    // Hash password for demo accounts
    const hashedPassword = await bcrypt.hash('demo123', 10);

    // Try to create or update trainer account
    const trainer = await prisma.user.upsert({
      where: { email: 'trainer@demo.com' },
      update: { password: hashedPassword },
      create: {
        name: 'Brent Martinez',
        email: 'trainer@demo.com',
        password: hashedPassword,
        role: 'TRAINER',
      },
    });

    console.log('✅ Trainer account ready!');
    console.log('Email: trainer@demo.com');
    console.log('Password: demo123');

    // Try to create or update client account
    const client = await prisma.user.upsert({
      where: { email: 'client@demo.com' },
      update: { password: hashedPassword },
      create: {
        name: 'John Doe',
        email: 'client@demo.com',
        password: hashedPassword,
        role: 'CLIENT',
        trainerId: trainer.id,
      },
    });

    console.log('✅ Client account ready!');
    console.log('Email: client@demo.com');
    console.log('Password: demo123');

  } catch (error) {
    console.error('Error creating test accounts:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestAccounts();