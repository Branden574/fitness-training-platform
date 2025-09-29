import { NextRequest } from 'next/server';

interface SecurityEvent {
  type: 'rate_limit' | 'auth_failure' | 'sql_injection' | 'xss_attempt' | 'csrf_failure' | 'account_lockout' | 'access_denied' | 'suspicious_activity';
  severity: 'low' | 'medium' | 'high' | 'critical';
  source: string;
  timestamp: Date;
  details: Record<string, string | number | boolean>;
  ip: string;
  userAgent?: string;
  endpoint?: string;
  userId?: string;
}

interface SecurityMetrics {
  totalThreats: number;
  blockedRequests: number;
  rateLimitHits: number;
  authFailures: number;
  injectionAttempts: number;
  xssAttempts: number;
  accountLockouts: number;
  lastUpdate: Date;
  threatsByHour: Record<string, number>;
  topAttackerIPs: Record<string, number>;
}

interface SecurityAlert {
  id: string;
  type: SecurityEvent['type'];
  severity: SecurityEvent['severity'];
  message: string;
  count: number;
  firstSeen: Date;
  lastSeen: Date;
  resolved: boolean;
  actionTaken?: string;
}

export class SecurityMonitoring {
  private static instance: SecurityMonitoring;
  private events: SecurityEvent[] = [];
  private alerts: Map<string, SecurityAlert> = new Map();
  private metrics: SecurityMetrics = {
    totalThreats: 0,
    blockedRequests: 0,
    rateLimitHits: 0,
    authFailures: 0,
    injectionAttempts: 0,
    xssAttempts: 0,
    accountLockouts: 0,
    lastUpdate: new Date(),
    threatsByHour: {},
    topAttackerIPs: {}
  };

  private readonly MAX_EVENTS = 10000; // Keep last 10k events in memory
  private readonly ALERT_THRESHOLD = {
    rate_limit: 10,
    auth_failure: 5,
    sql_injection: 1,
    xss_attempt: 1,
    csrf_failure: 3,
    account_lockout: 3,
    access_denied: 5,
    suspicious_activity: 3
  };

  public static getInstance(): SecurityMonitoring {
    if (!SecurityMonitoring.instance) {
      SecurityMonitoring.instance = new SecurityMonitoring();
    }
    return SecurityMonitoring.instance;
  }

  // Extract IP from request
  private extractIP(req: NextRequest): string {
    return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
           req.headers.get('x-real-ip') ||
           'unknown';
  }

  // Log security event
  public logSecurityEvent(
    type: SecurityEvent['type'],
    severity: SecurityEvent['severity'],
    req: NextRequest,
    details: Record<string, string | number | boolean> = {}
  ): void {
    const ip = this.extractIP(req);
    const userAgent = req.headers.get('user-agent') || 'unknown';
    const endpoint = req.nextUrl.pathname;

    const event: SecurityEvent = {
      type,
      severity,
      source: 'security-middleware',
      timestamp: new Date(),
      details,
      ip,
      userAgent,
      endpoint,
      userId: typeof details.userId === 'string' ? details.userId : undefined
    };

    // Add to events array
    this.events.push(event);
    
    // Keep only last MAX_EVENTS
    if (this.events.length > this.MAX_EVENTS) {
      this.events = this.events.slice(-this.MAX_EVENTS);
    }

    // Update metrics
    this.updateMetrics(event);

    // Check for alert conditions
    this.checkAlertConditions(event);

    // Log to console with severity-based formatting
    this.logToConsole(event);

    // Store high-severity events for analysis
    if (severity === 'high' || severity === 'critical') {
      this.storeHighSeverityEvent(event);
    }
  }

  // Update security metrics
  private updateMetrics(event: SecurityEvent): void {
    this.metrics.totalThreats++;
    this.metrics.lastUpdate = new Date();

    // Update specific counters
    switch (event.type) {
      case 'rate_limit':
        this.metrics.rateLimitHits++;
        this.metrics.blockedRequests++;
        break;
      case 'auth_failure':
        this.metrics.authFailures++;
        break;
      case 'sql_injection':
        this.metrics.injectionAttempts++;
        this.metrics.blockedRequests++;
        break;
      case 'xss_attempt':
        this.metrics.xssAttempts++;
        this.metrics.blockedRequests++;
        break;
      case 'account_lockout':
        this.metrics.accountLockouts++;
        break;
      case 'access_denied':
      case 'csrf_failure':
      case 'suspicious_activity':
        this.metrics.blockedRequests++;
        break;
    }

    // Track threats by hour
    const hour = new Date().getHours().toString();
    this.metrics.threatsByHour[hour] = (this.metrics.threatsByHour[hour] || 0) + 1;

    // Track attacker IPs
    if (event.severity === 'high' || event.severity === 'critical') {
      this.metrics.topAttackerIPs[event.ip] = (this.metrics.topAttackerIPs[event.ip] || 0) + 1;
    }
  }

  // Check if alert conditions are met
  private checkAlertConditions(event: SecurityEvent): void {
    const threshold = this.ALERT_THRESHOLD[event.type];
    
    // Count recent events of this type from this IP (last hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentEvents = this.events.filter(e => 
      e.type === event.type && 
      e.ip === event.ip && 
      e.timestamp > oneHourAgo
    );

    if (recentEvents.length >= threshold) {
      this.createOrUpdateAlert(event, recentEvents.length);
    }
  }

  // Create or update security alert
  private createOrUpdateAlert(event: SecurityEvent, count: number): void {
    const alertKey = `${event.type}-${event.ip}`;
    const existingAlert = this.alerts.get(alertKey);

    if (existingAlert) {
      // Update existing alert
      existingAlert.count = count;
      existingAlert.lastSeen = event.timestamp;
      existingAlert.severity = this.escalateSeverity(existingAlert.severity, count);
    } else {
      // Create new alert
      const alert: SecurityAlert = {
        id: alertKey,
        type: event.type,
        severity: event.severity,
        message: this.generateAlertMessage(event.type, event.ip, count),
        count,
        firstSeen: event.timestamp,
        lastSeen: event.timestamp,
        resolved: false
      };
      this.alerts.set(alertKey, alert);
    }

    // Log critical alerts
    const alert = this.alerts.get(alertKey)!;
    if (alert.severity === 'critical') {
      console.error(`🚨 CRITICAL SECURITY ALERT: ${alert.message}`);
    }
  }

  // Escalate severity based on frequency
  private escalateSeverity(currentSeverity: SecurityEvent['severity'], count: number): SecurityEvent['severity'] {
    if (count >= 50) return 'critical';
    if (count >= 20) return 'high';
    if (count >= 10) return 'medium';
    return currentSeverity;
  }

  // Generate alert message
  private generateAlertMessage(type: SecurityEvent['type'], ip: string, count: number): string {
    const messages = {
      rate_limit: `Rate limiting triggered ${count} times from IP ${ip}`,
      auth_failure: `Multiple authentication failures (${count}) from IP ${ip}`,
      sql_injection: `SQL injection attempts detected from IP ${ip}`,
      xss_attempt: `XSS attacks detected from IP ${ip}`,
      csrf_failure: `CSRF token failures from IP ${ip}`,
      account_lockout: `Account lockouts triggered from IP ${ip}`,
      access_denied: `Unauthorized access attempts from IP ${ip}`,
      suspicious_activity: `Suspicious activity patterns from IP ${ip}`
    };
    return messages[type] || `Security event (${type}) from IP ${ip}`;
  }

  // Log to console with proper formatting
  private logToConsole(event: SecurityEvent): void {
    const timestamp = event.timestamp.toISOString();
    const emoji = this.getSeverityEmoji(event.severity);
    
    const message = `${emoji} [${timestamp}] ${event.type.toUpperCase()} from ${event.ip} on ${event.endpoint}`;
    
    switch (event.severity) {
      case 'critical':
        console.error(message, event.details);
        break;
      case 'high':
        console.warn(message, event.details);
        break;
      case 'medium':
        console.log(message, event.details);
        break;
      case 'low':
        console.debug(message, event.details);
        break;
    }
  }

  // Get emoji for severity level
  private getSeverityEmoji(severity: SecurityEvent['severity']): string {
    const emojis = {
      critical: '🔴',
      high: '🟠',
      medium: '🟡',
      low: '🟢'
    };
    return emojis[severity];
  }

  // Store high-severity events for detailed analysis
  private storeHighSeverityEvent(event: SecurityEvent): void {
    // In a real application, this would write to a secure log file or database
    console.log(`📁 Storing high-severity security event:`, {
      id: `${event.timestamp.getTime()}-${event.type}-${event.ip}`,
      ...event
    });
  }

  // Get current security metrics
  public getMetrics(): SecurityMetrics {
    return { ...this.metrics };
  }

  // Get recent security events
  public getRecentEvents(limit: number = 100): SecurityEvent[] {
    return this.events.slice(-limit).reverse();
  }

  // Get active alerts
  public getActiveAlerts(): SecurityAlert[] {
    return Array.from(this.alerts.values()).filter(alert => !alert.resolved);
  }

  // Get events by type
  public getEventsByType(type: SecurityEvent['type'], hours: number = 24): SecurityEvent[] {
    const timeThreshold = new Date(Date.now() - hours * 60 * 60 * 1000);
    return this.events.filter(event => 
      event.type === type && event.timestamp > timeThreshold
    );
  }

  // Get events by IP
  public getEventsByIP(ip: string, hours: number = 24): SecurityEvent[] {
    const timeThreshold = new Date(Date.now() - hours * 60 * 60 * 1000);
    return this.events.filter(event => 
      event.ip === ip && event.timestamp > timeThreshold
    );
  }

  // Resolve alert
  public resolveAlert(alertId: string, actionTaken?: string): boolean {
    const alert = this.alerts.get(alertId);
    if (alert) {
      alert.resolved = true;
      alert.actionTaken = actionTaken;
      return true;
    }
    return false;
  }

  // Check if IP is showing suspicious patterns
  public isSuspiciousIP(ip: string): boolean {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentEvents = this.events.filter(event => 
      event.ip === ip && 
      event.timestamp > oneHourAgo &&
      (event.severity === 'high' || event.severity === 'critical')
    );

    return recentEvents.length >= 5; // 5 high/critical events in an hour
  }

  // Get security summary for dashboard
  public getSecuritySummary(): {
    totalThreats24h: number;
    criticalAlerts: number;
    blockedRequests24h: number;
    topThreats: Array<{ type: string; count: number }>;
    recentActivity: SecurityEvent[];
  } {
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recent24hEvents = this.events.filter(e => e.timestamp > last24h);
    
    // Count threats by type
    const threatCounts: Record<string, number> = {};
    recent24hEvents.forEach(event => {
      threatCounts[event.type] = (threatCounts[event.type] || 0) + 1;
    });

    const topThreats = Object.entries(threatCounts)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalThreats24h: recent24hEvents.length,
      criticalAlerts: this.getActiveAlerts().filter(a => a.severity === 'critical').length,
      blockedRequests24h: recent24hEvents.filter(e => 
        ['rate_limit', 'sql_injection', 'xss_attempt', 'access_denied', 'csrf_failure'].includes(e.type)
      ).length,
      topThreats,
      recentActivity: this.getRecentEvents(10)
    };
  }

  // Clear old events and alerts (cleanup function)
  public cleanup(daysToKeep: number = 7): void {
    const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);
    
    // Remove old events
    this.events = this.events.filter(event => event.timestamp > cutoffDate);
    
    // Remove resolved alerts older than cutoff
    for (const [key, alert] of this.alerts.entries()) {
      if (alert.resolved && alert.lastSeen < cutoffDate) {
        this.alerts.delete(key);
      }
    }

    console.log(`🧹 Security monitoring cleanup completed. Kept ${this.events.length} events and ${this.alerts.size} alerts.`);
  }
}

// Export singleton instance
export const securityMonitoring = SecurityMonitoring.getInstance();