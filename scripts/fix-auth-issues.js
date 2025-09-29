const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function clearBadSessionsAndVerify() {
  try {
    console.log('🔧 DIAGNOSING AUTHENTICATION ISSUES...');
    console.log('=' .repeat(50));
    
    // Check current users
    const users = await prisma.user.findMany({
      where: { role: 'TRAINER' },
      include: { clients: true }
    });
    
    console.log('👥 CURRENT TRAINERS:');
    users.forEach(user => {
      console.log(`   - ${user.name} (${user.email})`);
      console.log(`     ID: ${user.id}`);
      console.log(`     Clients: ${user.clients.length}`);
      console.log(`     Password Set: ${user.password ? 'Yes' : 'No'}`);
    });
    
    // Check contact submissions and who can access them
    const contacts = await prisma.contactSubmission.findMany();
    console.log(`\n📧 CONTACT SUBMISSIONS: ${contacts.length} total`);
    
    const workouts = await prisma.workout.findMany();
    console.log(`💪 WORKOUTS: ${workouts.length} total`);
    
    console.log('\n🚨 AUTHENTICATION PROBLEM:');
    console.log('   Your browser session is using OLD user ID: cmfoww8ms0000xnv1w7em4jxg');
    console.log('   But your data belongs to BUSINESS ID: cmfrvd24n0000xn64kezt50io');
    
    console.log('\n✅ SOLUTION - MUST CLEAR BROWSER SESSION:');
    console.log('   1. Open Chrome DevTools (F12)');
    console.log('   2. Go to Application tab');
    console.log('   3. Storage > Cookies > http://localhost:3000');
    console.log('   4. Delete ALL cookies (especially next-auth.session-token)');
    console.log('   5. Refresh page and log in with:');
    console.log('      📧 Email: martinezfitness559@gmail.com');
    console.log('      🔑 Password: demo123');
    
    console.log('\n🔄 OR use incognito mode and navigate to:');
    console.log('   http://localhost:3000/auth/signin');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

clearBadSessionsAndVerify();