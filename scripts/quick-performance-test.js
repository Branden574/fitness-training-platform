const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://postgres:iE27%26%2BnQ7VdHp8%23@db.zqgaogztrxzsevimqelr.supabase.co:5432/postgres"
    }
  }
});

async function quickPerformanceTest() {
  console.log('🚀 QUICK PERFORMANCE TEST');
  console.log('==========================');
  
  const tests = [
    {
      name: 'User Count Query',
      test: () => prisma.user.count()
    },
    {
      name: 'Food Entries Count',
      test: () => prisma.foodEntry.count()
    },
    {
      name: 'Complex User Query',
      test: () => prisma.user.findMany({
        include: {
          _count: {
            select: {
              foodEntries: true,
              clientAppointments: true
            }
          }
        },
        take: 10
      })
    },
    {
      name: 'Recent Food Entries',
      test: () => prisma.foodEntry.findMany({
        include: { user: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 20
      })
    },
    {
      name: 'Appointment Aggregation',
      test: () => prisma.appointment.groupBy({
        by: ['status'],
        _count: true
      })
    }
  ];

  const results = [];
  
  for (const { name, test } of tests) {
    const startTime = Date.now();
    try {
      const result = await test();
      const duration = Date.now() - startTime;
      
      console.log(`✅ ${name}: ${duration}ms`);
      results.push({ name, duration, success: true, count: Array.isArray(result) ? result.length : 1 });
    } catch (error) {
      const duration = Date.now() - startTime;
      console.log(`❌ ${name}: ${duration}ms (ERROR: ${error.message})`);
      results.push({ name, duration, success: false, error: error.message });
    }
  }

  // Test concurrent operations
  console.log('\n⚡ Testing 20 concurrent operations...');
  const concurrentStart = Date.now();
  
  const concurrentPromises = Array(20).fill().map(async (_, i) => {
    try {
      await prisma.user.findMany({ take: 5 });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  const concurrentResults = await Promise.all(concurrentPromises);
  const concurrentDuration = Date.now() - concurrentStart;
  const successfulConcurrent = concurrentResults.filter(r => r.success).length;

  console.log(`✅ Concurrent test: ${successfulConcurrent}/20 successful in ${concurrentDuration}ms`);

  // Performance assessment
  console.log('\n📊 PERFORMANCE ASSESSMENT');
  console.log('===========================');
  
  const avgQueryTime = results.filter(r => r.success).reduce((sum, r) => sum + r.duration, 0) / results.filter(r => r.success).length;
  const errorCount = results.filter(r => !r.success).length;

  console.log(`Average Query Time: ${Math.round(avgQueryTime)}ms`);
  console.log(`Successful Queries: ${results.filter(r => r.success).length}/${results.length}`);
  console.log(`Concurrent Success Rate: ${successfulConcurrent}/20 (${Math.round(successfulConcurrent/20*100)}%)`);

  if (avgQueryTime < 100) {
    console.log('🎉 EXCELLENT: Database performance is optimal');
  } else if (avgQueryTime < 300) {
    console.log('✅ GOOD: Database performance is acceptable');
  } else {
    console.log('⚠️  WARNING: Database performance may need optimization');
  }

  if (successfulConcurrent >= 18) {
    console.log('🎉 EXCELLENT: Concurrent handling is optimal');
  } else if (successfulConcurrent >= 15) {
    console.log('✅ GOOD: Concurrent handling is acceptable');
  } else {
    console.log('⚠️  WARNING: Concurrent handling may need improvement');
  }

  console.log('\n🎯 PRODUCTION READINESS:');
  if (avgQueryTime < 200 && successfulConcurrent >= 18 && errorCount === 0) {
    console.log('✅ READY FOR PRODUCTION - Your platform can handle Brent\'s growing client base!');
  } else {
    console.log('⚠️  REVIEW RECOMMENDED - Some optimization may be needed');
  }

  return {
    avgQueryTime: Math.round(avgQueryTime),
    successRate: Math.round(successfulConcurrent/20*100),
    errorCount,
    recommendation: avgQueryTime < 200 && successfulConcurrent >= 18 ? 'PRODUCTION_READY' : 'NEEDS_REVIEW'
  };
}

quickPerformanceTest()
  .then(result => {
    console.log('\n📋 FINAL RECOMMENDATION:', result.recommendation);
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });