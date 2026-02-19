const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugTrainerAssignments() {
    try {
        console.log('🔍 Checking trainer assignments...\n');

        // Find all trainers
        const trainers = await prisma.user.findMany({
            where: { role: 'TRAINER' },
            select: {
                id: true,
                name: true,
                email: true,
                isActive: true
            }
        });

        console.log('📋 Available Trainers:');
        trainers.forEach(trainer => {
            console.log(`  - ${trainer.name} (${trainer.email}) - ${trainer.isActive ? 'Active' : 'Inactive'} - ID: ${trainer.id}`);
        });

        console.log('\n👥 Client-Trainer Assignments:');
        
        // Find all clients with their trainer assignments
        const clients = await prisma.user.findMany({
            where: { role: 'CLIENT' },
            select: {
                id: true,
                name: true,
                email: true,
                trainerId: true,
                isActive: true,
                assignedTrainer: {
                    select: {
                        name: true,
                        email: true
                    }
                }
            }
        });

        clients.forEach(client => {
            const trainerInfo = client.assignedTrainer 
                ? `${client.assignedTrainer.name} (${client.assignedTrainer.email})`
                : 'No trainer assigned';
            
            console.log(`  - ${client.name} (${client.email}) - ${client.isActive ? 'Active' : 'Inactive'}`);
            console.log(`    Trainer: ${trainerInfo}`);
            console.log(`    Trainer ID: ${client.trainerId || 'None'}\n`);
        });

        // Check for specific trainer
        const brent = trainers.find(t => t.email.includes('brent') || t.name.toLowerCase().includes('brent'));
        if (brent) {
            console.log(`\n🎯 Brent's Clients:`);
            const brentsClients = clients.filter(c => c.trainerId === brent.id);
            
            if (brentsClients.length > 0) {
                brentsClients.forEach(client => {
                    console.log(`  - ${client.name} (${client.email}) - ${client.isActive ? 'Active' : 'Inactive'}`);
                });
            } else {
                console.log('  No clients assigned to Brent');
            }
        }

        console.log(`\n📊 Summary:`);
        console.log(`  Total Trainers: ${trainers.length}`);
        console.log(`  Active Trainers: ${trainers.filter(t => t.isActive).length}`);
        console.log(`  Total Clients: ${clients.length}`);
        console.log(`  Active Clients: ${clients.filter(c => c.isActive).length}`);
        console.log(`  Clients with Trainers: ${clients.filter(c => c.trainerId).length}`);

    } catch (error) {
        console.error('❌ Error debugging trainer assignments:', error);
    } finally {
        await prisma.$disconnect();
    }
}

debugTrainerAssignments();