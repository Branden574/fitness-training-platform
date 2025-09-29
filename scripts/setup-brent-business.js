const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function setupBrentBusinessAccount() {
  try {
    console.log('🚀 Setting up Brent Martinez\'s REAL business account...');
    console.log('📧 Email: martinezfitness559@gmail.com');
    
    // Get the current demo trainer account
    const demoTrainer = await prisma.user.findUnique({
      where: { email: 'trainer@demo.com' },
      include: { 
        clients: true,
        trainer: true,
        trainerAppointments: true
      }
    });
    
    if (!demoTrainer) {
      console.error('❌ Demo trainer not found');
      return;
    }
    
    console.log(`📋 Found demo account with ${demoTrainer.clients.length} clients`);
    
    // Create Brent's real business account
    const brentBusiness = await prisma.user.create({
      data: {
        name: 'Brent Martinez',
        email: 'martinezfitness559@gmail.com',
        role: 'TRAINER',
      },
    });
    
    console.log(`✅ Created business account: ${brentBusiness.name} (${brentBusiness.email})`);
    
    // Create trainer profile for business account
    if (demoTrainer.trainer) {
      await prisma.trainer.create({
        data: {
          userId: brentBusiness.id,
          bio: demoTrainer.trainer.bio,
          experience: demoTrainer.trainer.experience,
          specializations: demoTrainer.trainer.specializations,
          certifications: demoTrainer.trainer.certifications,
        },
      });
      console.log('✅ Copied trainer profile to business account');
    }
    
    // Transfer all clients to the business account
    const clientUpdateResult = await prisma.user.updateMany({
      where: { trainerId: demoTrainer.id },
      data: { trainerId: brentBusiness.id }
    });
    
    console.log(`✅ Transferred ${clientUpdateResult.count} clients to business account`);
    
    // Transfer all appointments to business account
    const appointmentUpdateResult = await prisma.appointment.updateMany({
      where: { trainerId: demoTrainer.id },
      data: { trainerId: brentBusiness.id }
    });
    
    console.log(`✅ Transferred ${appointmentUpdateResult.count} appointments to business account`);
    
    // Transfer all meal plans to business account
    const mealPlanUpdateResult = await prisma.mealPlan.updateMany({
      where: { trainerId: demoTrainer.id },
      data: { trainerId: brentBusiness.id }
    });
    
    console.log(`✅ Transferred ${mealPlanUpdateResult.count} meal plans to business account`);
    
    // Now remove the demo trainer account
    await prisma.trainer.deleteMany({
      where: { userId: demoTrainer.id }
    });
    
    await prisma.user.delete({
      where: { id: demoTrainer.id }
    });
    
    console.log('🗑️ Removed demo trainer account');
    
    // Verify the transfer
    const businessTrainer = await prisma.user.findUnique({
      where: { email: 'martinezfitness559@gmail.com' },
      include: { 
        clients: true,
        trainer: true
      }
    });
    
    const businessAppointments = await prisma.appointment.findMany({
      where: { trainerId: brentBusiness.id }
    });
    
    const businessMealPlans = await prisma.mealPlan.findMany({
      where: { trainerId: brentBusiness.id }
    });
    
    console.log('\\n🎉 BRENT MARTINEZ FITNESS BUSINESS ACCOUNT SETUP COMPLETE!');
    console.log('=' .repeat(60));
    console.log(`📧 Business Email: ${businessTrainer.email}`);
    console.log(`👤 Name: ${businessTrainer.name}`);
    console.log(`🆔 ID: ${businessTrainer.id}`);
    console.log(`👥 Clients: ${businessTrainer.clients.length}`);
    console.log(`📅 Appointments: ${businessAppointments.length}`);
    console.log(`🥗 Meal Plans: ${businessMealPlans.length}`);
    
    console.log('\\n👥 CLIENT LIST:');
    businessTrainer.clients.forEach((client, index) => {
      console.log(`   ${index + 1}. ${client.name} (${client.email})`);
    });
    
    console.log('\\n🔑 IMPORTANT - LOGIN CREDENTIALS:');
    console.log('   ⚠️  You need to set a password for: martinezfitness559@gmail.com');
    console.log('   📝 Suggested: Use the same password as demo (demo123) or set a secure one');
    console.log('   🔄 New clients will now register under martinezfitness559@gmail.com');
    
    console.log('\\n✅ ALL SYSTEMS READY FOR BRENT MARTINEZ FITNESS!');
    
  } catch (error) {
    console.error('❌ Error setting up business account:', error);
  } finally {
    await prisma.$disconnect();
  }
}

setupBrentBusinessAccount();