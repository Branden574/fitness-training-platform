const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addClientsToBrent() {
  try {
    console.log('🔄 Adding multiple clients to Brent\'s trainer profile...');
    
    // Get Brent's trainer account
    const brent = await prisma.user.findUnique({
      where: { email: 'trainer@demo.com' }
    });
    
    if (!brent) {
      console.error('❌ Brent not found in database');
      return;
    }
    
    console.log(`✅ Found Brent: ${brent.name} (${brent.id})`);
    
    // Create additional realistic clients (keeping the existing John Doe)
    const clientsData = [
      {
        name: 'Sarah Johnson',
        email: 'sarah.johnson@email.com',
        age: 32,
        height: 165,
        weight: 68,
        fitnessLevel: 'INTERMEDIATE',
        goals: ['Weight Loss', 'Muscle Toning', 'Improved Endurance']
      },
      {
        name: 'Mike Chen',
        email: 'mike.chen@email.com', 
        age: 28,
        height: 180,
        weight: 85,
        fitnessLevel: 'BEGINNER',
        goals: ['Muscle Building', 'Strength Training']
      },
      {
        name: 'Emily Rodriguez',
        email: 'emily.rodriguez@email.com',
        age: 26,
        height: 170,
        weight: 62,
        fitnessLevel: 'ADVANCED',
        goals: ['Competition Prep', 'Muscle Building', 'Performance']
      },
      {
        name: 'David Thompson',
        email: 'david.thompson@email.com',
        age: 45,
        height: 175,
        weight: 92,
        fitnessLevel: 'BEGINNER',
        goals: ['Weight Loss', 'Health Improvement', 'Stress Relief']
      },
      {
        name: 'Lisa Park',
        email: 'lisa.park@email.com',
        age: 35,
        height: 160,
        weight: 58,
        fitnessLevel: 'INTERMEDIATE',
        goals: ['Strength Training', 'Flexibility', 'Injury Prevention']
      }
    ];
    
    // Create additional clients
    const clients = [];
    for (const clientData of clientsData) {
      const client = await prisma.user.create({
        data: {
          name: clientData.name,
          email: clientData.email,
          role: 'CLIENT',
          trainerId: brent.id,
        },
      });
      
      // Create client profile
      await prisma.clientProfile.create({
        data: {
          userId: client.id,
          age: clientData.age,
          height: clientData.height,
          weight: clientData.weight,
          fitnessLevel: clientData.fitnessLevel,
          fitnessGoals: JSON.stringify(clientData.goals),
          medicalConditions: JSON.stringify([]),
          preferences: JSON.stringify(['Morning Workouts', 'Strength Training']),
        },
      });
      
      clients.push(client);
      console.log(`✅ Created client: ${client.name}`);
    }
    
    // Get all clients including the existing John Doe
    const allClients = await prisma.user.findMany({
      where: { trainerId: brent.id }
    });
    
    // Create upcoming appointments for the next 2 weeks
    let appointmentCount = 0;
    const today = new Date();
    
    // Generate appointments for the next 14 days
    for (let i = 1; i <= 14; i++) {
      const appointmentDate = new Date(today);
      appointmentDate.setDate(today.getDate() + i);
      
      // Skip weekends for some variety
      if (appointmentDate.getDay() === 0 || appointmentDate.getDay() === 6) continue;
      
      // Create 2-3 appointments per day
      const numAppointments = Math.floor(Math.random() * 2) + 2;
      
      for (let j = 0; j < numAppointments && j < allClients.length; j++) {
        const client = allClients[j % allClients.length];
        const hour = 8 + j * 2; // Start at 8 AM, spread throughout the day
        
        const appointmentTime = new Date(appointmentDate);
        appointmentTime.setHours(hour, 0, 0, 0);
        
        await prisma.appointment.create({
          data: {
            clientId: client.id,
            trainerId: brent.id,
            title: `Training Session - ${client.name}`,
            type: 'TRAINING',
            status: Math.random() > 0.85 ? 'CANCELLED' : 'CONFIRMED',
            startTime: appointmentTime,
            endTime: new Date(appointmentTime.getTime() + 60 * 60 * 1000), // +1 hour
            duration: 60,
            notes: `Training session with ${client.name}`,
          },
        });
        
        appointmentCount++;
      }
    }
    
    // Create some past appointments for history
    let pastAppointmentCount = 0;
    for (let i = 1; i <= 21; i++) { // Past 3 weeks
      const pastDate = new Date(today);
      pastDate.setDate(today.getDate() - i);
      
      if (pastDate.getDay() === 0 || pastDate.getDay() === 6) continue;
      
      // 2-3 appointments per day in the past
      const numAppointments = Math.floor(Math.random() * 2) + 2;
      
      for (let j = 0; j < numAppointments && j < allClients.length; j++) {
        const client = allClients[j % allClients.length];
        const hour = 8 + j * 2;
        
        const appointmentTime = new Date(pastDate);
        appointmentTime.setHours(hour, 0, 0, 0);
        
        await prisma.appointment.create({
          data: {
            clientId: client.id,
            trainerId: brent.id,
            title: `Training Session - ${client.name}`,
            type: 'TRAINING',
            status: Math.random() > 0.95 ? 'CANCELLED' : 'COMPLETED',
            startTime: appointmentTime,
            endTime: new Date(appointmentTime.getTime() + 60 * 60 * 1000), // +1 hour
            duration: 60,
            notes: `Training session with ${client.name}`,
          },
        });
        
        pastAppointmentCount++;
      }
    }
    
    // Create progress entries for all clients
    let progressCount = 0;
    for (const client of allClients) {
      // Create progress entries over the last 4 weeks
      for (let week = 4; week >= 0; week--) {
        const progressDate = new Date(today);
        progressDate.setDate(today.getDate() - (week * 7));
        
        await prisma.progressEntry.create({
          data: {
            userId: client.id,
            date: progressDate,
            weight: Math.round((Math.random() * 20 + 60) * 10) / 10, // 60-80 kg range
            bodyFat: Math.round((Math.random() * 10 + 15) * 10) / 10, // 15-25% range
            mood: Math.floor(Math.random() * 4) + 6, // 6-10 range
            energy: Math.floor(Math.random() * 4) + 6, // 6-10 range  
            sleep: Math.round((Math.random() * 3 + 6) * 10) / 10, // 6-9 hours
            notes: week === 0 ? 'Latest progress check-in' : `Week ${4-week} progress`,
          },
        });
        
        progressCount++;
      }
    }
    
    // Create meal plans for all clients
    let mealPlanCount = 0;
    for (const client of allClients) {
      await prisma.mealPlan.create({
        data: {
          name: `${client.name}'s Nutrition Plan`,
          description: 'Personalized nutrition plan for optimal results',
          userId: client.id,
          trainerId: brent.id,
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          dailyCalorieTarget: Math.floor(Math.random() * 500) + 1500, // 1500-2000 cal
          dailyProteinTarget: Math.floor(Math.random() * 50) + 100, // 100-150g
          dailyCarbTarget: Math.floor(Math.random() * 100) + 150, // 150-250g
          dailyFatTarget: Math.floor(Math.random() * 30) + 50, // 50-80g
        },
      });
      mealPlanCount++;
    }
    
    console.log(`\n🎉 Successfully enhanced Brent's trainer profile!`);
    console.log(`📊 Created:`);
    console.log(`   - ${clients.length} new clients (+ existing John Doe = ${allClients.length} total)`);
    console.log(`   - ${appointmentCount} upcoming appointments`);
    console.log(`   - ${pastAppointmentCount} past appointments`);
    console.log(`   - ${progressCount} progress entries`);
    console.log(`   - ${mealPlanCount} meal plans`);
    console.log('\n👥 All Clients:');
    allClients.forEach(client => {
      console.log(`   - ${client.name} (${client.email})`);
    });
    
    console.log(`\n🔑 Login credentials:`);
    console.log(`   Trainer: trainer@demo.com / demo123`);
    console.log(`   Sample Client: client@demo.com / demo123 (John Doe)`);
    
  } catch (error) {
    console.error('❌ Error enhancing profile:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addClientsToBrent();