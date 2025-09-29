const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkContactSubmissions() {
  try {
    console.log('📋 Checking contact submissions...');
    
    const submissions = await prisma.contactSubmission.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5
    });
    
    console.log('📊 Found submissions:', submissions.length);
    submissions.forEach((sub, idx) => {
      console.log(`${idx + 1}. ${sub.name} (${sub.email}) - Status: ${sub.status}`);
      console.log(`   ID: ${sub.id}`);
      console.log(`   Created: ${sub.createdAt}`);
      console.log('---');
    });
    
    // Check if any are PENDING
    const pending = submissions.filter(s => s.status === 'PENDING');
    console.log(`🔄 Pending submissions: ${pending.length}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkContactSubmissions();