// PERFORMANCE MONITORING SETUP
// Add this to your project for tracking performance as you scale

// 1. API Response Time Middleware
// Create: src/middleware/performance.ts
import { NextRequest, NextResponse } from 'next/server';

export function performanceMiddleware(request: NextRequest) {
  const start = Date.now();
  
  return NextResponse.next({
    request: {
      headers: new Headers({
        ...request.headers,
        'x-start-time': start.toString(),
      }),
    },
  });
}

// 2. Performance Logger
// Create: src/lib/performance.ts
class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Array<{
    endpoint: string;
    method: string;
    duration: number;
    timestamp: Date;
    userId?: string;
    statusCode: number;
  }> = [];

  static getInstance() {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  logApiCall(
    endpoint: string, 
    method: string, 
    duration: number, 
    statusCode: number,
    userId?: string
  ) {
    this.metrics.push({
      endpoint,
      method,
      duration,
      statusCode,
      userId,
      timestamp: new Date()
    });

    // Keep only last 1000 metrics in memory
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }

    // Log slow queries (>500ms)
    if (duration > 500) {
      console.warn(`🐌 SLOW API CALL: ${method} ${endpoint} took ${duration}ms`);
    }

    // Log to external service in production
    if (process.env.NODE_ENV === 'production') {
      this.sendToAnalytics({
        endpoint,
        method,
        duration,
        statusCode,
        userId,
        timestamp: new Date()
      });
    }
  }

  private async sendToAnalytics(metric: any) {
    // Send to your preferred analytics service
    // Examples: Vercel Analytics, Google Analytics, DataDog, etc.
    
    // For Vercel Analytics:
    if (typeof window !== 'undefined' && (window as any).va) {
      (window as any).va('track', 'api_performance', {
        endpoint: metric.endpoint,
        duration: metric.duration,
        status: metric.statusCode
      });
    }
  }

  getMetrics() {
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    const recentMetrics = this.metrics.filter(m => m.timestamp > last24h);
    
    return {
      totalCalls: recentMetrics.length,
      averageResponseTime: recentMetrics.reduce((sum, m) => sum + m.duration, 0) / recentMetrics.length,
      slowQueries: recentMetrics.filter(m => m.duration > 500).length,
      errorRate: recentMetrics.filter(m => m.statusCode >= 400).length / recentMetrics.length,
      topEndpoints: this.getTopEndpoints(recentMetrics),
      hourlyStats: this.getHourlyStats(recentMetrics)
    };
  }

  private getTopEndpoints(metrics: any[]) {
    const endpointStats: { [key: string]: { count: number; avgDuration: number } } = {};
    
    metrics.forEach(metric => {
      const key = `${metric.method} ${metric.endpoint}`;
      if (!endpointStats[key]) {
        endpointStats[key] = { count: 0, avgDuration: 0 };
      }
      endpointStats[key].count++;
      endpointStats[key].avgDuration = 
        (endpointStats[key].avgDuration * (endpointStats[key].count - 1) + metric.duration) / 
        endpointStats[key].count;
    });

    return Object.entries(endpointStats)
      .sort(([,a], [,b]) => b.count - a.count)
      .slice(0, 10);
  }

  private getHourlyStats(metrics: any[]) {
    const hourlyStats: { [hour: string]: number } = {};
    
    metrics.forEach(metric => {
      const hour = metric.timestamp.getHours();
      hourlyStats[hour] = (hourlyStats[hour] || 0) + 1;
    });

    return hourlyStats;
  }
}

export const performanceMonitor = PerformanceMonitor.getInstance();

// 3. Add to your API routes
// Example: src/app/api/clients/route.ts
export async function GET() {
  const startTime = Date.now();
  
  try {
    // Your existing code...
    const clients = await prisma.user.findMany(/* ... */);
    
    // Log successful request
    performanceMonitor.logApiCall(
      '/api/clients',
      'GET',
      Date.now() - startTime,
      200
    );
    
    return NextResponse.json(clients);
  } catch (error) {
    // Log error
    performanceMonitor.logApiCall(
      '/api/clients',
      'GET',
      Date.now() - startTime,
      500
    );
    
    throw error;
  }
}

// 4. Performance Dashboard Component
// Create: src/components/PerformanceDashboard.tsx
'use client';

import { useState, useEffect } from 'react';
import { performanceMonitor } from '@/lib/performance';

export default function PerformanceDashboard() {
  const [metrics, setMetrics] = useState<any>(null);

  useEffect(() => {
    const updateMetrics = () => {
      setMetrics(performanceMonitor.getMetrics());
    };

    updateMetrics();
    const interval = setInterval(updateMetrics, 30000); // Update every 30s

    return () => clearInterval(interval);
  }, []);

  if (!metrics) return <div>Loading performance data...</div>;

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <h2 className="text-xl font-bold mb-4">Performance Dashboard</h2>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded">
          <h3 className="text-sm font-medium text-blue-800">Total API Calls (24h)</h3>
          <p className="text-2xl font-bold text-blue-900">{metrics.totalCalls}</p>
        </div>
        
        <div className="bg-green-50 p-4 rounded">
          <h3 className="text-sm font-medium text-green-800">Avg Response Time</h3>
          <p className="text-2xl font-bold text-green-900">
            {Math.round(metrics.averageResponseTime)}ms
          </p>
        </div>
        
        <div className="bg-yellow-50 p-4 rounded">
          <h3 className="text-sm font-medium text-yellow-800">Slow Queries</h3>
          <p className="text-2xl font-bold text-yellow-900">{metrics.slowQueries}</p>
        </div>
        
        <div className="bg-red-50 p-4 rounded">
          <h3 className="text-sm font-medium text-red-800">Error Rate</h3>
          <p className="text-2xl font-bold text-red-900">
            {(metrics.errorRate * 100).toFixed(1)}%
          </p>
        </div>
      </div>

      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3">Top API Endpoints</h3>
        <div className="space-y-2">
          {metrics.topEndpoints.map(([endpoint, stats]: [string, any]) => (
            <div key={endpoint} className="flex justify-between items-center p-2 bg-gray-50 rounded">
              <span className="font-medium">{endpoint}</span>
              <div className="text-sm text-gray-600">
                {stats.count} calls • {Math.round(stats.avgDuration)}ms avg
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-3">Performance Status</h3>
        <div className="space-y-2">
          <div className={`p-3 rounded ${
            metrics.averageResponseTime < 200 ? 'bg-green-100 text-green-800' :
            metrics.averageResponseTime < 500 ? 'bg-yellow-100 text-yellow-800' :
            'bg-red-100 text-red-800'
          }`}>
            {metrics.averageResponseTime < 200 ? '🚀 Excellent Performance' :
             metrics.averageResponseTime < 500 ? '⚠️ Good Performance' :
             '🐌 Performance Needs Attention'}
          </div>
          
          {metrics.slowQueries > 10 && (
            <div className="p-3 bg-orange-100 text-orange-800 rounded">
              ⚠️ {metrics.slowQueries} slow queries detected. Consider optimization.
            </div>
          )}
          
          {metrics.errorRate > 0.05 && (
            <div className="p-3 bg-red-100 text-red-800 rounded">
              🚨 High error rate: {(metrics.errorRate * 100).toFixed(1)}%
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// 5. Database Performance Monitoring
// Create: src/lib/db-monitor.ts
export class DatabaseMonitor {
  static async checkQueryPerformance() {
    console.log('🔍 Running database performance check...');
    
    const tests = [
      {
        name: 'User Authentication Query',
        query: () => prisma.user.findUnique({
          where: { email: 'test@example.com' },
          include: { trainer: true }
        })
      },
      {
        name: 'Trainer Clients Query',
        query: () => prisma.user.findMany({
          where: { role: 'CLIENT', trainerId: 'test-trainer-id' },
          take: 20,
          include: {
            progressEntries: { take: 5, orderBy: { date: 'desc' } },
            workoutSessions: { take: 5, orderBy: { startTime: 'desc' } }
          }
        })
      },
      {
        name: 'Food Entries Query',
        query: () => prisma.foodEntry.findMany({
          where: {
            userId: 'test-user-id',
            date: {
              gte: new Date(new Date().setHours(0, 0, 0, 0)),
              lt: new Date(new Date().setHours(23, 59, 59, 999))
            }
          }
        })
      }
    ];

    const results = [];
    
    for (const test of tests) {
      const start = Date.now();
      try {
        await test.query();
        const duration = Date.now() - start;
        results.push({
          name: test.name,
          duration,
          status: duration < 100 ? 'excellent' : duration < 300 ? 'good' : 'slow'
        });
      } catch (error) {
        results.push({
          name: test.name,
          duration: -1,
          status: 'error',
          error: error.message
        });
      }
    }

    return results;
  }
}

// 6. Add performance alerts
export function setupPerformanceAlerts() {
  const monitor = performanceMonitor;
  
  setInterval(() => {
    const metrics = monitor.getMetrics();
    
    // Alert on high average response time
    if (metrics.averageResponseTime > 1000) {
      console.warn('🚨 PERFORMANCE ALERT: Average response time is ' + 
                   Math.round(metrics.averageResponseTime) + 'ms');
      
      // Send alert to admin (implement your preferred method)
      // sendSlackAlert() or sendEmailAlert() etc.
    }
    
    // Alert on high error rate
    if (metrics.errorRate > 0.1) {
      console.warn('🚨 ERROR RATE ALERT: ' + 
                   (metrics.errorRate * 100).toFixed(1) + '% error rate');
    }
  }, 60000); // Check every minute
}

// USAGE INSTRUCTIONS:
/*
1. Add the performance monitoring to your API routes
2. Include the PerformanceDashboard component in your trainer dashboard
3. Set up alerts for production environment
4. Monitor the metrics and optimize based on the data

Key Metrics to Watch:
- Average response time should be <200ms for excellent UX
- Error rate should be <1%
- Slow queries should be <5% of total calls
- Monitor during peak hours (evenings/weekends)

This will help you maintain "damn near perfect" performance as you scale! 🚀
*/