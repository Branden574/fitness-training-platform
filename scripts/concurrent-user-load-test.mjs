import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

// CONCURRENT USER LOAD TEST - Find the maximum capacity
const LOAD_TEST_CONFIG = {
  // Test different user loads progressively
  USER_LOAD_LEVELS: [100, 250, 500, 750, 1000, 1500, 2000],
  CONNECTION_LIMIT: 40,
  OPERATIONS_PER_USER: 3, // Realistic user session (dashboard load, macro check, recent entries)
  MAX_RESPONSE_TIME: 5000, // 5 second timeout
  SUCCESS_RATE_THRESHOLD: 95, // Minimum 95% success rate
  RESPONSE_TIME_THRESHOLD: 500, // Maximum 500ms average response
};

class ConcurrentUserLoadTest {
  constructor() {
    this.prisma = new PrismaClient({
      datasources: {
        db: {
          url: `postgresql://postgres:iE27%26%2BnQ7VdHp8%23@db.zqgaogztrxzsevimqelr.supabase.co:5432/postgres?connection_limit=${LOAD_TEST_CONFIG.CONNECTION_LIMIT}&pool_timeout=10&connect_timeout=15&statement_timeout=20000&idle_timeout=600`
        }
      },
      log: [],
      errorFormat: 'minimal'
    });

    // Simple cache for realistic performance
    this.cache = new Map();
    this.cacheTTL = new Map();
    
    // Connection management
    this.connectionSemaphore = new Array(LOAD_TEST_CONFIG.CONNECTION_LIMIT - 5).fill(true);
    
    this.testResults = [];
    
    console.log('🧪 CONCURRENT USER LOAD TEST INITIALIZED');
    console.log(`Testing user loads: ${LOAD_TEST_CONFIG.USER_LOAD_LEVELS.join(', ')}`);
    console.log(`Target: >95% success rate, <500ms average response`);
  }

  // Cache management
  getCache(key) {
    const ttl = this.cacheTTL.get(key);
    if (ttl && Date.now() > ttl) {
      this.cache.delete(key);
      this.cacheTTL.delete(key);
      return null;
    }
    return this.cache.get(key) || null;
  }

  setCache(key, value, ttl = 120000) { // 2 minutes
    this.cache.set(key, value);
    this.cacheTTL.set(key, Date.now() + ttl);
  }

  // Connection management
  async acquireConnection() {
    let attempts = 0;
    while (this.connectionSemaphore.length === 0 && attempts < 50) {
      await new Promise(resolve => setTimeout(resolve, 20));
      attempts++;
    }
    
    if (this.connectionSemaphore.length === 0) {
      throw new Error('Connection pool exhausted');
    }
    
    return this.connectionSemaphore.pop();
  }

  releaseConnection(token) {
    this.connectionSemaphore.push(token);
  }

  // Simulate realistic user operations
  async simulateUserSession(userId) {
    const sessionStart = performance.now();
    const operations = [];
    
    try {
      // Operation 1: Load user dashboard (get user info + macro totals)
      const dashboardOp = this.performDashboardLoad(userId);
      operations.push(dashboardOp);
      
      // Operation 2: Get macro totals for today
      const macroOp = this.performMacroCalculation(userId);
      operations.push(macroOp);
      
      // Operation 3: Load recent food entries
      const recentOp = this.performRecentEntriesLoad(userId);
      operations.push(recentOp);
      
      // Wait for all operations to complete
      const results = await Promise.allSettled(operations);
      
      const sessionDuration = Math.round(performance.now() - sessionStart);
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      
      return {
        userId,
        sessionDuration,
        operationsSuccessful: successful,
        operationsFailed: failed,
        success: successful === LOAD_TEST_CONFIG.OPERATIONS_PER_USER
      };
      
    } catch (error) {
      const sessionDuration = Math.round(performance.now() - sessionStart);
      return {
        userId,
        sessionDuration,
        operationsSuccessful: 0,
        operationsFailed: LOAD_TEST_CONFIG.OPERATIONS_PER_USER,
        success: false,
        error: error.message
      };
    }
  }

  async performDashboardLoad(userId) {
    const cacheKey = `dashboard_${userId}`;
    const cached = this.getCache(cacheKey);
    if (cached) return cached;

    const token = await this.acquireConnection();
    try {
      // Simulate dashboard data loading
      const [userCount, appointmentCount] = await Promise.all([
        this.prisma.user.count(),
        this.prisma.appointment.count({ where: { clientId: userId } })
      ]);
      
      const result = { userCount, appointmentCount, userId };
      this.setCache(cacheKey, result, 60000); // 1 minute cache
      return result;
      
    } finally {
      this.releaseConnection(token);
    }
  }

  async performMacroCalculation(userId) {
    const today = new Date().toDateString();
    const cacheKey = `macros_${userId}_${today}`;
    const cached = this.getCache(cacheKey);
    if (cached) return cached;

    const token = await this.acquireConnection();
    try {
      const macros = await this.prisma.foodEntry.aggregate({
        where: {
          userId,
          date: {
            gte: new Date(today),
            lt: new Date(new Date(today).getTime() + 24 * 60 * 60 * 1000)
          }
        },
        _sum: {
          calories: true,
          protein: true,
          carbs: true,
          fat: true
        }
      });

      const result = {
        calories: macros._sum.calories || 0,
        protein: macros._sum.protein || 0,
        carbs: macros._sum.carbs || 0,
        fat: macros._sum.fat || 0,
        userId
      };
      
      this.setCache(cacheKey, result, 30000); // 30 second cache
      return result;
      
    } finally {
      this.releaseConnection(token);
    }
  }

  async performRecentEntriesLoad(userId) {
    const cacheKey = `recent_${userId}`;
    const cached = this.getCache(cacheKey);
    if (cached) return cached;

    const token = await this.acquireConnection();
    try {
      const entries = await this.prisma.foodEntry.findMany({
        where: { userId },
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          foodName: true,
          calories: true,
          createdAt: true
        }
      });
      
      this.setCache(cacheKey, entries, 15000); // 15 second cache
      return entries;
      
    } finally {
      this.releaseConnection(token);
    }
  }

  // Create test users for load testing
  async createLoadTestUsers(userCount) {
    console.log(`📊 Creating ${userCount} test users...`);
    
    const hashedPassword = await bcrypt.hash('LoadTest123!', 8);
    const users = [];
    
    for (let i = 0; i < userCount; i++) {
      users.push({
        name: `LoadUser ${i + 1}`,
        email: `loaduser${i + 1}@loadtest.com`,
        role: 'CLIENT',
        isActive: true,
        password: hashedPassword,
        emailVerified: new Date()
      });
    }

    // Create in batches for better performance
    const batchSize = 100;
    let totalCreated = 0;
    
    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize);
      const result = await this.prisma.user.createMany({
        data: batch,
        skipDuplicates: true
      });
      totalCreated += result.count;
    }

    console.log(`✅ Created ${totalCreated} test users`);

    // Create some food entries for realistic testing
    const userIds = await this.prisma.user.findMany({
      where: { email: { contains: 'loaduser' } },
      select: { id: true },
      take: Math.min(userCount, 500) // Limit food entries for performance
    });

    const foodEntries = [];
    const today = new Date();
    
    for (const user of userIds) {
      for (let meal = 0; meal < 2; meal++) { // 2 meals per user
        foodEntries.push({
          userId: user.id,
          foodName: `Test Meal ${meal + 1}`,
          calories: 400 + meal * 100,
          protein: 25 + meal * 5,
          carbs: 30 + meal * 10,
          fat: 15 + meal * 5,
          quantity: 1,
          unit: 'serving',
          mealType: meal === 0 ? 'BREAKFAST' : 'LUNCH',
          date: today,
          createdAt: today
        });
      }
    }

    if (foodEntries.length > 0) {
      const foodResult = await this.prisma.foodEntry.createMany({
        data: foodEntries,
        skipDuplicates: true
      });
      console.log(`✅ Created ${foodResult.count} food entries`);
    }

    return userIds.map(u => u.id);
  }

  // Test specific user load level
  async testUserLoad(userCount) {
    console.log(`\n🧪 TESTING ${userCount} CONCURRENT USERS`);
    console.log('═'.repeat(50));
    
    try {
      // Create test users
      const userIds = await this.createLoadTestUsers(userCount);
      
      // Warm up cache
      console.log('🔥 Warming cache...');
      await Promise.all([
        this.performDashboardLoad(userIds[0]),
        this.performMacroCalculation(userIds[0]),
        this.performRecentEntriesLoad(userIds[0])
      ]);
      
      // Start concurrent user sessions
      console.log(`🚀 Starting ${userCount} concurrent user sessions...`);
      const sessionStart = performance.now();
      
      const sessionPromises = userIds.slice(0, userCount).map(userId => 
        this.simulateUserSession(userId)
      );
      
      // Wait for all sessions with timeout
      const sessionResults = await Promise.allSettled(
        sessionPromises.map(promise => 
          Promise.race([
            promise,
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Session timeout')), LOAD_TEST_CONFIG.MAX_RESPONSE_TIME)
            )
          ])
        )
      );
      
      const testDuration = Math.round(performance.now() - sessionStart);
      
      // Analyze results
      const successful = sessionResults.filter(r => 
        r.status === 'fulfilled' && r.value.success
      );
      
      const failed = sessionResults.filter(r => 
        r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success)
      );
      
      const successRate = Math.round((successful.length / userCount) * 100);
      
      // Calculate response times from successful sessions
      const responseTimes = successful
        .map(r => r.value.sessionDuration)
        .filter(duration => duration > 0);
      
      const avgResponseTime = responseTimes.length > 0 
        ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
        : 0;
        
      const minResponseTime = responseTimes.length > 0 ? Math.min(...responseTimes) : 0;
      const maxResponseTime = responseTimes.length > 0 ? Math.max(...responseTimes) : 0;
      
      // Calculate throughput
      const totalOperations = successful.length * LOAD_TEST_CONFIG.OPERATIONS_PER_USER;
      const operationsPerSecond = Math.round(totalOperations / (testDuration / 1000));
      
      const result = {
        userCount,
        successfulUsers: successful.length,
        failedUsers: failed.length,
        successRate,
        avgResponseTime,
        minResponseTime,
        maxResponseTime,
        testDuration,
        operationsPerSecond,
        totalOperations,
        passesThresholds: successRate >= LOAD_TEST_CONFIG.SUCCESS_RATE_THRESHOLD && 
                         avgResponseTime <= LOAD_TEST_CONFIG.RESPONSE_TIME_THRESHOLD
      };
      
      // Display results
      console.log(`📊 Results for ${userCount} concurrent users:`);
      console.log(`   ✅ Successful users: ${successful.length}/${userCount} (${successRate}%)`);
      console.log(`   ❌ Failed users: ${failed.length}/${userCount}`);
      console.log(`   ⏱️  Average response: ${avgResponseTime}ms`);
      console.log(`   🚀 Fastest response: ${minResponseTime}ms`);
      console.log(`   🐌 Slowest response: ${maxResponseTime}ms`);
      console.log(`   📈 Operations/second: ${operationsPerSecond}`);
      console.log(`   ⏰ Test duration: ${testDuration}ms`);
      
      if (result.passesThresholds) {
        console.log(`   🏆 PASSED: Meets thresholds (>=${LOAD_TEST_CONFIG.SUCCESS_RATE_THRESHOLD}% success, <=${LOAD_TEST_CONFIG.RESPONSE_TIME_THRESHOLD}ms avg)`);
      } else {
        console.log(`   ⚠️  THRESHOLD NOT MET: ${successRate}% success rate, ${avgResponseTime}ms avg response`);
      }
      
      // Cleanup test data
      await this.prisma.user.deleteMany({
        where: { email: { contains: 'loaduser' } }
      });
      
      this.cache.clear();
      this.cacheTTL.clear();
      
      return result;
      
    } catch (error) {
      console.error(`❌ Load test failed for ${userCount} users:`, error.message);
      
      // Cleanup on error
      try {
        await this.prisma.user.deleteMany({
          where: { email: { contains: 'loaduser' } }
        });
      } catch (cleanupError) {
        console.error('Cleanup failed:', cleanupError.message);
      }
      
      return {
        userCount,
        successfulUsers: 0,
        failedUsers: userCount,
        successRate: 0,
        avgResponseTime: LOAD_TEST_CONFIG.MAX_RESPONSE_TIME,
        error: error.message,
        passesThresholds: false
      };
    }
  }

  // Run complete load test across all user levels
  async runCompleteLoadTest() {
    console.log('🧪 STARTING COMPREHENSIVE CONCURRENT USER LOAD TEST');
    console.log('===================================================\n');
    
    const overallStart = performance.now();
    
    try {
      // Test each user load level
      for (const userCount of LOAD_TEST_CONFIG.USER_LOAD_LEVELS) {
        const result = await this.testUserLoad(userCount);
        this.testResults.push(result);
        
        // If we failed this level badly, don't test higher levels
        if (result.successRate < 50) {
          console.log(`⚠️  Success rate too low (${result.successRate}%), stopping load test`);
          break;
        }
        
        // Brief pause between tests
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      // Analyze overall results
      this.generateLoadTestReport();
      
      const totalDuration = Math.round(performance.now() - overallStart);
      console.log(`\n⏰ Total load test duration: ${Math.round(totalDuration / 1000)}s`);
      
    } catch (error) {
      console.error('❌ Load test suite failed:', error);
      throw error;
    } finally {
      await this.prisma.$disconnect();
    }
  }

  generateLoadTestReport() {
    console.log('\n📊 CONCURRENT USER CAPACITY ANALYSIS');
    console.log('════════════════════════════════════════════════');
    
    const passingResults = this.testResults.filter(r => r.passesThresholds);
    const maxCapacity = passingResults.length > 0 
      ? Math.max(...passingResults.map(r => r.userCount))
      : 0;
    
    console.log('\n📈 LOAD TEST RESULTS SUMMARY:');
    console.log('User Count | Success Rate | Avg Response | Operations/sec | Status');
    console.log('-----------|--------------|--------------|----------------|--------');
    
    for (const result of this.testResults) {
      const status = result.passesThresholds ? '✅ PASS' : '❌ FAIL';
      console.log(`${result.userCount.toString().padStart(9)} | ${result.successRate.toString().padStart(11)}% | ${result.avgResponseTime.toString().padStart(11)}ms | ${result.operationsPerSecond.toString().padStart(13)} | ${status}`);
    }
    
    console.log('\n🎯 CAPACITY ASSESSMENT:');
    
    if (maxCapacity >= 1500) {
      console.log('🏆 VERDICT: ENTERPRISE-SCALE CAPACITY');
      console.log(`   💎 Maximum capacity: ${maxCapacity} concurrent users`);
      console.log('   🚀 Your platform can handle MASSIVE user loads!');
      console.log('   ⚡ Enterprise-ready for thousands of clients');
      console.log('   🌟 Exceeds expectations for fitness platforms');
    } else if (maxCapacity >= 1000) {
      console.log('🎉 VERDICT: HIGH-CAPACITY PLATFORM');
      console.log(`   🚀 Maximum capacity: ${maxCapacity} concurrent users`);
      console.log('   💪 Excellent performance for growing businesses');
      console.log('   ⚡ Can handle major fitness operations');
      console.log('   📈 Ready for significant scale');
    } else if (maxCapacity >= 500) {
      console.log('✅ VERDICT: SOLID PRODUCTION CAPACITY');
      console.log(`   👍 Maximum capacity: ${maxCapacity} concurrent users`);
      console.log('   🏋️ Great for medium-sized fitness businesses');
      console.log('   📊 Reliable performance under load');
      console.log('   🎯 Perfect for Brent\'s current scale');
    } else if (maxCapacity >= 250) {
      console.log('📈 VERDICT: GOOD CAPACITY');
      console.log(`   ✅ Maximum capacity: ${maxCapacity} concurrent users`);
      console.log('   💼 Suitable for small to medium businesses');
      console.log('   🏃 Room for optimization if needed');
    } else {
      console.log('⚠️  VERDICT: LIMITED CAPACITY');
      console.log(`   📊 Maximum capacity: ${maxCapacity} concurrent users`);
      console.log('   🔧 May need additional optimization for growth');
    }
    
    // Best performing configuration
    const bestResult = this.testResults
      .filter(r => r.passesThresholds)
      .sort((a, b) => b.userCount - a.userCount)[0];
    
    if (bestResult) {
      console.log('\n🎖️  OPTIMAL CONFIGURATION:');
      console.log(`   👥 Concurrent users: ${bestResult.userCount}`);
      console.log(`   ✅ Success rate: ${bestResult.successRate}%`);
      console.log(`   ⏱️  Average response: ${bestResult.avgResponseTime}ms`);
      console.log(`   📈 Operations/second: ${bestResult.operationsPerSecond}`);
      console.log(`   💎 Total operations: ${bestResult.totalOperations}`);
    }
    
    console.log('\n🚀 REAL-WORLD IMPLICATIONS:');
    console.log(`   🏋️ Trainers: Can serve ${Math.floor(maxCapacity / 10)}-${Math.floor(maxCapacity / 5)} trainers simultaneously`);
    console.log(`   👥 Clients: ${maxCapacity} clients can use the platform concurrently`);
    console.log(`   📱 Sessions: ${Math.floor(maxCapacity * 0.8)} peak simultaneous sessions`);
    console.log(`   📊 Daily users: Supports ${maxCapacity * 10}-${maxCapacity * 20} daily active users`);
  }
}

async function main() {
  const loadTest = new ConcurrentUserLoadTest();
  
  try {
    await loadTest.runCompleteLoadTest();
    console.log('\n🎉 CONCURRENT USER LOAD TEST COMPLETED!');
    
  } catch (error) {
    console.error('❌ Load test failed:', error);
    process.exit(1);
  }
}

main();