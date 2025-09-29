import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth';
import { securityMonitoring } from '../../../../../lib/security/security-monitoring';
import { SecurityTesting } from '../../../../../lib/security/security-testing';

export async function GET(request: NextRequest) {
  try {
    // Check authentication and admin role
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'metrics':
        return NextResponse.json({
          success: true,
          data: securityMonitoring.getMetrics()
        });

      case 'recent-events':
        const limit = parseInt(searchParams.get('limit') || '50');
        return NextResponse.json({
          success: true,
          data: securityMonitoring.getRecentEvents(limit)
        });

      case 'alerts':
        return NextResponse.json({
          success: true,
          data: securityMonitoring.getActiveAlerts()
        });

      case 'summary':
        return NextResponse.json({
          success: true,
          data: securityMonitoring.getSecuritySummary()
        });

      case 'events-by-type':
        const type = searchParams.get('type') as 'rate_limit' | 'auth_failure' | 'sql_injection' | 'xss_attempt' | 'csrf_failure' | 'account_lockout' | 'access_denied' | 'suspicious_activity';
        const hours = parseInt(searchParams.get('hours') || '24');
        if (!type) {
          return NextResponse.json(
            { error: 'Type parameter required' },
            { status: 400 }
          );
        }
        return NextResponse.json({
          success: true,
          data: securityMonitoring.getEventsByType(type, hours)
        });

      case 'events-by-ip':
        const ip = searchParams.get('ip');
        const ipHours = parseInt(searchParams.get('hours') || '24');
        if (!ip) {
          return NextResponse.json(
            { error: 'IP parameter required' },
            { status: 400 }
          );
        }
        return NextResponse.json({
          success: true,
          data: securityMonitoring.getEventsByIP(ip, ipHours)
        });

      case 'run-security-audit':
        const auditReport = await SecurityTesting.runFullSecurityAudit();
        return NextResponse.json({
          success: true,
          data: auditReport
        });

      case 'penetration-test':
        const penTestResults = await SecurityTesting.simulatePenetrationTest();
        return NextResponse.json({
          success: true,
          data: penTestResults
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action parameter' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Security API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication and admin role
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'resolve-alert':
        const { alertId, actionTaken } = body;
        if (!alertId) {
          return NextResponse.json(
            { error: 'Alert ID required' },
            { status: 400 }
          );
        }
        
        const resolved = securityMonitoring.resolveAlert(alertId, actionTaken);
        return NextResponse.json({
          success: resolved,
          message: resolved ? 'Alert resolved successfully' : 'Alert not found'
        });

      case 'cleanup':
        const { daysToKeep } = body;
        securityMonitoring.cleanup(daysToKeep || 7);
        return NextResponse.json({
          success: true,
          message: 'Security monitoring data cleaned up'
        });

      case 'log-event':
        const { type, severity, details } = body;
        if (!type || !severity) {
          return NextResponse.json(
            { error: 'Type and severity required' },
            { status: 400 }
          );
        }
        
        securityMonitoring.logSecurityEvent(type, severity, request, details || {});
        return NextResponse.json({
          success: true,
          message: 'Security event logged'
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action parameter' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Security API POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}