// High-Performance Caching Layer for 1000+ Concurrent Users
class HighPerformanceCache {
  constructor() {
    this.cache = new Map();
    this.ttl = new Map();
    this.defaultTTL = 300000; // 5 minutes
    this.maxSize = 10000; // Maximum cache entries
    
    // Cleanup expired entries every minute
    setInterval(() => this.cleanup(), 60000);
    
    console.log('🚀 High-Performance Cache initialized');
  }

  set(key, value, ttl = this.defaultTTL) {
    // Implement LRU eviction if cache is full
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.delete(firstKey);
    }

    this.cache.set(key, value);
    this.ttl.set(key, Date.now() + ttl);
  }

  get(key) {
    if (!this.cache.has(key)) {
      return null;
    }

    const expiry = this.ttl.get(key);
    if (Date.now() > expiry) {
      this.delete(key);
      return null;
    }

    // Move to end (LRU behavior)
    const value = this.cache.get(key);
    this.cache.delete(key);
    this.cache.set(key, value);
    
    return value;
  }

  delete(key) {
    this.cache.delete(key);
    this.ttl.delete(key);
  }

  cleanup() {
    const now = Date.now();
    for (const [key, expiry] of this.ttl.entries()) {
      if (now > expiry) {
        this.delete(key);
      }
    }
  }

  clear() {
    this.cache.clear();
    this.ttl.clear();
  }

  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      utilizationPercent: Math.round((this.cache.size / this.maxSize) * 100)
    };
  }

  // High-level caching methods
  async cacheUserProfile(userId, fetcher) {
    const key = `user:${userId}`;
    let profile = this.get(key);
    
    if (!profile) {
      profile = await fetcher(userId);
      if (profile) {
        this.set(key, profile, 600000); // 10 minutes for user profiles
      }
    }
    
    return profile;
  }

  async cacheMacroTotals(userId, date, fetcher) {
    const key = `macros:${userId}:${date.toDateString()}`;
    let macros = this.get(key);
    
    if (!macros) {
      macros = await fetcher(userId, date);
      if (macros) {
        this.set(key, macros, 300000); // 5 minutes for macro data
      }
    }
    
    return macros;
  }

  async cacheAdminDashboard(fetcher) {
    const key = 'admin:dashboard';
    let data = this.get(key);
    
    if (!data) {
      data = await fetcher();
      if (data) {
        this.set(key, data, 60000); // 1 minute for admin dashboard
      }
    }
    
    return data;
  }

  async cacheFoodEntries(userId, page, limit, fetcher) {
    const key = `food:${userId}:${page}:${limit}`;
    let entries = this.get(key);
    
    if (!entries) {
      entries = await fetcher(userId, page, limit);
      if (entries) {
        this.set(key, entries, 180000); // 3 minutes for food entries
      }
    }
    
    return entries;
  }

  async cacheAppointments(userId, role, fetcher) {
    const key = `appointments:${userId}:${role}`;
    let appointments = this.get(key);
    
    if (!appointments) {
      appointments = await fetcher(userId, role);
      if (appointments) {
        this.set(key, appointments, 300000); // 5 minutes for appointments
      }
    }
    
    return appointments;
  }

  // Invalidation methods
  invalidateUser(userId) {
    const patterns = [`user:${userId}`, `macros:${userId}:`, `food:${userId}:`, `appointments:${userId}:`];
    
    for (const key of this.cache.keys()) {
      for (const pattern of patterns) {
        if (key.startsWith(pattern)) {
          this.delete(key);
        }
      }
    }
  }

  invalidateAdminData() {
    for (const key of this.cache.keys()) {
      if (key.startsWith('admin:')) {
        this.delete(key);
      }
    }
  }
}

// Singleton instance
const cache = new HighPerformanceCache();

module.exports = cache;