require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');

async function debugUrlEncoding() {
    console.log('🔍 Debugging DATABASE_URL encoding issues...\n');
    
    const originalUrl = process.env.DATABASE_URL;
    console.log('Original URL length:', originalUrl.length);
    console.log('Original URL (first 60 chars):', originalUrl.substring(0, 60) + '...');
    
    // Check URL encoding/decoding
    console.log('\n🔍 URL Encoding Analysis:');
    console.log('Contains %26:', originalUrl.includes('%26')); // &
    console.log('Contains %2B:', originalUrl.includes('%2B')); // +
    console.log('Contains %23:', originalUrl.includes('%23')); // #
    
    // Try URL decoding
    const decodedUrl = decodeURIComponent(originalUrl);
    console.log('\nDecoded URL length:', decodedUrl.length);
    console.log('Decoded URL (first 60 chars):', decodedUrl.substring(0, 60) + '...');
    
    // Test different URL formats
    console.log('\n🧪 Testing different URL formats:');
    
    // Test 1: Original URL
    try {
        console.log('\n1️⃣ Testing original URL...');
        const prisma1 = new PrismaClient({
            datasources: { db: { url: originalUrl } }
        });
        await prisma1.$connect();
        const count1 = await prisma1.user.count();
        console.log('✅ Original URL works! Count:', count1);
        await prisma1.$disconnect();
    } catch (error) {
        console.log('❌ Original URL failed:', error.message);
    }
    
    // Test 2: Decoded URL
    try {
        console.log('\n2️⃣ Testing decoded URL...');
        const prisma2 = new PrismaClient({
            datasources: { db: { url: decodedUrl } }
        });
        await prisma2.$connect();
        const count2 = await prisma2.user.count();
        console.log('✅ Decoded URL works! Count:', count2);
        await prisma2.$disconnect();
    } catch (error) {
        console.log('❌ Decoded URL failed:', error.message);
    }
    
    // Test 3: Manual password replacement
    const manualUrl = originalUrl
        .replace('%26', '&')
        .replace('%2B', '+')  
        .replace('%23', '#');
    
    try {
        console.log('\n3️⃣ Testing manually decoded URL...');
        const prisma3 = new PrismaClient({
            datasources: { db: { url: manualUrl } }
        });
        await prisma3.$connect();
        const count3 = await prisma3.user.count();
        console.log('✅ Manual URL works! Count:', count3);
        await prisma3.$disconnect();
    } catch (error) {
        console.log('❌ Manual URL failed:', error.message);
    }
}

debugUrlEncoding();