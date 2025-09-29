const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

// PostgreSQL client
const prisma = new PrismaClient();

async function importData() {
  console.log('📥 Importing data to PostgreSQL...');
  
  try {
    // Read exported data
    const data = JSON.parse(fs.readFileSync('exported-data.json', 'utf8'));
    
    console.log('📊 Found data to import:');
    Object.entries(data).forEach(([table, records]) => {
      console.log(`  ${table}: ${records.length} records`);
    });

    // Import Users first (no dependencies)
    console.log('\n👥 Importing users...');
    
    // First pass: Create users without trainerId to avoid foreign key issues
    for (const user of data.users) {
      await prisma.user.upsert({
        where: { id: user.id },
        update: {},
        create: {
          id: user.id,
          name: user.name,
          email: user.email,
          emailVerified: user.emailVerified ? new Date(user.emailVerified) : null,
          password: user.password,
          passwordChangeRequired: user.passwordChangeRequired || false,
          image: user.image,
          role: user.role,
          isActive: true,
          lastLogin: null,
          loginCount: 0,
          adminNotes: null,
          createdAt: new Date(user.createdAt),
          updatedAt: new Date(user.updatedAt)
          // Skip trainerId for now
        }
      });
    }
    
    // Second pass: Update trainer relationships
    for (const user of data.users) {
      if (user.trainerId) {
        await prisma.user.update({
          where: { id: user.id },
          data: { trainerId: user.trainerId }
        });
      }
    }
    console.log(`✅ Imported ${data.users.length} users`);

    // Import Exercises
    console.log('\n💪 Importing exercises...');
    for (const exercise of data.exercises) {
      await prisma.exercise.upsert({
        where: { id: exercise.id },
        update: {},
        create: {
          id: exercise.id,
          name: exercise.name,
          description: exercise.description,
          instructions: exercise.instructions,
          muscleGroups: exercise.muscleGroups,
          equipment: exercise.equipment,
          difficulty: exercise.difficulty,
          imageUrl: exercise.imageUrl,
          videoUrl: exercise.videoUrl,
          createdAt: new Date(exercise.createdAt),
          updatedAt: new Date(exercise.updatedAt)
        }
      });
    }
    console.log(`✅ Imported ${data.exercises.length} exercises`);

    // Import Workouts
    console.log('\n🏋️ Importing workouts...');
    for (const workout of data.workouts) {
      await prisma.workout.upsert({
        where: { id: workout.id },
        update: {},
        create: {
          id: workout.id,
          title: workout.title,
          description: workout.description,
          duration: workout.duration,
          difficulty: workout.difficulty,
          type: workout.type,
          createdBy: workout.createdBy,
          createdAt: new Date(workout.createdAt),
          updatedAt: new Date(workout.updatedAt)
        }
      });
    }
    console.log(`✅ Imported ${data.workouts.length} workouts`);

    // Import Food Entries
    console.log('\n🍎 Importing food entries...');
    for (const entry of data.foodEntries) {
      await prisma.foodEntry.upsert({
        where: { id: entry.id },
        update: {},
        create: {
          id: entry.id,
          userId: entry.userId,
          foodName: entry.foodName,
          quantity: entry.quantity,
          unit: entry.unit,
          calories: entry.calories,
          protein: entry.protein,
          carbs: entry.carbs,
          fat: entry.fat,
          mealType: entry.mealType,
          date: new Date(entry.date),
          notes: entry.notes,
          createdAt: new Date(entry.createdAt),
          updatedAt: new Date(entry.updatedAt),
          foodId: entry.foodId
        }
      });
    }
    console.log(`✅ Imported ${data.foodEntries.length} food entries`);

    // Import Progress Entries
    console.log('\n📈 Importing progress entries...');
    for (const entry of data.progressEntries) {
      await prisma.progressEntry.upsert({
        where: { id: entry.id },
        update: {},
        create: {
          id: entry.id,
          userId: entry.userId,
          date: new Date(entry.date),
          weight: entry.weight,
          bodyFat: entry.bodyFat,
          muscleMass: entry.muscleMass,
          measurements: entry.measurements,
          photos: entry.photos,
          notes: entry.notes,
          mood: entry.mood,
          energy: entry.energy,
          sleep: entry.sleep,
          createdAt: new Date(entry.createdAt)
        }
      });
    }
    console.log(`✅ Imported ${data.progressEntries.length} progress entries`);

    // Import Appointments
    console.log('\n📅 Importing appointments...');
    for (const appointment of data.appointments) {
      await prisma.appointment.upsert({
        where: { id: appointment.id },
        update: {},
        create: {
          id: appointment.id,
          clientId: appointment.clientId,
          trainerId: appointment.trainerId,
          title: appointment.title,
          description: appointment.description,
          type: appointment.type,
          status: appointment.status,
          startTime: new Date(appointment.startTime),
          endTime: new Date(appointment.endTime),
          duration: appointment.duration,
          location: appointment.location,
          notes: appointment.notes,
          cancelReason: appointment.cancelReason,
          adminNotes: null,
          lastModifiedBy: null,
          createdAt: new Date(appointment.createdAt),
          updatedAt: new Date(appointment.updatedAt)
        }
      });
    }
    console.log(`✅ Imported ${data.appointments.length} appointments`);

    // Import Meal Plans
    console.log('\n🥗 Importing meal plans...');
    for (const plan of data.mealPlans) {
      await prisma.mealPlan.upsert({
        where: { id: plan.id },
        update: {},
        create: {
          id: plan.id,
          name: plan.name,
          description: plan.description,
          userId: plan.userId,
          trainerId: plan.trainerId,
          startDate: new Date(plan.startDate),
          endDate: new Date(plan.endDate),
          dailyCalorieTarget: plan.dailyCalorieTarget,
          dailyProteinTarget: plan.dailyProteinTarget,
          dailyCarbTarget: plan.dailyCarbTarget,
          dailyFatTarget: plan.dailyFatTarget,
          createdAt: new Date(plan.createdAt),
          updatedAt: new Date(plan.updatedAt)
        }
      });
    }
    console.log(`✅ Imported ${data.mealPlans.length} meal plans`);

    // Import Notifications
    console.log('\n🔔 Importing notifications...');
    for (const notification of data.notifications) {
      await prisma.notification.upsert({
        where: { id: notification.id },
        update: {},
        create: {
          id: notification.id,
          userId: notification.userId,
          title: notification.title,
          message: notification.message,
          type: notification.type,
          read: notification.read,
          actionUrl: notification.actionUrl,
          appointmentId: notification.appointmentId,
          createdAt: new Date(notification.createdAt)
        }
      });
    }
    console.log(`✅ Imported ${data.notifications.length} notifications`);

    // Import Contact Submissions
    console.log('\n📞 Importing contact submissions...');
    for (const contact of data.contactSubmissions) {
      await prisma.contactSubmission.upsert({
        where: { id: contact.id },
        update: {},
        create: {
          id: contact.id,
          name: contact.name,
          email: contact.email,
          phone: contact.phone,
          message: contact.message,
          age: contact.age,
          fitnessLevel: contact.fitnessLevel,
          fitnessGoals: contact.fitnessGoals,
          currentActivity: contact.currentActivity,
          injuries: contact.injuries,
          availability: contact.availability,
          status: contact.status,
          createdAt: new Date(contact.createdAt),
          updatedAt: new Date(contact.updatedAt)
        }
      });
    }
    console.log(`✅ Imported ${data.contactSubmissions.length} contact submissions`);

    // Import Invitations
    console.log('\n✉️ Importing invitations...');
    for (const invitation of data.invitations) {
      await prisma.invitation.upsert({
        where: { id: invitation.id },
        update: {},
        create: {
          id: invitation.id,
          email: invitation.email,
          phone: invitation.phone,
          code: invitation.code,
          invitedBy: invitation.invitedBy,
          status: invitation.status,
          expiresAt: new Date(invitation.expiresAt),
          acceptedAt: invitation.acceptedAt ? new Date(invitation.acceptedAt) : null,
          createdAt: new Date(invitation.createdAt),
          updatedAt: new Date(invitation.updatedAt)
        }
      });
    }
    console.log(`✅ Imported ${data.invitations.length} invitations`);

    console.log('\n🎉 Data migration completed successfully!');

    // Verify data
    console.log('\n🔍 Verifying imported data...');
    const counts = {
      users: await prisma.user.count(),
      exercises: await prisma.exercise.count(),
      workouts: await prisma.workout.count(),
      foodEntries: await prisma.foodEntry.count(),
      progressEntries: await prisma.progressEntry.count(),
      appointments: await prisma.appointment.count(),
      mealPlans: await prisma.mealPlan.count(),
      notifications: await prisma.notification.count(),
      contactSubmissions: await prisma.contactSubmission.count(),
      invitations: await prisma.invitation.count()
    };

    console.log('📊 PostgreSQL record counts:');
    Object.entries(counts).forEach(([table, count]) => {
      console.log(`  ${table}: ${count}`);
    });

    // Test complex query
    const testUser = await prisma.user.findFirst({
      include: {
        foodEntries: { take: 3 },
        progressEntries: true,
        clientAppointments: { take: 3 }
      }
    });

    if (testUser) {
      console.log('\n✅ Complex queries working correctly');
      console.log(`  Test user: ${testUser.name} (${testUser.email})`);
      console.log(`  Food entries: ${testUser.foodEntries.length}`);
      console.log(`  Progress entries: ${testUser.progressEntries.length}`);
      console.log(`  Appointments: ${testUser.clientAppointments.length}`);
    }

    console.log('\n🚀 PostgreSQL migration is complete!');
    console.log('🎯 Next steps:');
    console.log('1. Test your application: npm run dev');
    console.log('2. Verify all features work correctly');
    console.log('3. Your platform is now running on PostgreSQL!');

  } catch (error) {
    console.error('❌ Import failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

importData();