const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkUserStatuses() {
    try {
        console.log('🔍 Checking current user statuses in database...\n');

        const users = await prisma.user.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                isActive: true,
                loginCount: true,
                lastLogin: true,
                createdAt: true
            },
            orderBy: { createdAt: 'desc' }
        });

        console.log('📊 Current User Statuses:');
        console.log('========================');
        
        users.forEach(user => {
            const status = user.isActive ? '🟢 Active' : '🔴 Inactive';
            const loginInfo = user.loginCount ? `${user.loginCount} logins` : 'No logins';
            
            console.log(`${status} | ${user.role.padEnd(8)} | ${user.name || 'No Name'}`);
            console.log(`         Email: ${user.email}`);
            console.log(`         Logins: ${loginInfo}`);
            console.log(`         Created: ${user.createdAt.toLocaleDateString()}`);
            console.log(`         ID: ${user.id}`);
            console.log('         ---');
        });

        console.log(`\n📈 Summary:`);
        console.log(`  Total Users: ${users.length}`);
        console.log(`  Active Users: ${users.filter(u => u.isActive).length}`);
        console.log(`  Inactive Users: ${users.filter(u => !u.isActive).length}`);
        console.log(`  Admins: ${users.filter(u => u.role === 'ADMIN').length}`);
        console.log(`  Trainers: ${users.filter(u => u.role === 'TRAINER').length}`);
        console.log(`  Clients: ${users.filter(u => u.role === 'CLIENT').length}`);

    } catch (error) {
        console.error('❌ Error checking user statuses:', error?.message || error);
    } finally {
        await prisma.$disconnect();
    }
}

checkUserStatuses();