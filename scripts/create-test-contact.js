const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createTestContactSubmission() {
  try {
    const submission = await prisma.contactSubmission.create({
      data: {
        name: "Test Client",
        email: "testclient@example.com",
        phone: "555-123-4567",
        age: "25",
        message: "I'm interested in personal training",
        fitnessLevel: "Beginner",
        fitnessGoals: "Weight loss and muscle building",
        status: "NEW"
      }
    });

    console.log('✅ Test contact submission created:', submission);
    
    // Fetch all submissions to verify
    const allSubmissions = await prisma.contactSubmission.findMany({
      orderBy: { createdAt: 'desc' }
    });
    
    console.log('📋 Total contact submissions:', allSubmissions.length);
    allSubmissions.forEach((sub, index) => {
      console.log(`${index + 1}. ${sub.name} (${sub.email}) - Status: ${sub.status}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestContactSubmission();