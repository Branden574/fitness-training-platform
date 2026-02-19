const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanupDuplicateExercises() {
  console.log('🧹 Starting duplicate exercise cleanup...');
  
  try {
    // Get all exercises
    const exercises = await prisma.exercise.findMany({
      orderBy: { createdAt: 'asc' } // Keep the oldest one
    });
    
    console.log(`📊 Found ${exercises.length} total exercises`);
    
    // Group by name
    const exercisesByName = {};
    exercises.forEach(ex => {
      if (!exercisesByName[ex.name]) {
        exercisesByName[ex.name] = [];
      }
      exercisesByName[ex.name].push(ex);
    });
    
    let duplicatesFound = 0;
    let duplicatesRemoved = 0;
    
    for (const [name, exList] of Object.entries(exercisesByName)) {
      if (exList.length > 1) {
        duplicatesFound++;
        console.log(`\n🔍 Found ${exList.length} duplicates for "${name}"`);
        
        // Keep the first one (oldest), remove the rest
        const keepExercise = exList[0];
        const duplicatesToRemove = exList.slice(1);
        
        console.log(`  ✅ Keeping: ${keepExercise.id} (created: ${keepExercise.createdAt})`);
        
        for (const duplicate of duplicatesToRemove) {
          try {
            // Check if this exercise is used in any workout
            const workoutExercises = await prisma.workoutExercise.findMany({
              where: { exerciseId: duplicate.id }
            });
            
            if (workoutExercises.length > 0) {
              console.log(`  🔄 Updating ${workoutExercises.length} workout references from ${duplicate.id} to ${keepExercise.id}`);
              
              // Update workout exercises to reference the kept exercise
              await prisma.workoutExercise.updateMany({
                where: { exerciseId: duplicate.id },
                data: { exerciseId: keepExercise.id }
              });
            }
            
            // Now delete the duplicate
            await prisma.exercise.delete({
              where: { id: duplicate.id }
            });
            
            console.log(`  🗑️ Deleted duplicate: ${duplicate.id}`);
            duplicatesRemoved++;
            
          } catch (error) {
            console.error(`  ❌ Error removing duplicate ${duplicate.id}:`, error.message);
          }
        }
      }
    }
    
    console.log(`\n📈 Summary:`);
    console.log(`  - Exercise names with duplicates: ${duplicatesFound}`);
    console.log(`  - Duplicate exercises removed: ${duplicatesRemoved}`);
    
    // Verify the cleanup
    const finalExercises = await prisma.exercise.findMany();
    console.log(`  - Final exercise count: ${finalExercises.length}`);
    
    // Check for remaining duplicates
    const finalExercisesByName = {};
    finalExercises.forEach(ex => {
      if (!finalExercisesByName[ex.name]) {
        finalExercisesByName[ex.name] = 0;
      }
      finalExercisesByName[ex.name]++;
    });
    
    const remainingDuplicates = Object.entries(finalExercisesByName)
      .filter(([name, count]) => count > 1);
    
    if (remainingDuplicates.length === 0) {
      console.log(`  ✅ No duplicates remaining!`);
    } else {
      console.log(`  ⚠️ Remaining duplicates: ${remainingDuplicates.length}`);
      remainingDuplicates.forEach(([name, count]) => {
        console.log(`    - ${name}: ${count} copies`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanupDuplicateExercises();