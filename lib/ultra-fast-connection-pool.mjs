import { PrismaClient } from '@prisma/client';

// Ultra-fast connection pool configuration for 100ms response times
const ULTRA_FAST_CONFIG = {
  CONNECTION_LIMIT: 40,        // Increased from 25-30
  POOL_TIMEOUT: 2,            // Reduced from 5
  CONNECT_TIMEOUT: 3,         // Reduced from 10
  STATEMENT_TIMEOUT: 8000,    // Reduced from 15000
  IDLE_TIMEOUT: 120,          // Reduced from 300
  MAX_RETRIES: 2,
  RETRY_DELAY: 100
};

class UltraFastConnectionPool {
  constructor() {
    this.pools = new Map();
    this.connectionSemaphore = new Array(ULTRA_FAST_CONFIG.CONNECTION_LIMIT - 5).fill(true);
    this.activeConnections = 0;
    this.stats = {
      connectionsCreated: 0,
      connectionsDestroyed: 0,
      queryCount: 0,
      avgQueryTime: 0,
      fastQueries: 0,
      slowQueries: 0
    };
    
    console.log('⚡ Ultra-fast connection pool initialized');
    console.log(`📊 Pool size: ${ULTRA_FAST_CONFIG.CONNECTION_LIMIT} connections`);
  }

  // Create optimized Prisma client for ultra-fast operations
  createOptimizedClient(poolId = 'default') {
    if (this.pools.has(poolId)) {
      return this.pools.get(poolId);
    }

    const optimizedUrl = `postgresql://postgres:iE27%26%2BnQ7VdHp8%23@db.zqgaogztrxzsevimqelr.supabase.co:5432/postgres?connection_limit=${ULTRA_FAST_CONFIG.CONNECTION_LIMIT}&pool_timeout=${ULTRA_FAST_CONFIG.POOL_TIMEOUT}&connect_timeout=${ULTRA_FAST_CONFIG.CONNECT_TIMEOUT}&statement_timeout=${ULTRA_FAST_CONFIG.STATEMENT_TIMEOUT}&idle_timeout=${ULTRA_FAST_CONFIG.IDLE_TIMEOUT}`;

    const client = new PrismaClient({
      datasources: {
        db: { url: optimizedUrl }
      },
      log: [], // Disable logging for speed
      errorFormat: 'minimal',
    });

    this.pools.set(poolId, client);
    this.stats.connectionsCreated++;
    
    console.log(`✅ Created optimized pool: ${poolId}`);
    return client;
  }

  // Smart connection acquisition with semaphore
  async acquireConnection() {
    let retries = 0;
    
    while (this.connectionSemaphore.length === 0 && retries < ULTRA_FAST_CONFIG.MAX_RETRIES) {
      await new Promise(resolve => setTimeout(resolve, ULTRA_FAST_CONFIG.RETRY_DELAY));
      retries++;
    }
    
    if (this.connectionSemaphore.length === 0) {
      throw new Error('Connection pool exhausted');
    }
    
    this.activeConnections++;
    return this.connectionSemaphore.pop();
  }

  // Fast connection release
  releaseConnection(token) {
    this.activeConnections--;
    this.connectionSemaphore.push(token);
  }

  // Ultra-fast query execution with performance tracking
  async executeUltraFast(query, poolId = 'default') {
    const client = this.createOptimizedClient(poolId);
    const token = await this.acquireConnection();
    const startTime = performance.now();
    
    try {
      const result = await query(client);
      const duration = Math.round(performance.now() - startTime);
      
      // Track performance stats
      this.stats.queryCount++;
      this.stats.avgQueryTime = Math.round(
        (this.stats.avgQueryTime * (this.stats.queryCount - 1) + duration) / this.stats.queryCount
      );
      
      if (duration < 100) {
        this.stats.fastQueries++;
      } else {
        this.stats.slowQueries++;
      }
      
      return { result, duration };
    } catch (error) {
      console.error('⚠️ Query failed:', error.message);
      throw error;
    } finally {
      this.releaseConnection(token);
    }
  }

  // Specialized pool for read operations
  async executeRead(query) {
    return this.executeUltraFast(query, 'read');
  }

  // Specialized pool for write operations
  async executeWrite(query) {
    return this.executeUltraFast(query, 'write');
  }

  // Get pool statistics
  getStats() {
    const fastQueryPercent = this.stats.queryCount > 0 
      ? Math.round((this.stats.fastQueries / this.stats.queryCount) * 100)
      : 0;

    return {
      ...this.stats,
      activeConnections: this.activeConnections,
      availableConnections: this.connectionSemaphore.length,
      fastQueryPercent,
      poolUtilization: Math.round((this.activeConnections / ULTRA_FAST_CONFIG.CONNECTION_LIMIT) * 100)
    };
  }

  // Cleanup all connections
  async cleanup() {
    console.log('🧹 Cleaning up connection pools...');
    
    for (const [poolId, client] of this.pools) {
      try {
        await client.$disconnect();
        this.stats.connectionsDestroyed++;
        console.log(`✅ Disconnected pool: ${poolId}`);
      } catch (error) {
        console.error(`⚠️ Error disconnecting pool ${poolId}:`, error.message);
      }
    }
    
    this.pools.clear();
    console.log('🎉 All pools cleaned up');
  }

  // Pre-warm connections for faster first queries
  async warmupConnections() {
    console.log('🔥 Warming up connections...');
    
    const warmupPromises = ['read', 'write', 'default'].map(async (poolId) => {
      const client = this.createOptimizedClient(poolId);
      try {
        await client.user.findFirst(); // Simple query to establish connection
        console.log(`✅ Warmed up ${poolId} pool`);
      } catch (error) {
        console.log(`⚠️ Warmup failed for ${poolId}:`, error.message);
      }
    });
    
    await Promise.all(warmupPromises);
    console.log('🚀 Connection warmup complete');
  }
}

// Global instance for reuse
let globalPool = null;

export function getUltraFastPool() {
  if (!globalPool) {
    globalPool = new UltraFastConnectionPool();
  }
  return globalPool;
}

export async function initializeUltraFastPool() {
  const pool = getUltraFastPool();
  await pool.warmupConnections();
  return pool;
}

export { UltraFastConnectionPool };
export default UltraFastConnectionPool;