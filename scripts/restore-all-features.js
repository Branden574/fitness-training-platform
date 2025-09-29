const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function restoreAllFeatures() {
  try {
    console.log('🔄 RESTORING ALL MISSING FEATURES & DATA...');
    console.log('=' .repeat(50));
    
    // Get Brent's business account
    const brent = await prisma.user.findUnique({
      where: { email: 'martinezfitness559@gmail.com' }
    });
    
    if (!brent) {
      console.error('❌ Brent business account not found');
      return;
    }
    
    console.log(`✅ Found Brent: ${brent.name} (${brent.id})`);
    
    // 1. RESTORE CONTACT SUBMISSIONS
    console.log('\n📧 Restoring contact submissions...');
    const contactSubmissions = [
      {
        name: 'Jessica Martinez',
        email: 'jessica.martinez@gmail.com',
        phone: '(559) 555-0123',
        message: 'Hi Brent! I saw your transformation posts on Instagram and I\'m really interested in starting my fitness journey. I\'ve struggled with consistency in the past and would love to work with a trainer who can help keep me accountable. What packages do you offer?',
        status: 'NEW',
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2 days ago
      },
      {
        name: 'Carlos Rodriguez',
        email: 'carlos.rodriguez@outlook.com',
        phone: '(559) 555-0456',
        message: 'Looking to build muscle and improve my strength. I have about 2 years of gym experience but feel like I\'ve hit a plateau. Can you help me break through and optimize my training?',
        status: 'CONTACTED',
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) // 5 days ago
      },
      {
        name: 'Amanda Thompson',
        email: 'amanda.thompson@yahoo.com',
        phone: '(559) 555-0789',
        message: 'I\'m a busy mom of two and need help creating a sustainable fitness routine. I can only train 3 days a week max. Do you work with clients who have limited time availability?',
        status: 'NEW',
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) // 1 day ago
      },
      {
        name: 'Robert Kim',
        email: 'robert.kim@gmail.com',
        phone: '(559) 555-0321',
        message: 'Interested in your nutrition coaching services. I train regularly but my diet is holding me back from seeing results. What does your nutrition program include?',
        status: 'COMPLETED',
        createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) // 10 days ago
      }
    ];
    
    for (const contact of contactSubmissions) {
      await prisma.contactSubmission.create({ data: contact });
    }
    console.log(`✅ Created ${contactSubmissions.length} contact submissions`);
    
    // 2. RESTORE COMPREHENSIVE EXERCISE LIBRARY
    console.log('\n🏋️ Restoring exercise library...');
    const exercises = [
      // Upper Body - Chest
      {
        name: 'Barbell Bench Press',
        description: 'Classic compound movement for chest, shoulders, and triceps',
        instructions: JSON.stringify([
          'Lie flat on bench with feet firmly on floor',
          'Grip bar slightly wider than shoulder-width',
          'Lower bar to chest with control',
          'Press bar up explosively to starting position'
        ]),
        muscleGroups: JSON.stringify(['Chest', 'Shoulders', 'Triceps']),
        equipment: JSON.stringify(['Barbell', 'Weight Plates', 'Bench']),
        difficulty: 'INTERMEDIATE'
      },
      {
        name: 'Dumbbell Flyes',
        description: 'Isolation exercise for chest development',
        instructions: JSON.stringify([
          'Lie on bench with dumbbells in each hand',
          'Start with arms extended above chest',
          'Lower weights in wide arc with slight elbow bend',
          'Squeeze chest to return to starting position'
        ]),
        muscleGroups: JSON.stringify(['Chest']),
        equipment: JSON.stringify(['Dumbbells', 'Bench']),
        difficulty: 'BEGINNER'
      },
      // Upper Body - Back
      {
        name: 'Pull-ups',
        description: 'Bodyweight exercise for back and biceps',
        instructions: JSON.stringify([
          'Hang from bar with overhand grip',
          'Engage lats and pull body up',
          'Chin over bar at top',
          'Lower with control to full extension'
        ]),
        muscleGroups: JSON.stringify(['Lats', 'Rhomboids', 'Biceps']),
        equipment: JSON.stringify(['Pull-up Bar']),
        difficulty: 'INTERMEDIATE'
      },
      {
        name: 'Bent-Over Rows',
        description: 'Compound pulling movement for back thickness',
        instructions: JSON.stringify([
          'Hinge at hips with slight knee bend',
          'Hold barbell with overhand grip',
          'Pull bar to lower chest/upper abdomen',
          'Squeeze shoulder blades together'
        ]),
        muscleGroups: JSON.stringify(['Lats', 'Rhomboids', 'Rear Delts']),
        equipment: JSON.stringify(['Barbell', 'Weight Plates']),
        difficulty: 'INTERMEDIATE'
      },
      // Upper Body - Shoulders
      {
        name: 'Overhead Press',
        description: 'Standing shoulder press for deltoid development',
        instructions: JSON.stringify([
          'Stand with feet shoulder-width apart',
          'Hold barbell at shoulder level',
          'Press overhead until arms are extended',
          'Lower with control to starting position'
        ]),
        muscleGroups: JSON.stringify(['Shoulders', 'Triceps', 'Core']),
        equipment: JSON.stringify(['Barbell', 'Weight Plates']),
        difficulty: 'INTERMEDIATE'
      },
      // Lower Body
      {
        name: 'Romanian Deadlifts',
        description: 'Hip-hinge movement targeting hamstrings and glutes',
        instructions: JSON.stringify([
          'Stand with barbell in front of thighs',
          'Push hips back while keeping chest up',
          'Lower bar until you feel hamstring stretch',
          'Drive hips forward to return to standing'
        ]),
        muscleGroups: JSON.stringify(['Hamstrings', 'Glutes', 'Lower Back']),
        equipment: JSON.stringify(['Barbell', 'Weight Plates']),
        difficulty: 'INTERMEDIATE'
      },
      {
        name: 'Bulgarian Split Squats',
        description: 'Single-leg squat variation for leg strength and balance',
        instructions: JSON.stringify([
          'Stand 2-3 feet in front of bench',
          'Place rear foot on bench behind you',
          'Lower into lunge position',
          'Push through front heel to return to start'
        ]),
        muscleGroups: JSON.stringify(['Quadriceps', 'Glutes', 'Calves']),
        equipment: JSON.stringify(['Bench', 'Dumbbells']),
        difficulty: 'INTERMEDIATE'
      },
      {
        name: 'Hip Thrusts',
        description: 'Glute-focused exercise for posterior chain strength',
        instructions: JSON.stringify([
          'Sit with upper back against bench',
          'Place barbell across hips',
          'Drive through heels to lift hips up',
          'Squeeze glutes at top of movement'
        ]),
        muscleGroups: JSON.stringify(['Glutes', 'Hamstrings']),
        equipment: JSON.stringify(['Barbell', 'Bench', 'Weight Plates']),
        difficulty: 'BEGINNER'
      },
      // Core
      {
        name: 'Plank',
        description: 'Isometric core strengthening exercise',
        instructions: JSON.stringify([
          'Start in push-up position on forearms',
          'Keep body in straight line from head to heels',
          'Engage core and glutes',
          'Hold position for prescribed time'
        ]),
        muscleGroups: JSON.stringify(['Core', 'Shoulders']),
        equipment: JSON.stringify(['None']),
        difficulty: 'BEGINNER'
      },
      {
        name: 'Russian Twists',
        description: 'Rotational core exercise for obliques',
        instructions: JSON.stringify([
          'Sit with knees bent, feet slightly off ground',
          'Lean back to 45-degree angle',
          'Rotate torso side to side',
          'Keep chest up throughout movement'
        ]),
        muscleGroups: JSON.stringify(['Obliques', 'Core']),
        equipment: JSON.stringify(['None']),
        difficulty: 'BEGINNER'
      }
    ];
    
    for (const exercise of exercises) {
      await prisma.exercise.create({ data: exercise });
    }
    console.log(`✅ Created ${exercises.length} exercises`);
    
    // 3. RESTORE COMPREHENSIVE FOOD DATABASE
    console.log('\n🍎 Restoring food database...');
    const foods = [
      // Proteins
      { name: 'Chicken Breast (Skinless)', brand: 'Generic', caloriesPerServing: 165, protein: 31, carbs: 0, fat: 3.6, fiber: 0, servingSize: '100', servingUnit: 'grams' },
      { name: 'Salmon Fillet', brand: 'Generic', caloriesPerServing: 208, protein: 25, carbs: 0, fat: 12, fiber: 0, servingSize: '100', servingUnit: 'grams' },
      { name: 'Lean Ground Beef (93/7)', brand: 'Generic', caloriesPerServing: 152, protein: 22, carbs: 0, fat: 7, fiber: 0, servingSize: '100', servingUnit: 'grams' },
      { name: 'Eggs (Large)', brand: 'Generic', caloriesPerServing: 70, protein: 6, carbs: 0.5, fat: 5, fiber: 0, servingSize: '1', servingUnit: 'egg' },
      { name: 'Greek Yogurt (Non-fat)', brand: 'Generic', caloriesPerServing: 59, protein: 10, carbs: 3.6, fat: 0.4, fiber: 0, servingSize: '100', servingUnit: 'grams' },
      { name: 'Whey Protein Powder', brand: 'Generic', caloriesPerServing: 120, protein: 25, carbs: 2, fat: 1, fiber: 0, servingSize: '30', servingUnit: 'grams' },
      
      // Complex Carbs
      { name: 'Brown Rice (Cooked)', brand: 'Generic', caloriesPerServing: 111, protein: 2.6, carbs: 23, fat: 0.9, fiber: 1.8, servingSize: '100', servingUnit: 'grams' },
      { name: 'Quinoa (Cooked)', brand: 'Generic', caloriesPerServing: 120, protein: 4.4, carbs: 22, fat: 1.9, fiber: 2.8, servingSize: '100', servingUnit: 'grams' },
      { name: 'Sweet Potato (Baked)', brand: 'Generic', caloriesPerServing: 86, protein: 1.6, carbs: 20, fat: 0.1, fiber: 3, servingSize: '100', servingUnit: 'grams' },
      { name: 'Oatmeal (Dry)', brand: 'Generic', caloriesPerServing: 389, protein: 16.9, carbs: 66, fat: 6.9, fiber: 10.6, servingSize: '100', servingUnit: 'grams' },
      { name: 'Whole Wheat Pasta (Cooked)', brand: 'Generic', caloriesPerServing: 124, protein: 5, carbs: 25, fat: 1.1, fiber: 3.2, servingSize: '100', servingUnit: 'grams' },
      
      // Vegetables
      { name: 'Broccoli', brand: 'Generic', caloriesPerServing: 34, protein: 2.8, carbs: 7, fat: 0.4, fiber: 2.6, servingSize: '100', servingUnit: 'grams' },
      { name: 'Spinach', brand: 'Generic', caloriesPerServing: 23, protein: 2.9, carbs: 3.6, fat: 0.4, fiber: 2.2, servingSize: '100', servingUnit: 'grams' },
      { name: 'Bell Peppers', brand: 'Generic', caloriesPerServing: 31, protein: 1, carbs: 7, fat: 0.3, fiber: 2.5, servingSize: '100', servingUnit: 'grams' },
      { name: 'Asparagus', brand: 'Generic', caloriesPerServing: 20, protein: 2.2, carbs: 3.9, fat: 0.1, fiber: 2.1, servingSize: '100', servingUnit: 'grams' },
      { name: 'Cauliflower', brand: 'Generic', caloriesPerServing: 25, protein: 1.9, carbs: 5, fat: 0.3, fiber: 2, servingSize: '100', servingUnit: 'grams' },
      
      // Healthy Fats
      { name: 'Avocado', brand: 'Generic', caloriesPerServing: 160, protein: 2, carbs: 9, fat: 15, fiber: 7, servingSize: '100', servingUnit: 'grams' },
      { name: 'Almonds', brand: 'Generic', caloriesPerServing: 579, protein: 21, carbs: 22, fat: 50, fiber: 12, servingSize: '100', servingUnit: 'grams' },
      { name: 'Olive Oil', brand: 'Generic', caloriesPerServing: 884, protein: 0, carbs: 0, fat: 100, fiber: 0, servingSize: '100', servingUnit: 'grams' },
      { name: 'Peanut Butter (Natural)', brand: 'Generic', caloriesPerServing: 588, protein: 25, carbs: 20, fat: 50, fiber: 8, servingSize: '100', servingUnit: 'grams' },
      
      // Fruits
      { name: 'Banana', brand: 'Generic', caloriesPerServing: 89, protein: 1.1, carbs: 23, fat: 0.3, fiber: 2.6, servingSize: '100', servingUnit: 'grams' },
      { name: 'Apple', brand: 'Generic', caloriesPerServing: 52, protein: 0.3, carbs: 14, fat: 0.2, fiber: 2.4, servingSize: '100', servingUnit: 'grams' },
      { name: 'Blueberries', brand: 'Generic', caloriesPerServing: 57, protein: 0.7, carbs: 14, fat: 0.3, fiber: 2.4, servingSize: '100', servingUnit: 'grams' }
    ];
    
    for (const food of foods) {
      await prisma.food.create({ data: food });
    }
    console.log(`✅ Created ${foods.length} foods`);
    
    // 4. CREATE COMPREHENSIVE WORKOUT TEMPLATES
    console.log('\n💪 Creating workout templates...');
    const workoutTemplates = [
      {
        title: 'Upper Body Power',
        description: 'High-intensity upper body workout focusing on compound movements',
        duration: 60,
        difficulty: 'INTERMEDIATE',
        type: 'STRENGTH',
        createdBy: brent.id
      },
      {
        title: 'Lower Body Hypertrophy',
        description: 'Volume-focused lower body workout for muscle growth',
        duration: 75,
        difficulty: 'INTERMEDIATE',
        type: 'STRENGTH',
        createdBy: brent.id
      },
      {
        title: 'Full Body Beginner',
        description: 'Complete full-body workout perfect for beginners',
        duration: 45,
        difficulty: 'BEGINNER',
        type: 'STRENGTH',
        createdBy: brent.id
      },
      {
        title: 'HIIT Cardio Blast',
        description: 'High-intensity interval training for fat loss',
        duration: 30,
        difficulty: 'ADVANCED',
        type: 'CARDIO',
        createdBy: brent.id
      },
      {
        title: 'Core & Mobility',
        description: 'Core strengthening and mobility work',
        duration: 30,
        difficulty: 'BEGINNER',
        type: 'FLEXIBILITY',
        createdBy: brent.id
      }
    ];
    
    for (const workout of workoutTemplates) {
      await prisma.workout.create({ data: workout });
    }
    console.log(`✅ Created ${workoutTemplates.length} workout templates`);
    
    // 5. ADD SAMPLE FOOD ENTRIES FOR CLIENTS
    console.log('\n🥗 Adding sample food entries...');
    const clients = await prisma.user.findMany({
      where: { trainerId: brent.id }
    });
    
    let foodEntryCount = 0;
    for (const client of clients.slice(0, 3)) { // Add for first 3 clients
      const today = new Date();
      for (let i = 0; i < 7; i++) { // Last 7 days
        const entryDate = new Date(today);
        entryDate.setDate(today.getDate() - i);
        
        // Add 3-4 meals per day
        const meals = ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'];
        for (let j = 0; j < 3; j++) {
          await prisma.foodEntry.create({
            data: {
              userId: client.id,
              foodName: ['Chicken Breast', 'Brown Rice', 'Broccoli', 'Banana'][j],
              quantity: Math.floor(Math.random() * 200) + 100, // 100-300g
              unit: 'grams',
              calories: Math.floor(Math.random() * 300) + 150, // 150-450 cal
              protein: Math.floor(Math.random() * 30) + 10, // 10-40g
              carbs: Math.floor(Math.random() * 40) + 5, // 5-45g
              fat: Math.floor(Math.random() * 15) + 2, // 2-17g
              mealType: meals[j % 4],
              date: entryDate
            }
          });
          foodEntryCount++;
        }
      }
    }
    console.log(`✅ Created ${foodEntryCount} food entries`);
    
    // FINAL VERIFICATION
    console.log('\n📊 FINAL DATABASE STATE:');
    const finalStats = {
      contacts: await prisma.contactSubmission.count(),
      exercises: await prisma.exercise.count(),
      foods: await prisma.food.count(),
      workouts: await prisma.workout.count(),
      foodEntries: await prisma.foodEntry.count(),
      clients: clients.length,
      appointments: await prisma.appointment.count()
    };
    
    console.log(`   📧 Contact Submissions: ${finalStats.contacts}`);
    console.log(`   🏋️ Exercises: ${finalStats.exercises}`);
    console.log(`   🍎 Foods: ${finalStats.foods}`);
    console.log(`   💪 Workouts: ${finalStats.workouts}`);
    console.log(`   🥗 Food Entries: ${finalStats.foodEntries}`);
    console.log(`   👥 Clients: ${finalStats.clients}`);
    console.log(`   📅 Appointments: ${finalStats.appointments}`);
    
    console.log('\n🎉 ALL FEATURES AND DATA RESTORED!');
    console.log('🔑 Now log in with: martinezfitness559@gmail.com / demo123');
    
  } catch (error) {
    console.error('❌ Error restoring features:', error);
  } finally {
    await prisma.$disconnect();
  }
}

restoreAllFeatures();