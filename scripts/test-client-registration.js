const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function testClientRegistration() {
  try {
    console.log('🔍 Testing client registration with invitation code...');
    
    // Use the invitation code we just created
    const invitationCode = 'huw41evm5lqdzu4ftsx89n';
    const clientEmail = 'testclient1758170274878@example.com';
    
    // Validate invitation first
    console.log('\\n1. Validating invitation code...');
    const invitation = await prisma.invitation.findUnique({
      where: { code: invitationCode }
    });
    
    if (!invitation) {
      console.log('❌ Invitation not found');
      return;
    }
    
    console.log('✅ Invitation found:');
    console.log('  Email:', invitation.email);
    console.log('  Invited by:', invitation.invitedBy);
    console.log('  Status:', invitation.status);
    
    // Simulate the registration process
    console.log('\\n2. Creating client account...');
    const hashedPassword = await bcrypt.hash('TestPassword123!', 12);
    
    const client = await prisma.user.create({
      data: {
        name: 'Test Client User',
        email: clientEmail,
        password: hashedPassword,
        role: 'CLIENT',
        trainerId: invitation.invitedBy, // This is the key - auto-link to trainer
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        trainerId: true,
        createdAt: true
      }
    });
    
    console.log('✅ Client account created:');
    console.log('  ID:', client.id);
    console.log('  Name:', client.name);
    console.log('  Email:', client.email);
    console.log('  Role:', client.role);
    console.log('  Trainer ID:', client.trainerId);
    
    // Mark invitation as accepted
    await prisma.invitation.update({
      where: { id: invitation.id },
      data: {
        status: 'ACCEPTED',
        acceptedAt: new Date(),
      }
    });
    
    // Update contact submission status
    await prisma.contactSubmission.updateMany({
      where: { 
        email: clientEmail,
        status: 'INVITED'
      },
      data: {
        status: 'COMPLETED'
      }
    });
    
    console.log('✅ Invitation marked as accepted and contact completed');
    
    // Verify trainer now has this client
    console.log('\\n3. Verifying trainer-client relationship...');
    const trainer = await prisma.user.findUnique({
      where: { id: invitation.invitedBy },
      include: {
        clients: {
          select: {
            id: true,
            name: true,
            email: true,
            createdAt: true
          }
        }
      }
    });
    
    console.log('\\n📊 Trainer now has', trainer.clients.length, 'clients:');
    trainer.clients.forEach((client, index) => {
      console.log('  ' + (index + 1) + '.', client.name, '(' + client.email + ')');
    });
    
    console.log('\\n🎉 Client linking test completed successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testClientRegistration();