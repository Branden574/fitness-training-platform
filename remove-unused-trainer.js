const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function removeUnusedTrainerAccount() {
  try {
    console.log('🔍 Checking unused trainer account before deletion...');
    
    // First, verify the account has no clients
    const unusedAccount = await prisma.user.findUnique({
      where: { id: 'cmfrv62eu0000xncpty5n5r4f' },
      include: {
        clients: true
      }
    });
    
    if (!unusedAccount) {
      console.log('❌ Account not found');
      return;
    }
    
    console.log('Account details:');
    console.log(`  ID: ${unusedAccount.id}`);
    console.log(`  Name: ${unusedAccount.name}`);
    console.log(`  Email: ${unusedAccount.email}`);
    console.log(`  Role: ${unusedAccount.role}`);
    console.log(`  Client count: ${unusedAccount.clients.length}`);
    
    if (unusedAccount.clients.length > 0) {
      console.log('❌ Cannot delete - account has clients assigned');
      return;
    }
    
    // Safe to delete
    console.log('\n🗑️  Deleting unused demo trainer account...');
    
    await prisma.user.delete({
      where: { id: 'cmfrv62eu0000xncpty5n5r4f' }
    });
    
    console.log('✅ Successfully deleted unused trainer account');
    
    // Verify remaining accounts
    console.log('\n🔍 Remaining Brent Martinez accounts:');
    const remainingAccounts = await prisma.user.findMany({
      where: { 
        name: { contains: 'Brent Martinez' }
      },
      include: {
        clients: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });
    
    remainingAccounts.forEach((account, index) => {
      console.log(`\nACCOUNT ${index + 1}:`);
      console.log(`  ID: ${account.id}`);
      console.log(`  Name: ${account.name}`);
      console.log(`  Email: ${account.email}`);
      console.log(`  Role: ${account.role}`);
      console.log(`  Client count: ${account.clients.length}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

removeUnusedTrainerAccount();