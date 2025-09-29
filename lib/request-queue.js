// High-Throughput Request Queue and Rate Limiting System
class RequestQueue {
  constructor(options = {}) {
    this.maxConcurrency = options.maxConcurrency || 100;
    this.maxQueueSize = options.maxQueueSize || 10000;
    this.requestTimeout = options.requestTimeout || 30000; // 30 seconds
    
    this.queue = [];
    this.running = new Set();
    this.stats = {
      processed: 0,
      failed: 0,
      queued: 0,
      rejected: 0,
      avgProcessingTime: 0
    };
    
    console.log(`🚀 Request Queue initialized: ${this.maxConcurrency} concurrent, ${this.maxQueueSize} queue size`);
  }

  async add(task, priority = 0) {
    return new Promise((resolve, reject) => {
      if (this.queue.length >= this.maxQueueSize) {
        this.stats.rejected++;
        reject(new Error('Queue full - request rejected'));
        return;
      }

      const request = {
        task,
        priority,
        resolve,
        reject,
        createdAt: Date.now(),
        timeout: setTimeout(() => {
          this.stats.failed++;
          reject(new Error('Request timeout'));
        }, this.requestTimeout)
      };

      // Insert based on priority (higher priority first)
      const insertIndex = this.queue.findIndex(item => item.priority < priority);
      if (insertIndex === -1) {
        this.queue.push(request);
      } else {
        this.queue.splice(insertIndex, 0, request);
      }

      this.stats.queued++;
      this.processNext();
    });
  }

  async processNext() {
    if (this.running.size >= this.maxConcurrency || this.queue.length === 0) {
      return;
    }

    const request = this.queue.shift();
    this.stats.queued--;
    
    const requestId = Symbol('request');
    this.running.add(requestId);

    const startTime = Date.now();

    try {
      const result = await request.task();
      
      clearTimeout(request.timeout);
      request.resolve(result);
      
      this.stats.processed++;
      this.updateAvgProcessingTime(Date.now() - startTime);
      
    } catch (error) {
      clearTimeout(request.timeout);
      request.reject(error);
      this.stats.failed++;
      
    } finally {
      this.running.delete(requestId);
      this.processNext(); // Process next item in queue
    }
  }

  updateAvgProcessingTime(processingTime) {
    const totalProcessed = this.stats.processed;
    this.stats.avgProcessingTime = ((this.stats.avgProcessingTime * (totalProcessed - 1)) + processingTime) / totalProcessed;
  }

  getStats() {
    return {
      ...this.stats,
      queueLength: this.queue.length,
      runningTasks: this.running.size,
      maxConcurrency: this.maxConcurrency,
      utilizationPercent: Math.round((this.running.size / this.maxConcurrency) * 100)
    };
  }

  clear() {
    // Reject all queued requests
    while (this.queue.length > 0) {
      const request = this.queue.shift();
      clearTimeout(request.timeout);
      request.reject(new Error('Queue cleared'));
    }
    
    this.stats.queued = 0;
  }
}

// Rate Limiter for API endpoints
class RateLimiter {
  constructor(options = {}) {
    this.windowMs = options.windowMs || 60000; // 1 minute
    this.maxRequests = options.maxRequests || 1000; // 1000 requests per minute
    this.keyGenerator = options.keyGenerator || ((req) => req.ip || 'global');
    
    this.windows = new Map();
    
    // Cleanup old windows every minute
    setInterval(() => this.cleanup(), this.windowMs);
    
    console.log(`🚀 Rate Limiter initialized: ${this.maxRequests} requests per ${this.windowMs}ms`);
  }

  check(identifier) {
    const key = typeof identifier === 'string' ? identifier : this.keyGenerator(identifier);
    const now = Date.now();
    const windowStart = Math.floor(now / this.windowMs) * this.windowMs;

    if (!this.windows.has(key)) {
      this.windows.set(key, new Map());
    }

    const userWindows = this.windows.get(key);
    const currentCount = userWindows.get(windowStart) || 0;

    if (currentCount >= this.maxRequests) {
      return {
        allowed: false,
        remainingRequests: 0,
        resetTime: windowStart + this.windowMs
      };
    }

    userWindows.set(windowStart, currentCount + 1);

    return {
      allowed: true,
      remainingRequests: this.maxRequests - currentCount - 1,
      resetTime: windowStart + this.windowMs
    };
  }

  cleanup() {
    const now = Date.now();
    const cutoff = now - this.windowMs * 2; // Keep 2 windows

    for (const [userId, windows] of this.windows.entries()) {
      for (const [windowStart] of windows.entries()) {
        if (windowStart < cutoff) {
          windows.delete(windowStart);
        }
      }
      
      if (windows.size === 0) {
        this.windows.delete(userId);
      }
    }
  }

  getStats() {
    return {
      activeUsers: this.windows.size,
      totalWindows: Array.from(this.windows.values()).reduce((sum, windows) => sum + windows.size, 0)
    };
  }
}

// Circuit Breaker for database operations
class CircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.resetTimeout = options.resetTimeout || 60000; // 1 minute
    this.monitoringPeriod = options.monitoringPeriod || 120000; // 2 minutes
    
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.failures = 0;
    this.lastFailureTime = null;
    this.nextAttempt = null;
    
    console.log('🚀 Circuit Breaker initialized');
  }

  async execute(operation) {
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        throw new Error('Circuit breaker is OPEN');
      } else {
        this.state = 'HALF_OPEN';
      }
    }

    try {
      const result = await operation();
      
      if (this.state === 'HALF_OPEN') {
        this.state = 'CLOSED';
        this.failures = 0;
      }
      
      return result;
      
    } catch (error) {
      this.failures++;
      this.lastFailureTime = Date.now();
      
      if (this.failures >= this.failureThreshold) {
        this.state = 'OPEN';
        this.nextAttempt = Date.now() + this.resetTimeout;
      }
      
      throw error;
    }
  }

  getState() {
    return {
      state: this.state,
      failures: this.failures,
      lastFailureTime: this.lastFailureTime,
      nextAttempt: this.nextAttempt
    };
  }
}

module.exports = {
  RequestQueue,
  RateLimiter,
  CircuitBreaker
};