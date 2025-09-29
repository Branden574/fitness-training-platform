require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');

async function testConnectionWithDifferentConfigs() {
    console.log('🔍 Testing Prisma connection with different configurations...\n');
    
    const baseUrl = process.env.DATABASE_URL;
    console.log('Base URL (first 50):', baseUrl.substring(0, 50) + '...');
    
    // Test with connection pooling parameters
    const configs = [
        {
            name: 'Default configuration',
            config: {}
        },
        {
            name: 'With pgbouncer disabled',
            url: baseUrl + '?pgbouncer=false'
        },
        {
            name: 'With connection limit',
            url: baseUrl + '?connection_limit=1'
        },
        {
            name: 'With socket timeout',
            url: baseUrl + '?socket_timeout=10'
        },
        {
            name: 'With connection timeout',
            url: baseUrl + '?connect_timeout=10'
        },
        {
            name: 'Direct connection (no pooling)',
            url: baseUrl + '?pgbouncer=false&connection_limit=1&pool_timeout=10'
        }
    ];
    
    for (const { name, url, config } of configs) {
        try {
            console.log(`\n🧪 Testing: ${name}`);
            
            const prismaConfig = url ? {
                datasources: { db: { url } }
            } : config;
            
            const prisma = new PrismaClient(prismaConfig);
            
            console.log('  - Connecting...');
            await prisma.$connect();
            
            console.log('  - Querying...');
            const count = await prisma.user.count();
            
            console.log('  - Disconnecting...');
            await prisma.$disconnect();
            
            console.log(`  ✅ SUCCESS! User count: ${count}`);
            
        } catch (error) {
            console.log(`  ❌ FAILED: ${error.message.substring(0, 100)}...`);
        }
    }
}

testConnectionWithDifferentConfigs();