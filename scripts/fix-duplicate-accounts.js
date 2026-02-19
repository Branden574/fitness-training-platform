const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function consolidateAccounts() {
  console.log('🔧 Consolidating duplicate Brent Martinez accounts...');
  
  try {
    // Find both Brent accounts
    const brentAccounts = await prisma.user.findMany({
      where: {
        name: 'Brent Martinez',
        role: 'TRAINER'
      },
      include: {
        clients: true,
        createdWorkouts: true,
        mealPlans: true
      }
    });
    
    console.log(`Found ${brentAccounts.length} Brent Martinez accounts`);
    
    if (brentAccounts.length === 2) {
      const [account1, account2] = brentAccounts;
      
      console.log(`Account 1: ${account1.email} - ${account1.clients.length} clients, ${account1.mealPlans.length} meal plans`);
      console.log(`Account 2: ${account2.email} - ${account2.clients.length} clients, ${account2.mealPlans.length} meal plans`);
      
      // Determine which account to keep (the one with clients and meal plans)
      const primaryAccount = account2.clients.length > 0 ? account2 : account1;
      const duplicateAccount = primaryAccount === account1 ? account2 : account1;
      
      console.log(`\n📋 Keeping: ${primaryAccount.email} (ID: ${primaryAccount.id})`);
      console.log(`🗑️ Removing: ${duplicateAccount.email} (ID: ${duplicateAccount.id})`);
      
      // Update any meal plans that belong to the duplicate account
      const duplicateMealPlans = await prisma.mealPlan.count({
        where: { trainerId: duplicateAccount.id }
      });
      
      if (duplicateMealPlans > 0) {
        console.log(`Transferring ${duplicateMealPlans} meal plans...`);
        await prisma.mealPlan.updateMany({
          where: { trainerId: duplicateAccount.id },
          data: { trainerId: primaryAccount.id }
        });
      }
      
      // Update any clients assigned to the duplicate trainer
      if (duplicateAccount.clients.length > 0) {
        console.log(`Transferring ${duplicateAccount.clients.length} clients...`);
        await prisma.user.updateMany({
          where: { trainerId: duplicateAccount.id },
          data: { trainerId: primaryAccount.id }
        });
      }
      
      // Delete any notifications for the duplicate account
      await prisma.notification.deleteMany({
        where: { userId: duplicateAccount.id }
      });
      
      // Delete any sessions for the duplicate account
      await prisma.session.deleteMany({
        where: { userId: duplicateAccount.id }
      });
      
      // Delete any accounts linked to the duplicate user
      await prisma.account.deleteMany({
        where: { userId: duplicateAccount.id }
      });
      
      // Finally delete the duplicate user account
      await prisma.user.delete({
        where: { id: duplicateAccount.id }
      });
      
      console.log('✅ Account consolidation complete!');
      
      // Show final state
      const finalAccount = await prisma.user.findUnique({
        where: { id: primaryAccount.id },
        include: {
          clients: true,
          mealPlans: true
        }
      });
      
      console.log(`\n📊 Final account: ${finalAccount.email}`);
      console.log(`   - ${finalAccount.clients.length} clients`);
      console.log(`   - ${finalAccount.mealPlans.length} meal plans`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

consolidateAccounts();