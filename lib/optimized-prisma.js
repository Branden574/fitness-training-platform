const { PrismaClient } = require('@prisma/client');

// Optimized Prisma configuration for 1000+ concurrent users
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://postgres:iE27%26%2BnQ7VdHp8%23@db.zqgaogztrxzsevimqelr.supabase.co:5432/postgres?connection_limit=100&pool_timeout=20&connect_timeout=60&pool_max_idle_timeout=300"
    }
  },
  log: ['warn', 'error'],
  errorFormat: 'minimal',
});

// Connection pool optimization
prisma.$connect().then(() => {
  console.log('🚀 Optimized Prisma client connected with enhanced connection pooling');
}).catch((error) => {
  console.error('❌ Failed to connect optimized Prisma client:', error);
});

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

module.exports = prisma;