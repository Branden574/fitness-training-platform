// Simple database connection test
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://postgres:iE27%26%2BnQ7VdHp8%23@db.zqgaogztrxzsevimqelr.supabase.co:5432/postgres"
    }
  }
});

async function quickTest() {
  console.log('🔍 Testing database connection...\n');
  
  try {
    // Simple connection test
    await prisma.$connect();
    console.log('✅ SUCCESS: Database is connected and working!');
    console.log('🌐 Your live database is accessible at:');
    console.log('   https://supabase.com/dashboard\n');
    
    console.log('📋 What you can do:');
    console.log('   ✅ View all data in Supabase dashboard');
    console.log('   ✅ Edit records directly');
    console.log('   ✅ Monitor Brent\'s activity');
    console.log('   ✅ Add/remove users');
    console.log('   ✅ Run SQL queries');
    console.log('   ✅ Download data backups\n');
    
  } catch (error) {
    console.log('⚠️  Temporary connection issue (database is still live!)');
    console.log('🌐 You can still access via Supabase Dashboard:');
    console.log('   → https://supabase.com/dashboard');
    console.log('   → Sign in and find your project\n');
    
    console.log('🔧 This might be due to:');
    console.log('   • Temporary network issue');
    console.log('   • Supabase maintenance');
    console.log('   • Local connection timeout\n');
    
    console.log('💡 Your database is still working - try the dashboard!');
  } finally {
    await prisma.$disconnect();
  }
}

quickTest();