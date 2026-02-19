// Check user authentication setup
const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: '.env.local' });

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

async function checkUserAuth() {
  try {
    console.log('🔐 Checking user authentication setup...');
    
    // Check if the user exists and can login
    const user = await prisma.user.findUnique({
      where: { email: 'branden574@gmail.com' }
    });
    
    if (!user) {
      console.log('❌ User branden574@gmail.com not found in database');
      return;
    }
    
    console.log('✅ User found:', {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      emailVerified: user.emailVerified
    });
    
    // Check if there are any active sessions
    const sessions = await prisma.session.findMany({
      where: { userId: user.id },
      orderBy: { expires: 'desc' }
    });
    
    console.log(`📱 Found ${sessions.length} sessions for user`);
    
    if (sessions.length > 0) {
      const validSessions = sessions.filter(s => s.expires > new Date());
      console.log(`✅ ${validSessions.length} valid (non-expired) sessions`);
      
      validSessions.forEach((session, i) => {
        console.log(`  Session ${i + 1}: expires ${session.expires.toISOString()}`);
      });
      
      if (validSessions.length === 0) {
        console.log('⚠️  All sessions are expired - user needs to login again');
      }
    } else {
      console.log('⚠️  No sessions found - user needs to login');
    }
    
    // Check user accounts for login methods
    const accounts = await prisma.account.findMany({
      where: { userId: user.id }
    });
    
    console.log(`🔑 Found ${accounts.length} auth accounts for user`);
    accounts.forEach(account => {
      console.log(`  - ${account.provider}: ${account.type}`);
    });
    
    // Check if user has workout data (we know they should)
    const workoutCount = await prisma.workoutProgress.count({
      where: {
        workoutSession: {
          userId: user.id
        }
      }
    });
    
    console.log(`💪 User has ${workoutCount} workout progress entries`);
    
    console.log('\n🎯 RECOMMENDATION:');
    if (sessions.filter(s => s.expires > new Date()).length === 0) {
      console.log('👉 User needs to login to the application at http://localhost:3000');
      console.log('   This will create a valid session and allow progress-analytics API access');
    } else {
      console.log('👉 User should already be authenticated - check browser network tab for API calls');
    }
    
  } catch (error) {
    console.error('❌ Error checking user auth:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUserAuth();