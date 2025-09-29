// Ultra-fast result caching system for 100ms response times
class UltraFastCache {
  constructor() {
    this.cache = new Map();
    this.cacheTTL = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0
    };
    
    // Cache configuration for different data types
    this.cacheConfig = {
      USER_PROFILE: 300000,     // 5 minutes
      MACRO_TOTALS: 60000,      // 1 minute  
      DASHBOARD_STATS: 30000,   // 30 seconds
      RECENT_ENTRIES: 15000,    // 15 seconds
      USER_COUNT: 120000,       // 2 minutes
      APPOINTMENT_COUNT: 60000, // 1 minute
      FOOD_COUNT: 60000,        // 1 minute
      ACTIVE_USERS: 45000,      // 45 seconds
      TRAINER_CLIENTS: 180000   // 3 minutes
    };
    
    // Start cleanup interval
    this.startCleanupInterval();
    
    console.log('💾 Ultra-fast cache initialized');
    console.log('📊 Cache TTL config:', this.cacheConfig);
  }

  // Generate cache keys
  generateKey(type, ...params) {
    return `${type}:${params.join(':')}`;
  }

  // Get from cache with hit/miss tracking
  get(key) {
    if (this.cache.has(key)) {
      const ttl = this.cacheTTL.get(key);
      if (ttl && Date.now() > ttl) {
        // Expired
        this.cache.delete(key);
        this.cacheTTL.delete(key);
        this.stats.evictions++;
        this.stats.misses++;
        return null;
      }
      
      this.stats.hits++;
      return this.cache.get(key);
    }
    
    this.stats.misses++;
    return null;
  }

  // Set cache with TTL
  set(key, value, ttl = 60000) {
    this.cache.set(key, value);
    this.cacheTTL.set(key, Date.now() + ttl);
    this.stats.sets++;
    return value;
  }

  // Smart cache methods for specific data types
  
  // Cache user profile data
  getUserProfile(userId) {
    const key = this.generateKey('USER_PROFILE', userId);
    return this.get(key);
  }

  setUserProfile(userId, profile) {
    const key = this.generateKey('USER_PROFILE', userId);
    return this.set(key, profile, this.cacheConfig.USER_PROFILE);
  }

  // Cache macro totals
  getMacroTotals(userId, date) {
    const key = this.generateKey('MACRO_TOTALS', userId, date);
    return this.get(key);
  }

  setMacroTotals(userId, date, macros) {
    const key = this.generateKey('MACRO_TOTALS', userId, date);
    return this.set(key, macros, this.cacheConfig.MACRO_TOTALS);
  }

  // Cache dashboard statistics
  getDashboardStats(type) {
    const key = this.generateKey('DASHBOARD_STATS', type);
    return this.get(key);
  }

  setDashboardStats(type, stats) {
    const key = this.generateKey('DASHBOARD_STATS', type);
    return this.set(key, stats, this.cacheConfig.DASHBOARD_STATS);
  }

  // Cache recent entries
  getRecentEntries(userId, type, limit) {
    const key = this.generateKey('RECENT_ENTRIES', userId, type, limit);
    return this.get(key);
  }

  setRecentEntries(userId, type, limit, entries) {
    const key = this.generateKey('RECENT_ENTRIES', userId, type, limit);
    return this.set(key, entries, this.cacheConfig.RECENT_ENTRIES);
  }

  // Cache user counts
  getUserCount() {
    return this.get('USER_COUNT');
  }

  setUserCount(count) {
    return this.set('USER_COUNT', count, this.cacheConfig.USER_COUNT);
  }

  // Cache appointment counts
  getAppointmentCount() {
    return this.get('APPOINTMENT_COUNT');
  }

  setAppointmentCount(count) {
    return this.set('APPOINTMENT_COUNT', count, this.cacheConfig.APPOINTMENT_COUNT);
  }

  // Cache food entry counts
  getFoodCount() {
    return this.get('FOOD_COUNT');
  }

  setFoodCount(count) {
    return this.set('FOOD_COUNT', count, this.cacheConfig.FOOD_COUNT);
  }

  // Cache active users
  getActiveUsers() {
    return this.get('ACTIVE_USERS');
  }

  setActiveUsers(count) {
    return this.set('ACTIVE_USERS', count, this.cacheConfig.ACTIVE_USERS);
  }

  // Cache trainer clients
  getTrainerClients(trainerId) {
    const key = this.generateKey('TRAINER_CLIENTS', trainerId);
    return this.get(key);
  }

  setTrainerClients(trainerId, clients) {
    const key = this.generateKey('TRAINER_CLIENTS', trainerId);
    return this.set(key, clients, this.cacheConfig.TRAINER_CLIENTS);
  }

  // Invalidate related caches when data changes
  invalidateUserData(userId) {
    const patterns = [
      `USER_PROFILE:${userId}`,
      `MACRO_TOTALS:${userId}`,
      `RECENT_ENTRIES:${userId}`
    ];
    
    let deleted = 0;
    for (const [key] of this.cache) {
      if (patterns.some(pattern => key.startsWith(pattern))) {
        this.cache.delete(key);
        this.cacheTTL.delete(key);
        deleted++;
      }
    }
    
    this.stats.deletes += deleted;
    return deleted;
  }

  // Invalidate dashboard caches
  invalidateDashboardData() {
    const patterns = [
      'DASHBOARD_STATS',
      'USER_COUNT',
      'APPOINTMENT_COUNT',
      'FOOD_COUNT',
      'ACTIVE_USERS'
    ];
    
    let deleted = 0;
    for (const [key] of this.cache) {
      if (patterns.some(pattern => key.startsWith(pattern))) {
        this.cache.delete(key);
        this.cacheTTL.delete(key);
        deleted++;
      }
    }
    
    this.stats.deletes += deleted;
    return deleted;
  }

  // Pre-warm cache with common queries
  async warmCache(pool) {
    console.log('🔥 Warming up cache...');
    
    try {
      // Warm up common counts
      const userCountResult = await pool.executeRead(client => client.user.count());
      this.setUserCount(userCountResult.result);
      
      const appointmentCountResult = await pool.executeRead(client => client.appointment.count());
      this.setAppointmentCount(appointmentCountResult.result);
      
      const foodCountResult = await pool.executeRead(client => client.foodEntry.count());
      this.setFoodCount(foodCountResult.result);
      
      const activeUsersResult = await pool.executeRead(client => 
        client.user.count({ where: { isActive: true } })
      );
      this.setActiveUsers(activeUsersResult.result);
      
      console.log('✅ Cache warmed with common queries');
    } catch (error) {
      console.log('⚠️ Cache warming failed:', error.message);
    }
  }

  // Cleanup expired entries
  startCleanupInterval() {
    setInterval(() => {
      const now = Date.now();
      let cleaned = 0;
      
      for (const [key, ttl] of this.cacheTTL) {
        if (ttl && now > ttl) {
          this.cache.delete(key);
          this.cacheTTL.delete(key);
          cleaned++;
        }
      }
      
      if (cleaned > 0) {
        this.stats.evictions += cleaned;
        console.log(`🧹 Cleaned ${cleaned} expired cache entries`);
      }
    }, 30000); // Clean every 30 seconds
  }

  // Get cache statistics
  getStats() {
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? Math.round((this.stats.hits / totalRequests) * 100) : 0;
    
    return {
      ...this.stats,
      cacheSize: this.cache.size,
      hitRate,
      totalRequests
    };
  }

  // Clear all cache
  clear() {
    const size = this.cache.size;
    this.cache.clear();
    this.cacheTTL.clear();
    this.stats.deletes += size;
    console.log(`🧹 Cleared ${size} cache entries`);
  }

  // Get cache size and memory usage estimate
  getMemoryUsage() {
    let totalSize = 0;
    
    for (const [key, value] of this.cache) {
      totalSize += key.length * 2; // Rough estimate for string keys
      totalSize += JSON.stringify(value).length * 2; // Rough estimate for values
    }
    
    return {
      entries: this.cache.size,
      estimatedBytes: totalSize,
      estimatedMB: Math.round(totalSize / 1024 / 1024 * 100) / 100
    };
  }
}

// Global cache instance
let globalCache = null;

export function getUltraFastCache() {
  if (!globalCache) {
    globalCache = new UltraFastCache();
  }
  return globalCache;
}

export { UltraFastCache };
export default UltraFastCache;