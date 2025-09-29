const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function restoreBrentProfile() {
  try {
    console.log('🔄 Restoring Brent\'s complete trainer profile with clients...');
    
    // Get Brent's trainer account
    const brent = await prisma.user.findUnique({
      where: { email: 'trainer@demo.com' }
    });
    
    if (!brent) {
      console.error('❌ Brent not found in database');
      return;
    }
    
    console.log(`✅ Found Brent: ${brent.name} (${brent.id})`);
    
    // Create multiple realistic clients
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
    
    // Create clients
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
    
    // Create upcoming appointments for the next 2 weeks
    const appointments = [];
    const today = new Date();
    
    // Generate appointments for multiple clients
    for (let i = 0; i < 14; i++) {
      const appointmentDate = new Date(today);
      appointmentDate.setDate(today.getDate() + i);
      
      // Skip weekends for some variety
      if (appointmentDate.getDay() === 0 || appointmentDate.getDay() === 6) continue;
      
      // Create 2-3 appointments per day
      const numAppointments = Math.floor(Math.random() * 2) + 2;
      
      for (let j = 0; j < numAppointments; j++) {
        const client = clients[Math.floor(Math.random() * clients.length)];
        const hour = 9 + j * 2; // Spread throughout the day
        
        const appointmentTime = new Date(appointmentDate);
        appointmentTime.setHours(hour, 0, 0, 0);
        
        const appointment = await prisma.appointment.create({
          data: {
            clientId: client.id,
            trainerId: brent.id,
            dateTime: appointmentTime,
            duration: 60,
            type: 'TRAINING',
            status: Math.random() > 0.8 ? 'CANCELLED' : 'CONFIRMED', // 20% cancelled
            notes: `Training session with ${client.name}`,
          },
        });
        
        appointments.push(appointment);
      }
    }
    
    // Create some past appointments for history
    for (let i = 1; i <= 30; i++) {
      const pastDate = new Date(today);
      pastDate.setDate(today.getDate() - i);
      
      if (pastDate.getDay() === 0 || pastDate.getDay() === 6) continue;
      
      const client = clients[Math.floor(Math.random() * clients.length)];
      const hour = 9 + Math.floor(Math.random() * 8); // 9 AM to 5 PM
      
      const appointmentTime = new Date(pastDate);
      appointmentTime.setHours(hour, 0, 0, 0);
      
      await prisma.appointment.create({
        data: {
          clientId: client.id,
          trainerId: brent.id,
          dateTime: appointmentTime,
          duration: 60,
          type: 'TRAINING',
          status: Math.random() > 0.9 ? 'CANCELLED' : 'COMPLETED', // 10% cancelled in past
          notes: `Training session with ${client.name}`,
        },
      });
    }
    
    // Create progress entries for clients
    for (const client of clients) {
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
      }
    }
    
    // Create meal plans for clients
    for (const client of clients) {
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
    }
    
    console.log(`\n🎉 Successfully restored Brent's trainer profile!`);
    console.log(`📊 Created:`);
    console.log(`   - ${clients.length} clients`);
    console.log(`   - ${appointments.length} upcoming appointments`);
    console.log(`   - 30+ past appointments`);
    console.log(`   - ${clients.length * 5} progress entries`);
    console.log(`   - ${clients.length} meal plans`);
    console.log('\n👥 Clients:');
    clients.forEach(client => {
      console.log(`   - ${client.name} (${client.email})`);
    });
    
  } catch (error) {
    console.error('❌ Error restoring profile:', error);
  } finally {
    await prisma.$disconnect();
  }
}

restoreBrentProfile();