import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@brentmartinezfitness.com' },
    update: {},
    create: {
      email: 'admin@brentmartinezfitness.com',
      name: 'Brent Martinez',
      password: adminPassword,
      role: 'ADMIN',
    },
  });

  // Create demo client
  const clientPassword = await bcrypt.hash('demo123', 12);
  const client = await prisma.user.upsert({
    where: { email: 'client@example.com' },
    update: {},
    create: {
      email: 'client@example.com',
      name: 'John Doe',
      password: clientPassword,
      role: 'CLIENT',
    },
  });

  // Create demo trainer
  const trainerPassword = await bcrypt.hash('trainer123', 12);
  const trainer = await prisma.user.upsert({
    where: { email: 'trainer@example.com' },
    update: {},
    create: {
      email: 'trainer@example.com',
      name: 'Jane Smith',
      password: trainerPassword,
      role: 'TRAINER',
    },
  });

  console.log('Seeded users:', { admin, client, trainer });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });