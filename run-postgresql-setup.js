#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Check if DATABASE_URL is set
const databaseUrl = process.env.DATABASE_URL;

console.log('🔍 Checking PostgreSQL setup...\n');

if (!databaseUrl) {
  console.log('❌ DATABASE_URL not found in environment variables');
  console.log('📝 Please add your PostgreSQL connection string to .env file:');
  console.log('   DATABASE_URL="postgresql://username:password@host:5432/database"\n');
  console.log('💡 Get your connection string from:');
  console.log('   • Supabase: Settings → Database → Connection string → URI');
  console.log('   • Vercel: Database Settings → Connection String');
  console.log('   • Railway: PostgreSQL service → Connect tab\n');
  process.exit(1);
}

if (databaseUrl.includes('sqlite') || databaseUrl.includes('file:')) {
  console.log('⚠️  DATABASE_URL still points to SQLite');
  console.log('📝 Please update your .env file with PostgreSQL connection string\n');
  process.exit(1);
}

console.log('✅ PostgreSQL DATABASE_URL found');
console.log('🔗 Connection:', databaseUrl.replace(/:[^:@]*@/, ':***@')); // Hide password

// Check if schema file exists
const schemaExists = fs.existsSync('./schema-postgresql.prisma');
if (!schemaExists) {
  console.log('❌ PostgreSQL schema file not found');
  console.log('📝 Please ensure schema-postgresql.prisma exists\n');
  process.exit(1);
}

console.log('✅ PostgreSQL schema file found');

// Check if migration script exists
const migrationExists = fs.existsSync('./migrate-to-postgresql.js');
if (!migrationExists) {
  console.log('❌ Migration script not found');
  console.log('📝 Please ensure migrate-to-postgresql.js exists\n');
  process.exit(1);
}

console.log('✅ Migration script found');

console.log('\n🚀 Ready for PostgreSQL migration!');
console.log('==================================\n');

console.log('📋 Next steps:');
console.log('1. Backup your current schema: cp prisma/schema.prisma prisma/schema-sqlite-backup.prisma');
console.log('2. Replace schema: cp schema-postgresql.prisma prisma/schema.prisma');
console.log('3. Update Prisma client: npx prisma generate');
console.log('4. Deploy to PostgreSQL: npx prisma db push');
console.log('5. Run migration: node migrate-to-postgresql.js');
console.log('6. Test your application: npm run dev\n');

console.log('🤖 Would you like me to run these steps automatically? (y/n)');

// Simple prompt handling
const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('', async (answer) => {
  if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
    console.log('\n🚀 Starting automated PostgreSQL setup...\n');
    
    try {
      // Step 1: Backup current schema
      console.log('📁 Creating backup of current schema...');
      fs.copyFileSync('./prisma/schema.prisma', './prisma/schema-sqlite-backup.prisma');
      console.log('✅ Backup created: prisma/schema-sqlite-backup.prisma\n');

      // Step 2: Replace with PostgreSQL schema
      console.log('🔄 Updating schema to PostgreSQL...');
      fs.copyFileSync('./schema-postgresql.prisma', './prisma/schema.prisma');
      console.log('✅ Schema updated to PostgreSQL\n');

      // Step 3: Generate Prisma client
      console.log('⚙️  Generating new Prisma client...');
      const { execSync } = require('child_process');
      execSync('npx prisma generate', { stdio: 'inherit' });
      console.log('✅ Prisma client generated\n');

      // Step 4: Deploy to PostgreSQL
      console.log('📡 Deploying schema to PostgreSQL...');
      execSync('npx prisma db push', { stdio: 'inherit' });
      console.log('✅ Schema deployed to PostgreSQL\n');

      // Step 5: Run migration
      console.log('🚚 Migrating data from SQLite to PostgreSQL...');
      execSync('node migrate-to-postgresql.js', { stdio: 'inherit' });
      console.log('✅ Data migration completed\n');

      console.log('🎉 PostgreSQL setup completed successfully!');
      console.log('🔗 Your database is now running on PostgreSQL');
      console.log('💾 SQLite backup available at: prisma/schema-sqlite-backup.prisma');
      console.log('🧪 Test your application with: npm run dev\n');

      console.log('🛠 VS Code Database Connection:');
      console.log('1. Press Cmd+Shift+P');
      console.log('2. Type "SQLTools: Add New Connection"');
      console.log('3. Select PostgreSQL');
      console.log('4. Use your DATABASE_URL connection string');
      console.log('5. Connect and explore your data!\n');

    } catch (error) {
      console.error('❌ Setup failed:', error.message);
      console.log('\n🔄 Restoring SQLite schema...');
      
      // Restore backup if it exists
      if (fs.existsSync('./prisma/schema-sqlite-backup.prisma')) {
        fs.copyFileSync('./prisma/schema-sqlite-backup.prisma', './prisma/schema.prisma');
        console.log('✅ SQLite schema restored');
      }
      
      console.log('📝 Please check the error above and try again');
      process.exit(1);
    }
  } else {
    console.log('\n📝 Manual setup instructions:');
    console.log('1. cp prisma/schema.prisma prisma/schema-sqlite-backup.prisma');
    console.log('2. cp schema-postgresql.prisma prisma/schema.prisma');
    console.log('3. npx prisma generate');
    console.log('4. npx prisma db push');
    console.log('5. node migrate-to-postgresql.js');
    console.log('6. npm run dev\n');
  }
  
  rl.close();
});