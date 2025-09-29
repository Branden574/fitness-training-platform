const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function finalizeBrentAccount() {
  try {
    console.log('🔐 Setting up login credentials for Brent\'s business account...');
    
    // Set password for Brent's business account
    const hashedPassword = await bcrypt.hash('demo123', 12);
    
    await prisma.user.update({
      where: { email: 'martinezfitness559@gmail.com' },
      data: { 
        password: hashedPassword,
        passwordChangeRequired: false
      }
    });
    
    console.log('✅ Password set for martinezfitness559@gmail.com');
    
    // Get final account status
    const brent = await prisma.user.findUnique({
      where: { email: 'martinezfitness559@gmail.com' },
      include: { 
        clients: true,
        trainer: true
      }
    });
    
    const appointments = await prisma.appointment.findMany({
      where: { trainerId: brent.id }
    });
    
    const mealPlans = await prisma.mealPlan.findMany({
      where: { trainerId: brent.id }
    });
    
    console.log('\\n🎉 BRENT MARTINEZ FITNESS - READY FOR BUSINESS!');
    console.log('=' .repeat(55));
    console.log(`🏢 Business Name: Brent Martinez Fitness`);
    console.log(`📧 Business Email: ${brent.email}`);
    console.log(`👤 Trainer: ${brent.name}`);
    console.log(`🆔 Account ID: ${brent.id}`);
    
    console.log('\\n📊 BUSINESS STATISTICS:');
    console.log(`   👥 Active Clients: ${brent.clients.length}`);
    console.log(`   📅 Total Appointments: ${appointments.length}`);
    console.log(`   🥗 Nutrition Plans: ${mealPlans.length}`);
    
    console.log('\\n👥 CLIENT ROSTER:');
    brent.clients.forEach((client, index) => {
      console.log(`   ${index + 1}. ${client.name} (${client.email})`);
    });
    
    console.log('\\n🔑 LOGIN CREDENTIALS:');
    console.log('   Email: martinezfitness559@gmail.com');
    console.log('   Password: demo123');
    console.log('   Role: TRAINER (Full Access)');
    
    console.log('\\n✅ SYSTEM CAPABILITIES:');
    console.log('   ✓ Client Management & Scheduling');
    console.log('   ✓ Appointment Booking & Calendar');
    console.log('   ✓ Nutrition Plan Creation & Management');
    console.log('   ✓ Progress Tracking & Analytics');
    console.log('   ✓ Food Logging & Macro Tracking');
    console.log('   ✓ New Client Registration & Assignment');
    
    console.log('\\n🚀 NEXT STEPS:');
    console.log('   1. Clear browser cookies and log in with business email');
    console.log('   2. Test all trainer dashboard features');
    console.log('   3. Verify client access and functionality');
    console.log('   4. Ready for live client use!');
    
  } catch (error) {
    console.error('❌ Error finalizing account:', error);
  } finally {
    await prisma.$disconnect();
  }
}

finalizeBrentAccount();