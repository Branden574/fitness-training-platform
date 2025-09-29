import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

const prisma = new PrismaClient();

async function addTestProgressData() {
  try {
    console.log('🔍 Finding Branden Vincent-Walker...');
    
    // Find Branden Vincent-Walker's user
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { name: { contains: 'Branden Vincent-Walker' } },
          { email: { contains: 'branden' } }
        ]
      }
    });

    if (!user) {
      console.error('❌ Branden Vincent-Walker not found');
      return;
    }

    console.log('✅ Found user:', user.name, user.email);
    
    // Generate test data for the past 12 months
    const testData = [];
    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - 1); // Start from 1 year ago
    
    // Base values
    let baseWeight = 180;
    let baseBodyFat = 18;
    let baseMuscleMass = 145;
    let baseMood = 7;
    let baseEnergy = 7;
    let baseSleep = 7.5;
    
    // Generate monthly progress data with realistic trends
    for (let month = 0; month < 12; month++) {
      const entryDate = new Date(startDate);
      entryDate.setMonth(startDate.getMonth() + month);
      entryDate.setDate(15); // Middle of each month
      
      // Create realistic progression
      // Weight: slight decrease over time (fat loss)
      const weight = baseWeight - (month * 0.8) + (Math.random() * 4 - 2); // -0.8 lbs/month ± 2 lbs variation
      
      // Body fat: decrease over time
      const bodyFat = Math.max(10, baseBodyFat - (month * 0.7) + (Math.random() * 2 - 1)); // -0.7%/month
      
      // Muscle mass: slight increase
      const muscleMass = baseMuscleMass + (month * 0.5) + (Math.random() * 2 - 1); // +0.5 lbs/month
      
      // Mood and energy: general improvement with variation
      const mood = Math.min(10, Math.max(1, baseMood + (month * 0.2) + (Math.random() * 2 - 1)));
      const energy = Math.min(10, Math.max(1, baseEnergy + (month * 0.15) + (Math.random() * 2 - 1)));
      
      // Sleep: slight improvement
      const sleep = Math.min(10, Math.max(5, baseSleep + (month * 0.05) + (Math.random() * 1 - 0.5)));
      
      testData.push({
        userId: user.id,
        date: entryDate,
        weight: Math.round(weight * 10) / 10, // Round to 1 decimal
        bodyFat: Math.round(bodyFat * 10) / 10,
        muscleMass: Math.round(muscleMass * 10) / 10,
        mood: Math.round(mood),
        energy: Math.round(energy),
        sleep: Math.round(sleep * 10) / 10,
        notes: `Month ${month + 1} progress entry - ${getRandomNote(month)}`
      });
    }
    
    console.log('📊 Generated', testData.length, 'progress entries');
    
    // Delete existing data for this user to avoid conflicts
    await prisma.progressEntry.deleteMany({
      where: { userId: user.id }
    });
    
    console.log('🗑️ Cleared existing progress data');
    
    // Insert test data
    for (const entry of testData) {
      await prisma.progressEntry.create({
        data: entry
      });
    }
    
    console.log('✅ Successfully added test progress data for', user.name);
    console.log('📈 Data summary:');
    console.log('   Weight progression:', testData[0].weight, '→', testData[testData.length - 1].weight, 'lbs');
    console.log('   Body fat progression:', testData[0].bodyFat, '→', testData[testData.length - 1].bodyFat, '%');
    console.log('   Muscle mass progression:', testData[0].muscleMass, '→', testData[testData.length - 1].muscleMass, 'lbs');
    
  } catch (error) {
    console.error('❌ Error adding test data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

function getRandomNote(month) {
  const notes = [
    "Feeling strong and motivated!",
    "Great progress this month",
    "Noticed improved endurance",
    "Hitting new personal records",
    "Feeling more energetic overall",
    "Clothes fitting better",
    "Strength gains are noticeable",
    "Recovery has improved",
    "Sleep quality is better",
    "Overall feeling fantastic",
    "Body composition changing",
    "Most confident I've felt in months!"
  ];
  return notes[month % notes.length];
}

// Run the script
addTestProgressData();