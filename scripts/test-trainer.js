const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testTrainerAndCreateContact() {
  try {
    console.log('🔍 Testing trainer account and creating test contact...');
    
    // Check if trainer exists
    const trainer = await prisma.user.findUnique({
      where: { email: 'Martinezfitness559@gmail.com' }
    });
    
    console.log('Trainer found:', trainer ? 'YES' : 'NO');
    if (trainer) {
      console.log('  Name:', trainer.name);
      console.log('  Email:', trainer.email);
      console.log('  ID:', trainer.id);
      console.log('  Role:', trainer.role);
    }
    
    // Create test contact submission
    const testEmail = `testclient${Date.now()}@example.com`;
    
    const contact = await prisma.contactSubmission.create({
      data: {
        name: 'Test Client',
        email: testEmail,
        phone: '555-0123',
        message: 'I want to start my fitness journey!',
        fitnessGoals: 'Weight loss',
        fitnessLevel: 'BEGINNER',
        availability: 'Evenings',
        status: 'NEW'
      }
    });
    
    console.log('\\n📧 Created test contact submission:');
    console.log('  ID:', contact.id);
    console.log('  Email:', contact.email);
    console.log('  Status:', contact.status);
    
    // Now approve the contact and create invitation
    if (trainer) {
      // Generate invitation code
      const invitationCode = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      
      const invitation = await prisma.invitation.create({
        data: {
          code: invitationCode,
          email: contact.email,
          invitedBy: trainer.id,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
          status: 'PENDING'
        }
      });
      
      // Update contact status
      await prisma.contactSubmission.update({
        where: { id: contact.id },
        data: { status: 'INVITED' }
      });
      
      console.log('\\n🎫 Created invitation:');
      console.log('  Code:', invitation.code);
      console.log('  Email:', invitation.email);
      console.log('  Invited by:', trainer.name);
      console.log('  Expires:', invitation.expiresAt.toLocaleDateString());
      
      console.log('\\n🔗 Invitation URL: http://localhost:3000/invite/' + invitation.code);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testTrainerAndCreateContact();