const { PrismaClient } = require('@prisma/client');

async function comparePrismaConfigurations() {
    console.log('🔍 Comparing Prisma configurations between environments...\n');

    // Check environment variables
    console.log('📝 Environment Variables:');
    console.log('========================');
    console.log('NODE_ENV:', process.env.NODE_ENV);
    console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
    console.log('DATABASE_URL length:', process.env.DATABASE_URL?.length || 0);
    console.log('DATABASE_URL starts with:', process.env.DATABASE_URL?.substring(0, 30) + '...');
    
    // Test different Prisma Client configurations
    console.log('\n🧪 Testing different Prisma Client configurations:');
    console.log('==================================================');

    // Configuration 1: Default
    try {
        console.log('\n1️⃣ Testing default Prisma Client...');
        const prisma1 = new PrismaClient();
        await prisma1.$connect();
        const count1 = await prisma1.user.count();
        console.log('✅ Default client works! User count:', count1);
        await prisma1.$disconnect();
    } catch (error) {
        console.log('❌ Default client failed:', error.message);
    }

    // Configuration 2: With explicit datasource
    try {
        console.log('\n2️⃣ Testing Prisma Client with explicit datasource...');
        const prisma2 = new PrismaClient({
            datasources: {
                db: {
                    url: process.env.DATABASE_URL
                }
            }
        });
        await prisma2.$connect();
        const count2 = await prisma2.user.count();
        console.log('✅ Explicit datasource works! User count:', count2);
        await prisma2.$disconnect();
    } catch (error) {
        console.log('❌ Explicit datasource failed:', error.message);
    }

    // Configuration 3: With connection timeout
    try {
        console.log('\n3️⃣ Testing Prisma Client with custom timeout...');
        const prisma3 = new PrismaClient({
            datasources: {
                db: {
                    url: process.env.DATABASE_URL
                }
            },
            __internal: {
                engine: {
                    requestTimeout: 10000
                }
            }
        });
        await prisma3.$connect();
        const count3 = await prisma3.user.count();
        console.log('✅ Custom timeout works! User count:', count3);
        await prisma3.$disconnect();
    } catch (error) {
        console.log('❌ Custom timeout failed:', error.message);
    }

    // Configuration 4: Check connection pooling
    try {
        console.log('\n4️⃣ Testing connection with URL parameters...');
        const urlWithParams = process.env.DATABASE_URL + '?pgbouncer=true&connection_limit=5&pool_timeout=10';
        const prisma4 = new PrismaClient({
            datasources: {
                db: {
                    url: urlWithParams
                }
            }
        });
        await prisma4.$connect();
        const count4 = await prisma4.user.count();
        console.log('✅ URL parameters work! User count:', count4);
        await prisma4.$disconnect();
    } catch (error) {
        console.log('❌ URL parameters failed:', error.message);
    }

    console.log('\n🏁 Configuration testing complete!');
}

comparePrismaConfigurations();