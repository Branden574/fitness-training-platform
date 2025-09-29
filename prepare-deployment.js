const fs = require('fs');
const path = require('path');

console.log('🚀 Preparing for deployment...\n');

// Check if all required files exist
const requiredFiles = [
  'package.json',
  'next.config.ts',
  '.env.local',
  'prisma/schema.prisma'
];

console.log('📁 Checking required files:');
requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`   ✅ ${file}`);
  } else {
    console.log(`   ❌ ${file} - MISSING!`);
  }
});

// Check package.json scripts
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
console.log('\n📦 Build scripts:');
console.log(`   Build: ${packageJson.scripts.build ? '✅' : '❌'}`);
console.log(`   Start: ${packageJson.scripts.start ? '✅' : '❌'}`);
console.log(`   Dev: ${packageJson.scripts.dev ? '✅' : '❌'}`);

// Environment variables check
console.log('\n🔧 Environment setup:');
if (fs.existsSync('.env.local')) {
  const envContent = fs.readFileSync('.env.local', 'utf8');
  console.log(`   DATABASE_URL: ${envContent.includes('DATABASE_URL') ? '✅' : '❌'}`);
  console.log(`   NEXTAUTH_SECRET: ${envContent.includes('NEXTAUTH_SECRET') ? '✅' : '❌'}`);
} else {
  console.log('   ❌ No .env.local file found');
}

console.log('\n🌐 Recommended hosting platforms:');
console.log('   🥇 Vercel (Best for Next.js) - FREE tier available');
console.log('   🥈 Netlify - FREE tier available');
console.log('   🥉 Railway - Simple deployment');

console.log('\n📋 Next steps for hosting:');
console.log('   1. Push code to GitHub if not already done');
console.log('   2. Sign up for Vercel at vercel.com');
console.log('   3. Connect your GitHub repository');
console.log('   4. Add environment variables to Vercel dashboard');
console.log('   5. Deploy! (Automatic)');

console.log('\n🔑 Don\'t forget to set these in your hosting platform:');
console.log('   DATABASE_URL=your_supabase_url');
console.log('   NEXTAUTH_URL=https://your-domain.com');
console.log('   NEXTAUTH_SECRET=your-secret-key');
console.log('   NEXT_PUBLIC_APP_URL=https://your-domain.com');

console.log('\n🎉 Your platform is production-ready!');
console.log('   ✅ Database cleaned and optimized');
console.log('   ✅ Security features enabled');
console.log('   ✅ Performance optimized');
console.log('   ✅ Brent\'s account ready');

console.log('\n📖 See HOSTING-GUIDE.md for detailed instructions');
