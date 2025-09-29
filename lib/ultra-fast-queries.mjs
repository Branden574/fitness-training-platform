import { getUltraFastPool } from './ultra-fast-connection-pool.mjs';
import { getUltraFastCache } from './ultra-fast-cache.mjs';

// Ultra-fast query optimization for 100ms response times
class UltraFastQueries {
  constructor() {
    this.pool = getUltraFastPool();
    this.cache = getUltraFastCache();
    this.stats = {
      queriesExecuted: 0,
      cacheHits: 0,
      avgQueryTime: 0,
      fastQueries: 0
    };
    
    console.log('⚡ Ultra-fast queries initialized');
  }

  // Track query performance
  trackQuery(duration, cacheHit = false) {
    this.stats.queriesExecuted++;
    if (cacheHit) {
      this.stats.cacheHits++;
    }
    
    if (!cacheHit) {
      this.stats.avgQueryTime = Math.round(
        (this.stats.avgQueryTime * (this.stats.queriesExecuted - this.stats.cacheHits - 1) + duration) 
        / (this.stats.queriesExecuted - this.stats.cacheHits)
      );
      
      if (duration < 100) {
        this.stats.fastQueries++;
      }
    }
  }

  // Ultra-fast user profile query (optimized fields)
  async getUserProfile(userId) {
    const cached = this.cache.getUserProfile(userId);
    if (cached) {
      this.trackQuery(1, true);
      return cached;
    }

    const result = await this.pool.executeRead(async (client) => {
      return await client.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          createdAt: true,
          // Only essential fields for speed
        }
      });
    });

    this.trackQuery(result.duration);
    this.cache.setUserProfile(userId, result.result);
    return result.result;
  }

  // Ultra-fast macro calculation with caching
  async getMacroTotals(userId, date) {
    const dateStr = date instanceof Date ? date.toDateString() : date;
    const cached = this.cache.getMacroTotals(userId, dateStr);
    if (cached) {
      this.trackQuery(1, true);
      return cached;
    }

    const result = await this.pool.executeRead(async (client) => {
      return await client.foodEntry.aggregate({
        where: {
          userId,
          date: {
            gte: new Date(dateStr),
            lt: new Date(new Date(dateStr).getTime() + 24 * 60 * 60 * 1000)
          }
        },
        _sum: {
          calories: true,
          protein: true,
          carbs: true,
          fat: true
        }
      });
    });

    const macros = {
      calories: result.result._sum.calories || 0,
      protein: result.result._sum.protein || 0,
      carbs: result.result._sum.carbs || 0,
      fat: result.result._sum.fat || 0
    };

    this.trackQuery(result.duration);
    this.cache.setMacroTotals(userId, dateStr, macros);
    return macros;
  }

  // Ultra-fast user count with caching
  async getUserCount() {
    const cached = this.cache.getUserCount();
    if (cached !== null) {
      this.trackQuery(1, true);
      return cached;
    }

    const result = await this.pool.executeRead(async (client) => {
      return await client.user.count();
    });

    this.trackQuery(result.duration);
    this.cache.setUserCount(result.result);
    return result.result;
  }

  // Ultra-fast appointment count with caching
  async getAppointmentCount() {
    const cached = this.cache.getAppointmentCount();
    if (cached !== null) {
      this.trackQuery(1, true);
      return cached;
    }

    const result = await this.pool.executeRead(async (client) => {
      return await client.appointment.count();
    });

    this.trackQuery(result.duration);
    this.cache.setAppointmentCount(result.result);
    return result.result;
  }

  // Ultra-fast food entry count with caching
  async getFoodCount() {
    const cached = this.cache.getFoodCount();
    if (cached !== null) {
      this.trackQuery(1, true);
      return cached;
    }

    const result = await this.pool.executeRead(async (client) => {
      return await client.foodEntry.count();
    });

    this.trackQuery(result.duration);
    this.cache.setFoodCount(result.result);
    return result.result;
  }

  // Ultra-fast active users count with caching
  async getActiveUsersCount() {
    const cached = this.cache.getActiveUsers();
    if (cached !== null) {
      this.trackQuery(1, true);
      return cached;
    }

    const result = await this.pool.executeRead(async (client) => {
      return await client.user.count({
        where: { isActive: true }
      });
    });

    this.trackQuery(result.duration);
    this.cache.setActiveUsers(result.result);
    return result.result;
  }

  // Ultra-fast recent entries with caching and optimized fields
  async getRecentEntries(userId, type, limit = 5) {
    const cached = this.cache.getRecentEntries(userId, type, limit);
    if (cached) {
      this.trackQuery(1, true);
      return cached;
    }

    let result;
    
    switch (type) {
      case 'food':
        result = await this.pool.executeRead(async (client) => {
          return await client.foodEntry.findMany({
            where: { userId },
            take: limit,
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              foodName: true,
              calories: true,
              protein: true,
              carbs: true,
              fat: true,
              quantity: true,
              unit: true,
              mealType: true,
              date: true
            }
          });
        });
        break;
        
      case 'appointments':
        result = await this.pool.executeRead(async (client) => {
          return await client.appointment.findMany({
            where: { clientId: userId },
            take: limit,
            orderBy: { startTime: 'desc' },
            select: {
              id: true,
              title: true,
              startTime: true,
              endTime: true,
              status: true,
              type: true,
              trainer: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          });
        });
        break;
        
      default:
        return [];
    }

    this.trackQuery(result.duration);
    this.cache.setRecentEntries(userId, type, limit, result.result);
    return result.result;
  }

  // Ultra-fast trainer clients with caching
  async getTrainerClients(trainerId) {
    const cached = this.cache.getTrainerClients(trainerId);
    if (cached) {
      this.trackQuery(1, true);
      return cached;
    }

    const result = await this.pool.executeRead(async (client) => {
      return await client.appointment.findMany({
        where: { trainerId },
        distinct: ['clientId'],
        select: {
          client: {
            select: {
              id: true,
              name: true,
              email: true,
              isActive: true
            }
          }
        }
      });
    });

    const clients = result.result.map(apt => apt.client);
    this.trackQuery(result.duration);
    this.cache.setTrainerClients(trainerId, clients);
    return clients;
  }

  // Ultra-fast dashboard stats with parallel queries and caching
  async getDashboardStats() {
    const cacheKey = 'DASHBOARD_OVERVIEW';
    const cached = this.cache.getDashboardStats(cacheKey);
    if (cached) {
      this.trackQuery(1, true);
      return cached;
    }

    // Execute all dashboard queries in parallel for maximum speed
    const [userCount, appointmentCount, foodCount, activeUsers] = await Promise.all([
      this.getUserCount(),
      this.getAppointmentCount(), 
      this.getFoodCount(),
      this.getActiveUsersCount()
    ]);

    const stats = {
      userCount,
      appointmentCount,
      foodCount,
      activeUsers,
      generatedAt: new Date()
    };

    this.cache.setDashboardStats(cacheKey, stats);
    return stats;
  }

  // Ultra-fast user role breakdown with caching
  async getUserRoleBreakdown() {
    const cacheKey = 'USER_ROLES';
    const cached = this.cache.getDashboardStats(cacheKey);
    if (cached) {
      this.trackQuery(1, true);
      return cached;
    }

    const result = await this.pool.executeRead(async (client) => {
      return await client.user.groupBy({
        by: ['role'],
        _count: true
      });
    });

    this.trackQuery(result.duration);
    this.cache.setDashboardStats(cacheKey, result.result);
    return result.result;
  }

  // Batch macro calculations for multiple users (trainer dashboard)
  async getBatchMacroTotals(userIds, date) {
    const dateStr = date instanceof Date ? date.toDateString() : date;
    const results = {};
    const uncachedUserIds = [];

    // Check cache first
    for (const userId of userIds) {
      const cached = this.cache.getMacroTotals(userId, dateStr);
      if (cached) {
        results[userId] = cached;
        this.trackQuery(1, true);
      } else {
        uncachedUserIds.push(userId);
      }
    }

    // Batch query for uncached data
    if (uncachedUserIds.length > 0) {
      const result = await this.pool.executeRead(async (client) => {
        return await client.foodEntry.groupBy({
          by: ['userId'],
          where: {
            userId: { in: uncachedUserIds },
            date: {
              gte: new Date(dateStr),
              lt: new Date(new Date(dateStr).getTime() + 24 * 60 * 60 * 1000)
            }
          },
          _sum: {
            calories: true,
            protein: true,
            carbs: true,
            fat: true
          }
        });
      });

      this.trackQuery(result.duration);

      // Process batch results and cache
      for (const item of result.result) {
        const macros = {
          calories: item._sum.calories || 0,
          protein: item._sum.protein || 0,
          carbs: item._sum.carbs || 0,
          fat: item._sum.fat || 0
        };
        
        results[item.userId] = macros;
        this.cache.setMacroTotals(item.userId, dateStr, macros);
      }

      // Fill in zeros for users with no entries
      for (const userId of uncachedUserIds) {
        if (!results[userId]) {
          const emptyMacros = { calories: 0, protein: 0, carbs: 0, fat: 0 };
          results[userId] = emptyMacros;
          this.cache.setMacroTotals(userId, dateStr, emptyMacros);
        }
      }
    }

    return results;
  }

  // Invalidate caches when data changes
  invalidateUserCaches(userId) {
    this.cache.invalidateUserData(userId);
    console.log(`🧹 Invalidated caches for user ${userId}`);
  }

  invalidateDashboardCaches() {
    this.cache.invalidateDashboardData();
    console.log('🧹 Invalidated dashboard caches');
  }

  // Get query performance stats
  getStats() {
    const cacheStats = this.cache.getStats();
    const totalQueries = this.stats.queriesExecuted;
    const cacheHitRate = totalQueries > 0 ? Math.round((this.stats.cacheHits / totalQueries) * 100) : 0;
    const fastQueryRate = totalQueries > 0 ? Math.round((this.stats.fastQueries / (totalQueries - this.stats.cacheHits)) * 100) : 0;

    return {
      ...this.stats,
      cacheHitRate,
      fastQueryRate,
      cacheStats
    };
  }
}

// Database indexing recommendations for ultra-fast queries
const RECOMMENDED_INDEXES = [
  // User queries
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_active ON "User"(is_active) WHERE is_active = true;',
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_role ON "User"(role);',
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_email ON "User"(email);',
  
  // Food entry queries (most critical for macro calculations)
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_food_entry_user_date ON "FoodEntry"(user_id, date);',
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_food_entry_date ON "FoodEntry"(date);',
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_food_entry_user_created ON "FoodEntry"(user_id, created_at);',
  
  // Appointment queries
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointment_client ON "Appointment"(client_id);',
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointment_trainer ON "Appointment"(trainer_id);',
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointment_status ON "Appointment"(status, start_time);',
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointment_start_time ON "Appointment"(start_time);',
  
  // Composite indexes for complex queries
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointment_trainer_client ON "Appointment"(trainer_id, client_id);',
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_food_entry_user_meal ON "FoodEntry"(user_id, meal_type, date);'
];

// Global instance
let globalQueries = null;

export function getUltraFastQueries() {
  if (!globalQueries) {
    globalQueries = new UltraFastQueries();
  }
  return globalQueries;
}

export { UltraFastQueries, RECOMMENDED_INDEXES };
export default UltraFastQueries;