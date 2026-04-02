'use client';

import { useState, useEffect } from 'react';
import { Shield, AlertTriangle, Clock, Users, Activity, LogOut, CheckCircle, XCircle, RefreshCw, Eye } from 'lucide-react';
import { useToast } from '@/components/Toast';

interface LoginEvent {
  id: string;
  email: string;
  userId: string | null;
  success: boolean;
  ipAddress: string | null;
  userAgent: string | null;
  reason: string | null;
  createdAt: string;
}

interface ActiveSession {
  id: string;
  userId: string;
  expires: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    role: string;
    lastLogin: string | null;
    image: string | null;
  };
}

interface FlaggedAccount {
  email: string;
  failedAttempts: number;
}

interface SecurityStats {
  totalLogins30d: number;
  successfulLogins30d: number;
  failedLogins24h: number;
  activeSessions: number;
  flaggedAccountsCount: number;
}

type View = 'overview' | 'login-history' | 'sessions';

export default function SecurityTab() {
  const { toast } = useToast();
  const [view, setView] = useState<View>('overview');
  const [stats, setStats] = useState<SecurityStats | null>(null);
  const [recentEvents, setRecentEvents] = useState<LoginEvent[]>([]);
  const [flaggedAccounts, setFlaggedAccounts] = useState<FlaggedAccount[]>([]);
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [loginHistory, setLoginHistory] = useState<LoginEvent[]>([]);
  const [loginFilter, setLoginFilter] = useState<'all' | 'failed' | 'success'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOverview();
  }, []);

  useEffect(() => {
    if (view === 'sessions') fetchSessions();
    if (view === 'login-history') fetchLoginHistory();
  }, [view, loginFilter]);

  const fetchOverview = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/security?section=overview');
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
        setRecentEvents(data.recentEvents || []);
        setFlaggedAccounts(data.flaggedAccounts || []);
      }
    } catch {} finally { setLoading(false); }
  };

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/security?section=sessions');
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions || []);
      }
    } catch {} finally { setLoading(false); }
  };

  const fetchLoginHistory = async () => {
    setLoading(true);
    try {
      const filterParam = loginFilter !== 'all' ? `&filter=${loginFilter}` : '';
      const res = await fetch(`/api/admin/security?section=login-history${filterParam}`);
      if (res.ok) {
        const data = await res.json();
        setLoginHistory(data.events || []);
      }
    } catch {} finally { setLoading(false); }
  };

  const terminateSession = async (sessionId: string) => {
    try {
      const res = await fetch(`/api/admin/security?sessionId=${sessionId}`, { method: 'DELETE' });
      if (res.ok) {
        toast('Session terminated', 'success');
        setSessions(prev => prev.filter(s => s.id !== sessionId));
      } else {
        toast('Failed to terminate session', 'error');
      }
    } catch {
      toast('Error terminating session', 'error');
    }
  };

  const terminateAllUserSessions = async (userId: string, userName: string) => {
    if (!confirm(`Force sign out all sessions for ${userName}?`)) return;
    try {
      const res = await fetch(`/api/admin/security?userId=${userId}`, { method: 'DELETE' });
      if (res.ok) {
        toast(`All sessions terminated for ${userName}`, 'success');
        setSessions(prev => prev.filter(s => s.userId !== userId));
      }
    } catch {
      toast('Error terminating sessions', 'error');
    }
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const reasonLabel = (reason: string | null) => {
    if (!reason) return '';
    const map: Record<string, string> = {
      success: 'Successful login',
      invalid_password: 'Wrong password',
      user_not_found: 'Unknown email',
      account_disabled: 'Account disabled',
    };
    return map[reason] || reason;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#6366f1]/10 rounded-xl flex items-center justify-center">
            <Shield className="w-5 h-5 text-[#818cf8]" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Security Center</h2>
            <p className="text-xs text-[#6b7280]">Monitor login activity and active sessions</p>
          </div>
        </div>
        <button onClick={() => { fetchOverview(); if (view === 'sessions') fetchSessions(); if (view === 'login-history') fetchLoginHistory(); }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-[#9ca3af] bg-[#252d3d] rounded-lg hover:bg-[#2d3548] transition-colors">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* View Tabs */}
      <div className="flex gap-1 bg-[#111827] rounded-xl p-1">
        {([
          { key: 'overview' as View, label: 'Overview', icon: Eye },
          { key: 'login-history' as View, label: 'Login History', icon: Clock },
          { key: 'sessions' as View, label: 'Active Sessions', icon: Users },
        ]).map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setView(key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-colors ${
              view === key ? 'bg-[#1e2433] text-[#818cf8]' : 'text-[#6b7280] hover:text-[#9ca3af]'
            }`}>
            <Icon className="w-3.5 h-3.5" />{label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin w-6 h-6 border-2 border-[#2d3548] border-t-[#6366f1] rounded-full" />
        </div>
      ) : (
        <>
          {/* ── OVERVIEW ── */}
          {view === 'overview' && stats && (
            <div className="space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <StatCard label="Logins (30d)" value={stats.totalLogins30d} icon={<Activity className="w-4 h-4 text-[#818cf8]" />} />
                <StatCard label="Success Rate" value={stats.totalLogins30d > 0 ? `${Math.round((stats.successfulLogins30d / stats.totalLogins30d) * 100)}%` : '—'} icon={<CheckCircle className="w-4 h-4 text-green-400" />} />
                <StatCard label="Failed (24h)" value={stats.failedLogins24h} icon={<XCircle className="w-4 h-4 text-red-400" />} highlight={stats.failedLogins24h > 0} />
                <StatCard label="Active Sessions" value={stats.activeSessions} icon={<Users className="w-4 h-4 text-amber-400" />} />
              </div>

              {/* Flagged Accounts Alert */}
              {flaggedAccounts.length > 0 && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="w-5 h-5 text-red-400" />
                    <h3 className="text-sm font-semibold text-red-400">Flagged Accounts — Multiple Failed Logins</h3>
                  </div>
                  <div className="space-y-2">
                    {flaggedAccounts.map((account, i) => (
                      <div key={i} className="flex items-center justify-between bg-red-500/5 rounded-lg px-3 py-2">
                        <span className="text-sm text-white font-mono">{account.email}</span>
                        <span className="text-xs text-red-400 font-medium">{account.failedAttempts} failed attempts</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Login Events */}
              <div className="bg-[#1e2433] rounded-xl border border-[#2d3548]">
                <div className="px-5 py-4 border-b border-[#2d3548] flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white">Recent Login Activity</h3>
                  <button onClick={() => setView('login-history')} className="text-xs text-[#818cf8] hover:text-[#6366f1]">
                    View all
                  </button>
                </div>
                <div className="divide-y divide-[#2d3548]">
                  {recentEvents.slice(0, 15).map((event) => (
                    <LoginEventRow key={event.id} event={event} formatTime={formatTime} reasonLabel={reasonLabel} />
                  ))}
                  {recentEvents.length === 0 && (
                    <div className="px-5 py-8 text-center text-[#6b7280] text-sm">No login events recorded yet</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── LOGIN HISTORY ── */}
          {view === 'login-history' && (
            <div className="space-y-4">
              {/* Filter */}
              <div className="flex gap-2">
                {(['all', 'failed', 'success'] as const).map(f => (
                  <button key={f} onClick={() => setLoginFilter(f)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      loginFilter === f ? 'bg-[#6366f1] text-white' : 'bg-[#1e2433] text-[#6b7280] hover:text-[#9ca3af]'
                    }`}>
                    {f === 'all' ? 'All' : f === 'failed' ? 'Failed Only' : 'Successful Only'}
                  </button>
                ))}
              </div>

              <div className="bg-[#1e2433] rounded-xl border border-[#2d3548]">
                <div className="divide-y divide-[#2d3548]">
                  {loginHistory.map((event) => (
                    <LoginEventRow key={event.id} event={event} formatTime={formatTime} reasonLabel={reasonLabel} />
                  ))}
                  {loginHistory.length === 0 && (
                    <div className="px-5 py-8 text-center text-[#6b7280] text-sm">No events match this filter</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── ACTIVE SESSIONS ── */}
          {view === 'sessions' && (
            <div className="space-y-4">
              <div className="bg-[#1e2433] rounded-xl border border-[#2d3548]">
                <div className="px-5 py-4 border-b border-[#2d3548]">
                  <h3 className="text-sm font-semibold text-white">Active Sessions ({sessions.length})</h3>
                </div>
                <div className="divide-y divide-[#2d3548]">
                  {sessions.map((s) => (
                    <div key={s.id} className="px-5 py-4 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-[#6366f1] flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {s.user.image ? (
                            <img src={s.user.image} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-white text-xs font-semibold">{s.user.name?.charAt(0) || '?'}</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white truncate">{s.user.name || 'Unknown'}</p>
                          <p className="text-xs text-[#6b7280] truncate">{s.user.email}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                              s.user.role === 'ADMIN' ? 'bg-red-500/20 text-red-400' :
                              s.user.role === 'TRAINER' ? 'bg-indigo-500/20 text-indigo-400' :
                              'bg-green-500/20 text-green-400'
                            }`}>{s.user.role}</span>
                            <span className="text-[10px] text-[#6b7280]">
                              Expires {new Date(s.expires).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <button
                          onClick={() => terminateSession(s.id)}
                          className="px-2.5 py-1 text-xs font-medium text-red-400 bg-red-500/10 rounded-lg hover:bg-red-500/20 transition-colors"
                        >
                          End Session
                        </button>
                        <button
                          onClick={() => terminateAllUserSessions(s.userId, s.user.name || s.user.email)}
                          className="px-2.5 py-1 text-xs font-medium text-[#9ca3af] bg-[#252d3d] rounded-lg hover:bg-[#2d3548] transition-colors"
                          title="End all sessions for this user"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {sessions.length === 0 && (
                    <div className="px-5 py-8 text-center text-[#6b7280] text-sm">No active sessions</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function StatCard({ label, value, icon, highlight }: { label: string; value: string | number; icon: React.ReactNode; highlight?: boolean }) {
  return (
    <div className={`bg-[#1e2433] rounded-xl border p-4 ${highlight ? 'border-red-500/30' : 'border-[#2d3548]'}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-[#6b7280] uppercase tracking-wider">{label}</span>
        {icon}
      </div>
      <p className={`text-2xl font-bold ${highlight ? 'text-red-400' : 'text-white'}`}>{value}</p>
    </div>
  );
}

function LoginEventRow({ event, formatTime, reasonLabel }: {
  event: LoginEvent; formatTime: (d: string) => string; reasonLabel: (r: string | null) => string;
}) {
  return (
    <div className="px-5 py-3 flex items-center gap-3">
      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${event.success ? 'bg-green-400' : 'bg-red-400'}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm text-white font-mono truncate">{event.email}</p>
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${
            event.success ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
          }`}>
            {event.success ? 'OK' : 'FAIL'}
          </span>
        </div>
        <p className="text-xs text-[#6b7280]">{reasonLabel(event.reason)}</p>
      </div>
      <span className="text-xs text-[#6b7280] flex-shrink-0">{formatTime(event.createdAt)}</span>
    </div>
  );
}
