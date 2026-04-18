import { PrismaClient, Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Safety: prevent accidentally polluting prod. Override with SEED_ALLOW_PROD=true.
if (process.env.NODE_ENV === 'production' && process.env.SEED_ALLOW_PROD !== 'true') {
  console.error('[seed] Refusing to run in production. Set SEED_ALLOW_PROD=true to override.');
  process.exit(1);
}

const DEMO_PASSWORD = 'demo123';

async function main() {
  const hash = await bcrypt.hash(DEMO_PASSWORD, 10);

  // ── Trainer ───────────────────────────────────────────────────
  const trainer = await prisma.user.upsert({
    where: { email: 'trainer@demo.com' },
    update: {},
    create: {
      name: 'Brent Martinez',
      email: 'trainer@demo.com',
      role: 'TRAINER',
      password: hash,
      isActive: true,
    },
  });
  await prisma.trainer.upsert({
    where: { userId: trainer.id },
    update: {},
    create: {
      userId: trainer.id,
      bio: 'Head coach at Atlas 559. Specializes in strength-forward programming for intermediate-to-advanced athletes.',
      experience: 8,
      specializations: ['Strength', 'Powerbuilding', 'Hypertrophy', 'Nutrition'] as Prisma.JsonArray,
      certifications: ['NASM-CPT', 'CSCS', 'Precision Nutrition L1'] as Prisma.JsonArray,
    },
  });

  // ── Clients ───────────────────────────────────────────────────
  const clientDefs: Array<{
    email: string;
    name: string;
    age: number;
    weight: number;
    height: number;
    level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
    goals: string[];
  }> = [
    { email: 'jordan@demo.com', name: 'Jordan Reyes', age: 28, weight: 181, height: 178, level: 'INTERMEDIATE', goals: ['Hypertrophy', 'Bench 275'] },
    { email: 'harper@demo.com', name: 'Harper Whitfield', age: 31, weight: 168, height: 172, level: 'ADVANCED', goals: ['Powerlifting', 'Competition prep'] },
    { email: 'priya@demo.com', name: 'Priya Ramachandran', age: 34, weight: 142, height: 165, level: 'INTERMEDIATE', goals: ['Strength', 'Body composition'] },
    { email: 'marcus@demo.com', name: 'Marcus Thompson', age: 29, weight: 195, height: 183, level: 'INTERMEDIATE', goals: ['Hypertrophy', 'Mobility'] },
    { email: 'client@demo.com', name: 'John Doe', age: 28, weight: 176, height: 175, level: 'INTERMEDIATE', goals: ['Weight loss', 'Muscle building'] },
  ];

  const clients: { id: string; name: string; email: string }[] = [];
  for (const c of clientDefs) {
    const user = await prisma.user.upsert({
      where: { email: c.email },
      update: { trainerId: trainer.id },
      create: {
        name: c.name,
        email: c.email,
        role: 'CLIENT',
        password: hash,
        trainerId: trainer.id,
        isActive: true,
      },
    });
    await prisma.clientProfile.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        age: c.age,
        height: c.height,
        weight: c.weight,
        fitnessLevel: c.level,
        fitnessGoals: c.goals as Prisma.JsonArray,
        medicalConditions: [] as Prisma.JsonArray,
        preferences: ['Morning Workouts'] as Prisma.JsonArray,
      },
    });
    clients.push({ id: user.id, name: c.name, email: c.email });
  }

  // ── Exercises ────────────────────────────────────────────────
  const exerciseDefs: Array<{
    name: string;
    muscles: string[];
    equipment: string[];
    difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  }> = [
    { name: 'Barbell Bench Press', muscles: ['Chest', 'Triceps'], equipment: ['Barbell'], difficulty: 'INTERMEDIATE' },
    { name: 'Barbell Back Squat', muscles: ['Quads', 'Glutes'], equipment: ['Barbell'], difficulty: 'ADVANCED' },
    { name: 'Conventional Deadlift', muscles: ['Posterior chain'], equipment: ['Barbell'], difficulty: 'ADVANCED' },
    { name: 'Overhead Press', muscles: ['Shoulders'], equipment: ['Barbell'], difficulty: 'INTERMEDIATE' },
    { name: 'Pull-Up', muscles: ['Lats', 'Biceps'], equipment: ['Bodyweight'], difficulty: 'INTERMEDIATE' },
    { name: 'Romanian Deadlift', muscles: ['Hamstrings'], equipment: ['Barbell'], difficulty: 'INTERMEDIATE' },
    { name: 'Incline Dumbbell Press', muscles: ['Upper Chest'], equipment: ['Dumbbell'], difficulty: 'BEGINNER' },
    { name: 'Barbell Row', muscles: ['Back'], equipment: ['Barbell'], difficulty: 'INTERMEDIATE' },
    { name: 'Weighted Dip', muscles: ['Chest', 'Triceps'], equipment: ['Dip belt'], difficulty: 'ADVANCED' },
    { name: 'Face Pull', muscles: ['Rear delts'], equipment: ['Cable'], difficulty: 'BEGINNER' },
    { name: 'Lateral Raise', muscles: ['Side delts'], equipment: ['Dumbbell'], difficulty: 'BEGINNER' },
    { name: 'Bulgarian Split Squat', muscles: ['Quads', 'Glutes'], equipment: ['Dumbbell'], difficulty: 'INTERMEDIATE' },
  ];
  const exercises: Array<{ id: string; name: string }> = [];
  for (const e of exerciseDefs) {
    const existing = await prisma.exercise.findFirst({ where: { name: e.name } });
    const ex = existing
      ? existing
      : await prisma.exercise.create({
          data: {
            name: e.name,
            muscleGroups: e.muscles as Prisma.JsonArray,
            equipment: e.equipment as Prisma.JsonArray,
            difficulty: e.difficulty,
          },
        });
    exercises.push({ id: ex.id, name: ex.name });
  }
  const exByName = (n: string) => exercises.find((x) => x.name === n)!.id;

  // ── Workouts + historical sessions for "Jordan Reyes" ────────
  const jordan = clients.find((c) => c.email === 'jordan@demo.com')!;
  const pushWorkoutExisting = await prisma.workout.findFirst({
    where: { title: 'Upper / Push — Heavy', createdBy: trainer.id },
  });
  const pushWorkout =
    pushWorkoutExisting ??
    (await prisma.workout.create({
      data: {
        title: 'Upper / Push — Heavy',
        description: 'Bench-focused upper push day, 58 min, ~14k lb volume target.',
        duration: 58,
        type: 'STRENGTH',
        difficulty: 'INTERMEDIATE',
        createdBy: trainer.id,
        exercises: {
          create: [
            { exerciseId: exByName('Barbell Bench Press'), sets: 4, reps: 5, weight: 225, restTime: 180, order: 1 },
            { exerciseId: exByName('Incline Dumbbell Press'), sets: 3, reps: 10, weight: 70, restTime: 120, order: 2 },
            { exerciseId: exByName('Weighted Dip'), sets: 3, reps: 8, weight: 45, restTime: 120, order: 3 },
            { exerciseId: exByName('Overhead Press'), sets: 3, reps: 8, weight: 135, restTime: 120, order: 4 },
            { exerciseId: exByName('Lateral Raise'), sets: 4, reps: 12, weight: 25, restTime: 60, order: 5 },
          ],
        },
      },
    }));

  // Historical completed sessions every 2 days, increasing bench by 5 lb every 2 weeks
  for (let daysAgo = 56; daysAgo >= 0; daysAgo -= 2) {
    const start = new Date();
    start.setDate(start.getDate() - daysAgo);
    start.setHours(7, 0, 0, 0);
    const end = new Date(start);
    end.setHours(8, 0, 0, 0);

    const exists = await prisma.workoutSession.findFirst({
      where: {
        userId: jordan.id,
        workoutId: pushWorkout.id,
        startTime: { gte: new Date(start.getTime() - 3600_000), lte: new Date(start.getTime() + 3600_000) },
      },
    });
    if (exists) continue;

    // Most progress entries skip today to leave room for "today's session"
    if (daysAgo === 0) continue;

    const bench = 200 + Math.floor((56 - daysAgo) / 14) * 5; // 200 → 220 over 8 weeks

    const s = await prisma.workoutSession.create({
      data: {
        userId: jordan.id,
        workoutId: pushWorkout.id,
        startTime: start,
        endTime: end,
        completed: true,
        caloriesBurned: 420,
        workoutProgress: {
          create: [
            { userId: jordan.id, exerciseId: exByName('Barbell Bench Press'), sets: 4, reps: 5, weight: bench, date: start },
            { userId: jordan.id, exerciseId: exByName('Incline Dumbbell Press'), sets: 3, reps: 10, weight: 70, date: start },
            { userId: jordan.id, exerciseId: exByName('Overhead Press'), sets: 3, reps: 8, weight: 130, date: start },
          ],
        },
      },
    });
    void s;
  }

  // Today's not-yet-completed session for Jordan
  const todayStart = new Date();
  todayStart.setHours(7, 0, 0, 0);
  const todayExists = await prisma.workoutSession.findFirst({
    where: {
      userId: jordan.id,
      workoutId: pushWorkout.id,
      startTime: { gte: todayStart },
    },
  });
  if (!todayExists) {
    await prisma.workoutSession.create({
      data: {
        userId: jordan.id,
        workoutId: pushWorkout.id,
        startTime: todayStart,
        completed: false,
      },
    });
  }

  // ── Progress entries for Jordan — bodyweight + mood trending up ──
  for (let weeksAgo = 8; weeksAgo >= 0; weeksAgo--) {
    const d = new Date();
    d.setDate(d.getDate() - weeksAgo * 7);
    d.setHours(6, 0, 0, 0);
    const weight = 184 - (8 - weeksAgo) * 0.4;
    await prisma.progressEntry.upsert({
      where: { userId_date: { userId: jordan.id, date: d } },
      update: {},
      create: {
        userId: jordan.id,
        date: d,
        weight,
        bodyFat: 15 - (8 - weeksAgo) * 0.1,
        mood: Math.min(10, 7 + Math.floor((8 - weeksAgo) / 3)),
        energy: Math.min(10, 7 + Math.floor((8 - weeksAgo) / 3)),
        sleep: 7.5,
      },
    });
  }

  // ── Meal plan for Jordan ────────────────────────────────────
  const existingPlan = await prisma.mealPlan.findFirst({
    where: { userId: jordan.id, name: 'Lean Bulk · Phase 2' },
  });
  if (!existingPlan) {
    const mp = await prisma.mealPlan.create({
      data: {
        name: 'Lean Bulk · Phase 2',
        description: '12-week build block, +0.4 lb/wk target.',
        userId: jordan.id,
        trainerId: trainer.id,
        startDate: new Date(Date.now() - 30 * 86400000),
        endDate: new Date(Date.now() + 60 * 86400000),
        dailyCalorieTarget: 2680,
        dailyProteinTarget: 200,
        dailyCarbTarget: 290,
        dailyFatTarget: 78,
      },
    });
    // At least one structured meal so Nutrition tab has something
    const chicken = await prisma.food.upsert({
      where: { id: 'seed-food-chicken' },
      update: {},
      create: {
        id: 'seed-food-chicken',
        name: 'Chicken Breast',
        caloriesPerServing: 165,
        protein: 31,
        carbs: 0,
        fat: 3.6,
        servingSize: '100',
        servingUnit: 'g',
      },
    });
    const rice = await prisma.food.upsert({
      where: { id: 'seed-food-rice' },
      update: {},
      create: {
        id: 'seed-food-rice',
        name: 'White Rice, Cooked',
        caloriesPerServing: 130,
        protein: 2.7,
        carbs: 28,
        fat: 0.3,
        servingSize: '100',
        servingUnit: 'g',
      },
    });
    const meal = await prisma.meal.create({
      data: { name: 'Lunch', type: 'LUNCH', mealPlanId: mp.id },
    });
    await prisma.mealItem.createMany({
      data: [
        { mealId: meal.id, foodId: chicken.id, quantity: 2.5 },
        { mealId: meal.id, foodId: rice.id, quantity: 2 },
      ],
    });
  }

  // ── Food entries for today (Jordan) ─────────────────────────
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const entryCount = await prisma.foodEntry.count({
    where: { userId: jordan.id, date: { gte: today } },
  });
  if (entryCount === 0) {
    await prisma.foodEntry.createMany({
      data: [
        { userId: jordan.id, foodName: 'Greek Yogurt, Plain Nonfat', quantity: 1, unit: 'cup', calories: 140, protein: 25, carbs: 9, fat: 0, mealType: 'BREAKFAST', date: today },
        { userId: jordan.id, foodName: 'Blueberries', quantity: 1, unit: 'cup', calories: 84, protein: 1, carbs: 21, fat: 0, mealType: 'BREAKFAST', date: today },
        { userId: jordan.id, foodName: 'Chicken Breast, Grilled', quantity: 8, unit: 'oz', calories: 374, protein: 70, carbs: 0, fat: 8, mealType: 'LUNCH', date: today },
        { userId: jordan.id, foodName: 'White Rice', quantity: 1.5, unit: 'cup', calories: 312, protein: 6, carbs: 69, fat: 0.6, mealType: 'LUNCH', date: today },
        { userId: jordan.id, foodName: 'Whey Protein Isolate', quantity: 1, unit: 'scoop', calories: 120, protein: 28, carbs: 1, fat: 0.5, mealType: 'SNACK', date: today },
      ],
    });
  }

  // ── Messages: Brent ↔ Jordan thread ─────────────────────────
  const msgCount = await prisma.message.count({
    where: {
      OR: [
        { senderId: trainer.id, receiverId: jordan.id },
        { senderId: jordan.id, receiverId: trainer.id },
      ],
    },
  });
  if (msgCount === 0) {
    const base = new Date();
    base.setHours(10, 42, 0, 0);
    await prisma.message.createMany({
      data: [
        { senderId: jordan.id, receiverId: trainer.id, content: 'Brent — that bench session felt insane today', createdAt: base },
        { senderId: trainer.id, receiverId: jordan.id, content: 'Saw the log — 4×5 @ 225 all RPE 8 or under. Ready to push to 230 next week.', createdAt: new Date(base.getTime() + 2 * 60000) },
        { senderId: jordan.id, receiverId: trainer.id, content: 'For real? Thought that would take another month', createdAt: new Date(base.getTime() + 3 * 60000) },
        { senderId: trainer.id, receiverId: jordan.id, content: 'Bar speed tells me everything. You left reps on the bar.', createdAt: new Date(base.getTime() + 4 * 60000) },
      ],
    });
  }

  // ── Coach notes (new phase-8 model) ─────────────────────────
  try {
    const noteCount = await prisma.coachNote.count({
      where: { trainerId: trainer.id, clientId: jordan.id },
    });
    if (noteCount === 0) {
      await prisma.coachNote.createMany({
        data: [
          {
            trainerId: trainer.id,
            clientId: jordan.id,
            body: 'Bar speed insane at 225. Push 230 next week.',
            context: 'TRAINING',
          },
          {
            trainerId: trainer.id,
            clientId: jordan.id,
            body: 'Sleep improved. Mood up. Volume tolerable.',
            context: 'PROGRESS',
          },
        ],
      });
    }
  } catch {
    // CoachNote table may not exist yet (migration pending)
  }

  // ── Program (new phase-8 model) with one week assigned to Jordan ──
  try {
    const programExisting = await prisma.program.findFirst({
      where: { createdById: trainer.id, name: 'Hypertrophy · 12 wk' },
    });
    const program =
      programExisting ??
      (await prisma.program.create({
        data: {
          name: 'Hypertrophy · 12 wk',
          description: 'Block-periodized volume → peak. 5-rep waves on the big three.',
          goal: 'Hypertrophy + strength carryover',
          durationWks: 12,
          isTemplate: true,
          createdById: trainer.id,
          weeks: {
            create: Array.from({ length: 12 }, (_, wi) => ({
              weekNumber: wi + 1,
              days: {
                create: [
                  { dayOfWeek: 'MON' as const, sessionType: 'Upper / Push', order: 0 },
                  { dayOfWeek: 'TUE' as const, sessionType: 'Lower / Squat', order: 1 },
                  { dayOfWeek: 'WED' as const, sessionType: 'Rest', order: 2 },
                  { dayOfWeek: 'THU' as const, sessionType: 'Upper / Pull', order: 3 },
                  { dayOfWeek: 'FRI' as const, sessionType: 'Lower / DL', order: 4 },
                  { dayOfWeek: 'SAT' as const, sessionType: 'Conditioning', order: 5 },
                  { dayOfWeek: 'SUN' as const, sessionType: 'Rest', order: 6 },
                ],
              },
            })),
          },
        },
      }));

    // Attach a few exercises to week 1 Monday (push day)
    const firstMon = await prisma.programDay.findFirst({
      where: {
        programWeek: { programId: program.id, weekNumber: 1 },
        dayOfWeek: 'MON',
      },
    });
    if (firstMon) {
      const alreadyHas = await prisma.programDayExercise.count({
        where: { programDayId: firstMon.id },
      });
      if (alreadyHas === 0) {
        await prisma.programDayExercise.createMany({
          data: [
            { programDayId: firstMon.id, exerciseId: exByName('Barbell Bench Press'), order: 0, sets: 4, repsScheme: '5', targetWeight: '225 lb', restSeconds: 180 },
            { programDayId: firstMon.id, exerciseId: exByName('Incline Dumbbell Press'), order: 1, sets: 3, repsScheme: '8-10', targetWeight: '70 lb', restSeconds: 120 },
            { programDayId: firstMon.id, exerciseId: exByName('Weighted Dip'), order: 2, sets: 3, repsScheme: '8', targetWeight: '+45 lb', restSeconds: 120 },
            { programDayId: firstMon.id, exerciseId: exByName('Overhead Press'), order: 3, sets: 3, repsScheme: '6-8', targetWeight: '135 lb', restSeconds: 120 },
            { programDayId: firstMon.id, exerciseId: exByName('Lateral Raise'), order: 4, sets: 4, repsScheme: '12-15', targetWeight: '25 lb', restSeconds: 60 },
          ],
        });
      }
    }

    // Assign to Jordan if not already active
    const existingAssign = await prisma.programAssignment.findFirst({
      where: { programId: program.id, clientId: jordan.id, status: 'ACTIVE' },
    });
    if (!existingAssign) {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30); // 30 days in → week 5-ish
      startDate.setHours(0, 0, 0, 0);
      await prisma.programAssignment.create({
        data: {
          programId: program.id,
          clientId: jordan.id,
          assignedById: trainer.id,
          startDate,
          currentWeek: 5,
          status: 'ACTIVE',
        },
      });
    }
  } catch {
    // Program tables may not exist yet (migration pending)
  }

  // ── Feature flags defaults ──────────────────────────────────
  try {
    const flagDefs = [
      { key: 'active_workout_v4', enabled: true, description: 'Per-set RPE logging + rest timer' },
      { key: 'client_messages_sse', enabled: true, description: 'SSE push for message threads' },
      { key: 'food_search_usda', enabled: true, description: 'USDA FoodData Central search' },
      { key: 'food_search_off', enabled: true, description: 'Open Food Facts search' },
      { key: 'barcode_scanner', enabled: true, description: 'Quagga2 barcode scanner' },
      { key: 'program_builder', enabled: true, description: 'Program schema + builder' },
      { key: 'stripe_subscriptions', enabled: false, description: 'Subscription plans (Stripe)' },
      { key: 'pr_detection', enabled: true, description: 'Auto PR detection' },
    ];
    for (const f of flagDefs) {
      await prisma.featureFlag.upsert({
        where: { key: f.key },
        update: {},
        create: { key: f.key, enabled: f.enabled, description: f.description },
      });
    }
  } catch {
    // FeatureFlag table may not exist yet
  }

  console.log('\n✓ Seeded');
  console.log(`  Trainer:  trainer@demo.com  /  ${DEMO_PASSWORD}`);
  console.log(`  Client:   jordan@demo.com   /  ${DEMO_PASSWORD}  (has 8 wk history)`);
  console.log(`  Extras:   harper@demo.com · priya@demo.com · marcus@demo.com · client@demo.com`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
