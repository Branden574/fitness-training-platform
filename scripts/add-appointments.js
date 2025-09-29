const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addAppointments() {
  try {
    console.log('🔄 Adding appointments to Brent\'s schedule...');
    
    // Get Brent and all his clients
    const brent = await prisma.user.findUnique({
      where: { email: 'trainer@demo.com' },
      include: { clients: true }
    });
    
    if (!brent || !brent.clients.length) {
      console.error('❌ Brent or clients not found');
      return;
    }
    
    console.log(`✅ Found Brent with ${brent.clients.length} clients`);
    
    const allClients = brent.clients;
    const today = new Date();
    
    // Create upcoming appointments for the next 2 weeks
    let appointmentCount = 0;
    
    for (let i = 1; i <= 14; i++) {
      const appointmentDate = new Date(today);
      appointmentDate.setDate(today.getDate() + i);
      
      // Skip weekends
      if (appointmentDate.getDay() === 0 || appointmentDate.getDay() === 6) continue;
      
      // Create 2-3 appointments per day
      const numAppointments = Math.min(Math.floor(Math.random() * 2) + 2, allClients.length);
      
      for (let j = 0; j < numAppointments; j++) {
        const client = allClients[j % allClients.length];
        const hour = 8 + j * 2; // Start at 8 AM, spread throughout the day
        
        const startTime = new Date(appointmentDate);
        startTime.setHours(hour, 0, 0, 0);
        
        const endTime = new Date(startTime);
        endTime.setHours(hour + 1, 0, 0, 0); // 1 hour sessions
        
        await prisma.appointment.create({
          data: {
            clientId: client.id,
            trainerId: brent.id,
            title: `Training Session - ${client.name}`,
            type: 'TRAINING_SESSION',
            status: Math.random() > 0.85 ? 'CANCELLED' : 'APPROVED',
            startTime: startTime,
            endTime: endTime,
            duration: 60,
            notes: `Personal training session with ${client.name}`,
          },
        });
        
        appointmentCount++;
      }
    }
    
    // Create some past appointments
    let pastAppointmentCount = 0;
    for (let i = 1; i <= 21; i++) { // Past 3 weeks
      const pastDate = new Date(today);
      pastDate.setDate(today.getDate() - i);
      
      if (pastDate.getDay() === 0 || pastDate.getDay() === 6) continue;
      
      const numAppointments = Math.min(Math.floor(Math.random() * 2) + 1, allClients.length);
      
      for (let j = 0; j < numAppointments; j++) {
        const client = allClients[j % allClients.length];
        const hour = 8 + j * 2;
        
        const startTime = new Date(pastDate);
        startTime.setHours(hour, 0, 0, 0);
        
        const endTime = new Date(startTime);
        endTime.setHours(hour + 1, 0, 0, 0);
        
        await prisma.appointment.create({
          data: {
            clientId: client.id,
            trainerId: brent.id,
            title: `Training Session - ${client.name}`,
            type: 'TRAINING_SESSION',
            status: Math.random() > 0.95 ? 'CANCELLED' : 'COMPLETED',
            startTime: startTime,
            endTime: endTime,
            duration: 60,
            notes: `Personal training session with ${client.name}`,
          },
        });
        
        pastAppointmentCount++;
      }
    }
    
    console.log(`\n🎉 Successfully added appointments!`);
    console.log(`📅 Created:`);
    console.log(`   - ${appointmentCount} upcoming appointments`);
    console.log(`   - ${pastAppointmentCount} past appointments`);
    console.log(`   - Total: ${appointmentCount + pastAppointmentCount} appointments`);
    
    console.log(`\n👥 Brent now has ${allClients.length} clients:`);
    allClients.forEach(client => {
      console.log(`   - ${client.name} (${client.email})`);
    });
    
  } catch (error) {
    console.error('❌ Error adding appointments:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addAppointments();