import { getUltraFastQueries } from './ultra-fast-queries.mjs';
import { getUltraFastCache } from './ultra-fast-cache.mjs';

// Background job system for pre-computing data for 100ms response times
class UltraFastPrecompute {
  constructor() {
    this.queries = getUltraFastQueries();
    this.cache = getUltraFastCache();
    this.jobs = new Map();
    this.isRunning = false;
    this.stats = {
      jobsExecuted: 0,
      precomputedItems: 0,
      avgPrecomputeTime: 0,
      lastRunTime: null,
      errors: 0
    };
    
    // Job configuration for optimal performance
    this.jobConfig = {
      MACRO_PRECOMPUTE: {
        interval: 60000,  // 1 minute
        description: 'Pre-compute macro totals for active users'
      },
      DASHBOARD_PRECOMPUTE: {
        interval: 30000,  // 30 seconds  
        description: 'Pre-compute dashboard statistics'
      },
      USER_STATS_PRECOMPUTE: {
        interval: 120000, // 2 minutes
        description: 'Pre-compute user statistics and counts'
      },
      TRAINER_DATA_PRECOMPUTE: {
        interval: 180000, // 3 minutes
        description: 'Pre-compute trainer client relationships'
      }
    };
    
    console.log('🤖 Ultra-fast pre-compute system initialized');
    console.log('📋 Pre-compute jobs:', Object.keys(this.jobConfig));
  }

  // Start background job system
  start() {
    if (this.isRunning) {
      console.log('⚠️ Pre-compute system already running');
      return;
    }
    
    this.isRunning = true;
    console.log('🚀 Starting ultra-fast pre-compute jobs...');
    
    // Start each job type
    for (const [jobType, config] of Object.entries(this.jobConfig)) {
      this.startJob(jobType, config);
    }
    
    // Start cache warming job (runs once on startup then periodically)
    this.startCacheWarming();
    
    console.log('✅ All pre-compute jobs started');
  }

  // Stop background job system
  stop() {
    if (!this.isRunning) {
      console.log('⚠️ Pre-compute system not running');
      return;
    }
    
    this.isRunning = false;
    
    // Clear all intervals
    for (const [jobType, intervalId] of this.jobs) {
      clearInterval(intervalId);
      console.log(`🛑 Stopped job: ${jobType}`);
    }
    
    this.jobs.clear();
    console.log('✅ All pre-compute jobs stopped');
  }

  // Start individual job
  startJob(jobType, config) {
    const intervalId = setInterval(async () => {
      if (!this.isRunning) return;
      
      const startTime = performance.now();
      
      try {
        switch (jobType) {
          case 'MACRO_PRECOMPUTE':
            await this.precomputeMacros();
            break;
          case 'DASHBOARD_PRECOMPUTE':
            await this.precomputeDashboard();
            break;
          case 'USER_STATS_PRECOMPUTE':
            await this.precomputeUserStats();
            break;
          case 'TRAINER_DATA_PRECOMPUTE':
            await this.precomputeTrainerData();
            break;
        }
        
        const duration = Math.round(performance.now() - startTime);
        this.trackJob(duration);
        
        console.log(`✅ ${jobType} completed in ${duration}ms`);
        
      } catch (error) {
        this.stats.errors++;
        console.error(`❌ ${jobType} failed:`, error.message);
      }
    }, config.interval);
    
    this.jobs.set(jobType, intervalId);
    console.log(`🔄 Started ${jobType}: ${config.description} (every ${config.interval/1000}s)`);
  }

  // Track job performance
  trackJob(duration) {
    this.stats.jobsExecuted++;
    this.stats.avgPrecomputeTime = Math.round(
      (this.stats.avgPrecomputeTime * (this.stats.jobsExecuted - 1) + duration) / this.stats.jobsExecuted
    );
    this.stats.lastRunTime = new Date();
  }

  // Pre-compute macro totals for active users
  async precomputeMacros() {
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString();
    
    // Get active users
    const activeUsers = await this.queries.pool.executeRead(async (client) => {
      return await client.user.findMany({
        where: { isActive: true },
        select: { id: true },
        take: 100 // Limit for performance
      });
    });

    const userIds = activeUsers.result.map(user => user.id);
    
    // Pre-compute macros for today and yesterday in batches
    const dates = [today, yesterday];
    let precomputedCount = 0;
    
    for (const date of dates) {
      const macroResults = await this.queries.getBatchMacroTotals(userIds, date);
      precomputedCount += Object.keys(macroResults).length;
    }
    
    this.stats.precomputedItems += precomputedCount;
    console.log(`📊 Pre-computed ${precomputedCount} macro totals`);
  }

  // Pre-compute dashboard statistics
  async precomputeDashboard() {
    // Pre-compute all dashboard stats
    const dashboardStats = await this.queries.getDashboardStats();
    const userRoles = await this.queries.getUserRoleBreakdown();
    
    // Cache additional dashboard metrics
    const recentUsersResult = await this.queries.pool.executeRead(async (client) => {
      return await client.user.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true
        }
      });
    });

    this.cache.setDashboardStats('RECENT_USERS', recentUsersResult.result);
    
    const recentAppointmentsResult = await this.queries.pool.executeRead(async (client) => {
      return await client.appointment.findMany({
        take: 5,
        orderBy: { startTime: 'desc' },
        select: {
          id: true,
          title: true,
          startTime: true,
          status: true,
          client: {
            select: { name: true }
          },
          trainer: {
            select: { name: true }
          }
        }
      });
    });

    this.cache.setDashboardStats('RECENT_APPOINTMENTS', recentAppointmentsResult.result);
    
    this.stats.precomputedItems += 3; // dashboardStats, userRoles, recent items
    console.log('📈 Pre-computed dashboard statistics');
  }

  // Pre-compute user statistics
  async precomputeUserStats() {
    // Pre-compute various user counts and statistics
    const [totalUsers, activeUsers, trainerCount, clientCount] = await Promise.all([
      this.queries.getUserCount(),
      this.queries.getActiveUsersCount(),
      this.queries.pool.executeRead(client => client.user.count({ where: { role: 'TRAINER' } })),
      this.queries.pool.executeRead(client => client.user.count({ where: { role: 'CLIENT' } }))
    ]);

    // Cache additional user stats
    this.cache.setDashboardStats('TRAINER_COUNT', trainerCount.result);
    this.cache.setDashboardStats('CLIENT_COUNT', clientCount.result);
    
    // Pre-compute user growth (new users last 7 days)
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const newUsersResult = await this.queries.pool.executeRead(async (client) => {
      return await client.user.count({
        where: {
          createdAt: { gte: weekAgo }
        }
      });
    });

    this.cache.setDashboardStats('NEW_USERS_WEEK', newUsersResult.result);
    
    this.stats.precomputedItems += 3;
    console.log('👥 Pre-computed user statistics');
  }

  // Pre-compute trainer-specific data
  async precomputeTrainerData() {
    // Get all trainers
    const trainersResult = await this.queries.pool.executeRead(async (client) => {
      return await client.user.findMany({
        where: { role: 'TRAINER', isActive: true },
        select: { id: true },
        take: 50 // Limit for performance
      });
    });

    const trainers = trainersResult.result;
    
    // Pre-compute client lists for each trainer
    for (const trainer of trainers) {
      await this.queries.getTrainerClients(trainer.id);
    }
    
    // Pre-compute appointment counts by trainer
    const trainerAppointmentCounts = await this.queries.pool.executeRead(async (client) => {
      return await client.appointment.groupBy({
        by: ['trainerId'],
        _count: true,
        where: {
          startTime: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
          }
        }
      });
    });

    for (const item of trainerAppointmentCounts.result) {
      this.cache.setDashboardStats(`TRAINER_APPOINTMENTS_${item.trainerId}`, item._count);
    }
    
    this.stats.precomputedItems += trainers.length + trainerAppointmentCounts.result.length;
    console.log(`👨‍🏫 Pre-computed data for ${trainers.length} trainers`);
  }

  // Cache warming job
  startCacheWarming() {
    // Run immediately
    this.warmCache();
    
    // Then run every 10 minutes
    const warmingInterval = setInterval(() => {
      if (!this.isRunning) return;
      this.warmCache();
    }, 600000); // 10 minutes
    
    this.jobs.set('CACHE_WARMING', warmingInterval);
    console.log('🔥 Started cache warming job (every 10 minutes)');
  }

  // Warm cache with common queries
  async warmCache() {
    try {
      console.log('🔥 Warming cache...');
      
      // Warm common counts
      await Promise.all([
        this.queries.getUserCount(),
        this.queries.getAppointmentCount(),
        this.queries.getFoodCount(),
        this.queries.getActiveUsersCount(),
        this.queries.getUserRoleBreakdown()
      ]);
      
      // Warm recent entries for a few active users
      const activeUsersResult = await this.queries.pool.executeRead(async (client) => {
        return await client.user.findMany({
          where: { isActive: true },
          select: { id: true },
          take: 10
        });
      });

      const warmingPromises = activeUsersResult.result.map(user => 
        Promise.all([
          this.queries.getRecentEntries(user.id, 'food', 5),
          this.queries.getRecentEntries(user.id, 'appointments', 3),
          this.queries.getMacroTotals(user.id, new Date().toDateString())
        ])
      );

      await Promise.all(warmingPromises);
      
      console.log('✅ Cache warming completed');
    } catch (error) {
      console.error('⚠️ Cache warming failed:', error.message);
    }
  }

  // Manual trigger for immediate pre-computation
  async runAllJobsNow() {
    console.log('🚀 Running all pre-compute jobs immediately...');
    
    const startTime = performance.now();
    
    try {
      await Promise.all([
        this.precomputeMacros(),
        this.precomputeDashboard(), 
        this.precomputeUserStats(),
        this.precomputeTrainerData()
      ]);
      
      const duration = Math.round(performance.now() - startTime);
      console.log(`✅ All jobs completed in ${duration}ms`);
      
    } catch (error) {
      console.error('❌ Manual job run failed:', error.message);
    }
  }

  // Get pre-compute statistics
  getStats() {
    const cacheStats = this.cache.getStats();
    
    return {
      ...this.stats,
      isRunning: this.isRunning,
      activeJobs: this.jobs.size,
      cacheStats,
      jobsConfigured: Object.keys(this.jobConfig).length
    };
  }

  // Health check
  isHealthy() {
    const stats = this.getStats();
    return {
      healthy: this.isRunning && stats.errors < 10,
      issues: this.isRunning ? 
        (stats.errors >= 10 ? ['High error rate'] : []) :
        ['Not running']
    };
  }
}

// Global instance
let globalPrecompute = null;

export function getUltraFastPrecompute() {
  if (!globalPrecompute) {
    globalPrecompute = new UltraFastPrecompute();
  }
  return globalPrecompute;
}

export async function initializePrecompute() {
  const precompute = getUltraFastPrecompute();
  precompute.start();
  
  // Run all jobs immediately for instant caching
  await precompute.runAllJobsNow();
  
  return precompute;
}

export { UltraFastPrecompute };
export default UltraFastPrecompute;