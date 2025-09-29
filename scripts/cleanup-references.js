const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function findAndCleanReferences() {
  try {
    console.log('=== FINDING REFERENCES TO OLD ACCOUNT ===\n');

    const oldAccount = await prisma.user.findFirst({
      where: { email: 'brent@trainer.com' }
    });

    if (!oldAccount) {
      console.log('Old account not found');
      return;
    }

    console.log(`Checking references for old account: ${oldAccount.id}`);

    // Check for any workouts created by this user
    const workouts = await prisma.workout.findMany({
      where: { createdBy: oldAccount.id }
    });
    console.log(`Workouts created by old account: ${workouts.length}`);

    // Check for any meal plans as trainer
    const mealPlans = await prisma.mealPlan.findMany({
      where: { trainerId: oldAccount.id }
    });
    console.log(`Meal plans assigned by old account: ${mealPlans.length}`);

    // Check for any sent messages
    const sentMessages = await prisma.message.findMany({
      where: { senderId: oldAccount.id }
    });
    console.log(`Messages sent by old account: ${sentMessages.length}`);

    // Check for any received messages
    const receivedMessages = await prisma.message.findMany({
      where: { receiverId: oldAccount.id }
    });
    console.log(`Messages received by old account: ${receivedMessages.length}`);

    // Check for any invitations
    const invitations = await prisma.invitation.findMany({
      where: { invitedBy: oldAccount.id }
    });
    console.log(`Invitations created by old account: ${invitations.length}`);

    // Check for trainer appointments
    const trainerAppointments = await prisma.appointment.findMany({
      where: { trainerId: oldAccount.id }
    });
    console.log(`Appointments as trainer: ${trainerAppointments.length}`);

    // Check for client appointments
    const clientAppointments = await prisma.appointment.findMany({
      where: { clientId: oldAccount.id }
    });
    console.log(`Appointments as client: ${clientAppointments.length}`);

    // Check for trainer profile
    const trainerProfile = await prisma.trainer.findFirst({
      where: { userId: oldAccount.id }
    });
    console.log(`Trainer profile exists: ${trainerProfile ? 'Yes' : 'No'}`);

    console.log('\n=== CLEANING UP REFERENCES ===');

    const newTrainerId = 'cmfoww8ms0000xnv1w7em4jxg'; // Martinezfitness559@gmail.com ID

    // Transfer workouts to new trainer
    if (workouts.length > 0) {
      await prisma.workout.updateMany({
        where: { createdBy: oldAccount.id },
        data: { createdBy: newTrainerId }
      });
      console.log(`✅ Transferred ${workouts.length} workouts to new trainer`);
    }

    // Transfer meal plans
    if (mealPlans.length > 0) {
      await prisma.mealPlan.updateMany({
        where: { trainerId: oldAccount.id },
        data: { trainerId: newTrainerId }
      });
      console.log(`✅ Transferred ${mealPlans.length} meal plans to new trainer`);
    }

    // Delete messages
    if (sentMessages.length > 0) {
      await prisma.message.deleteMany({
        where: { senderId: oldAccount.id }
      });
      console.log(`✅ Deleted ${sentMessages.length} sent messages`);
    }

    if (receivedMessages.length > 0) {
      await prisma.message.deleteMany({
        where: { receiverId: oldAccount.id }
      });
      console.log(`✅ Deleted ${receivedMessages.length} received messages`);
    }

    // Transfer invitations
    if (invitations.length > 0) {
      await prisma.invitation.updateMany({
        where: { invitedBy: oldAccount.id },
        data: { invitedBy: newTrainerId }
      });
      console.log(`✅ Transferred ${invitations.length} invitations to new trainer`);
    }

    // Transfer trainer appointments
    if (trainerAppointments.length > 0) {
      await prisma.appointment.updateMany({
        where: { trainerId: oldAccount.id },
        data: { trainerId: newTrainerId }
      });
      console.log(`✅ Transferred ${trainerAppointments.length} trainer appointments`);
    }

    // Delete client appointments (shouldn't exist for trainer account)
    if (clientAppointments.length > 0) {
      await prisma.appointment.deleteMany({
        where: { clientId: oldAccount.id }
      });
      console.log(`✅ Deleted ${clientAppointments.length} client appointments`);
    }

    // Delete trainer profile
    if (trainerProfile) {
      await prisma.trainer.delete({
        where: { id: trainerProfile.id }
      });
      console.log(`✅ Deleted trainer profile`);
    }

    // Delete any accounts/sessions for this user
    await prisma.account.deleteMany({
      where: { userId: oldAccount.id }
    });
    console.log(`✅ Deleted OAuth accounts`);

    await prisma.session.deleteMany({
      where: { userId: oldAccount.id }
    });
    console.log(`✅ Deleted sessions`);

    console.log('\n=== NOW DELETING OLD ACCOUNT ===');

    // Now try to delete the user
    await prisma.user.delete({
      where: { id: oldAccount.id }
    });

    console.log(`✅ Successfully deleted old account: ${oldAccount.email}`);

    console.log('\n=== FINAL VERIFICATION ===');
    const remainingUsers = await prisma.user.findMany({
      include: {
        assignedTrainer: {
          select: {
            name: true,
            email: true
          }
        },
        clients: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });

    console.log(`\nRemaining users: ${remainingUsers.length}`);
    remainingUsers.forEach(user => {
      console.log(`\n📧 ${user.email}`);
      console.log(`   Name: ${user.name}`);
      console.log(`   Role: ${user.role}`);
      
      if (user.role === 'CLIENT') {
        console.log(`   Trainer: ${user.assignedTrainer?.name || 'None'} (${user.assignedTrainer?.email || 'N/A'})`);
      } else if (user.role === 'TRAINER') {
        console.log(`   Clients: ${user.clients.length}`);
        user.clients.forEach(client => {
          console.log(`     - ${client.name} (${client.email})`);
        });
      }
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

findAndCleanReferences();