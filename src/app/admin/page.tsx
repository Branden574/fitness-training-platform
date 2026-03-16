'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { motion } from 'framer-motion';
import LoadingSpinner from '@/components/LoadingSpinner';

interface User {
  id: string;
  name: string | null;
  email: string;
  role: string;
  createdAt: string;
  hasProfile: boolean;
  isActive: boolean;
  lastLogin: string | null;
  loginCount: number;
  _count: {
    foodEntries: number;
    clientAppointments: number;
    progressEntries: number;
    workoutSessions: number;
  };
}

interface ContactSubmission {
  id: string;
  name: string;
  email: string;
  phone?: string;
  message: string;
  status: string;
  createdAt: string;
}

interface Invitation {
  id: string;
  email: string;
  code: string;
  status: string;
  expiresAt: string;
  createdAt: string;
  inviter: {
    name: string;
    email: string;
  };
}

interface AdminData {
  users: User[];
  contactSubmissions: ContactSubmission[];
  invitations: Invitation[];
}

interface AdminStats {
  totalUsers: number;
  activeClients: number;
  totalTrainers: number;
  totalAppointments: number;
  totalFoodEntries: number;
  totalWorkoutSessions: number;
  totalProgressEntries: number;
  totalMessages: number;
  totalContactSubmissions: number;
  newContactSubmissions: number;
  pendingInvitations: number;
  recentActivity: User[];
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const [adminData, setAdminData] = useState<AdminData | null>(null);
  const [adminStats, setAdminStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'contacts' | 'invitations'>('dashboard');
  const [newInviteEmail, setNewInviteEmail] = useState('');
  const [sendingInvite, setSendingInvite] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [contactStatusFilter, setContactStatusFilter] = useState<string>('ALL');

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.role === 'ADMIN') {
      fetchAdminData();
      fetchAdminStats();
    }
  }, [status, session]);

  const fetchAdminData = async () => {
    try {
      const response = await fetch('/api/admin');
      if (response.ok) {
        const data = await response.json();
        setAdminData(data);
      }
    } catch (error) {
      console.error('Failed to fetch admin data:', error);
    }
  };

  const fetchAdminStats = async () => {
    try {
      const response = await fetch('/api/admin/dashboard');
      if (response.ok) {
        const data = await response.json();
        setAdminStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch admin stats:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filtered users for the Users tab
  const filteredUsers = useMemo(() => {
    if (!adminStats?.recentActivity) return [];
    return adminStats.recentActivity.filter(user => {
      const matchesSearch = searchQuery === '' ||
        (user.name?.toLowerCase().includes(searchQuery.toLowerCase())) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRole = roleFilter === 'ALL' || user.role === roleFilter;
      const matchesStatus = statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && user.isActive) ||
        (statusFilter === 'INACTIVE' && !user.isActive);
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [adminStats?.recentActivity, searchQuery, roleFilter, statusFilter]);

  // Filtered contacts
  const filteredContacts = useMemo(() => {
    if (!adminData?.contactSubmissions) return [];
    if (contactStatusFilter === 'ALL') return adminData.contactSubmissions;
    return adminData.contactSubmissions.filter(s => s.status === contactStatusFilter);
  }, [adminData?.contactSubmissions, contactStatusFilter]);

  const deleteUser = async (userId: string, userName: string, userEmail: string) => {
    const firstConfirm = confirm(
      `WARNING: DELETE USER PERMANENTLY\n\n` +
      `User: ${userName} (${userEmail})\n\n` +
      `This will PERMANENTLY DELETE:\n` +
      `- User account and login access\n` +
      `- All workout sessions and progress\n` +
      `- All appointments and schedules\n` +
      `- All food entries and nutrition data\n` +
      `- All messages and notifications\n\n` +
      `THIS CANNOT BE UNDONE!\n\nContinue with deletion?`
    );
    if (!firstConfirm) return;

    const secondConfirm = confirm(
      `FINAL CONFIRMATION\n\nClick OK to confirm PERMANENT deletion of ${userName} (${userEmail})`
    );
    if (!secondConfirm) return;

    try {
      const response = await fetch(`/api/admin?userId=${userId}`, { method: 'DELETE' });
      if (response.ok) {
        alert(`User ${userName} has been permanently deleted.`);
        fetchAdminData();
        fetchAdminStats();
      } else {
        const error = await response.json();
        alert(`Failed to delete user: ${error.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to delete user:', error);
      alert('Failed to delete user. Please try again.');
    }
  };

  const resetPassword = async (userId: string, userName: string) => {
    if (!confirm(`Reset password for ${userName}? A new temporary password will be generated.`)) return;
    try {
      const response = await fetch('/api/admin/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      if (response.ok) {
        const data = await response.json();
        alert(`Password reset successfully!\n\nTemporary password: ${data.tempPassword}\n\nShare this securely with the user. They must change it on next login.`);
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to reset password');
      }
    } catch (error) {
      console.error('Failed to reset password:', error);
      alert('Failed to reset password');
    }
  };

  const toggleUserStatus = async (userId: string, currentStatus: boolean, userName: string) => {
    const action = currentStatus ? 'deactivate' : 'reactivate';
    if (!confirm(`Are you sure you want to ${action} ${userName}?`)) return;

    try {
      const response = await fetch('/api/admin/toggle-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, isActive: !currentStatus })
      });
      if (response.ok) {
        alert(`${userName} has been ${currentStatus ? 'deactivated' : 'reactivated'} successfully.`);
        fetchAdminData();
        fetchAdminStats();
      } else {
        const error = await response.json();
        alert(`Failed to ${action} user: ${error.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error(`Failed to ${action} user:`, error);
      alert(`Failed to ${action} user. Please try again.`);
    }
  };

  const sendInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInviteEmail.trim()) return;
    setSendingInvite(true);
    try {
      const response = await fetch('/api/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newInviteEmail }),
      });
      if (response.ok) {
        const data = await response.json();
        setNewInviteEmail('');
        fetchAdminData();
        const inviteUrl = data.invitationUrl || `${window.location.origin}/invite/${data.code}`;
        navigator.clipboard.writeText(inviteUrl).catch(() => {});
        alert(`Invitation created! Link copied to clipboard:\n\n${inviteUrl}`);
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to send invitation');
      }
    } catch (error) {
      console.error('Failed to send invitation:', error);
      alert('Failed to send invitation');
    } finally {
      setSendingInvite(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-[#0f1219] flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!session?.user || session.user.role !== 'ADMIN') {
    return (
      <div className="min-h-screen bg-[#0f1219] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Access Denied</h1>
          <p className="text-[#9ca3af]">You need admin privileges to access this page.</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { key: 'dashboard' as const, label: 'Overview' },
    { key: 'users' as const, label: `Users (${adminStats?.totalUsers || 0})` },
    { key: 'contacts' as const, label: `Contacts (${adminData?.contactSubmissions.length || 0})` },
    { key: 'invitations' as const, label: `Invitations (${adminData?.invitations?.length || 0})` },
  ];

  return (
    <div className="min-h-screen bg-[#0f1219]">
      {/* Header */}
      <div className="bg-[#1a1f2e] border-b border-[#2d3548]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-5">
            <div>
              <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
              <p className="text-sm text-[#6b7280] mt-1">Platform management &amp; monitoring</p>
            </div>
            <div className="flex items-center gap-3">
              <a href="/" className="px-3 py-1.5 text-sm font-medium text-[#9ca3af] border border-[#2d3548] rounded-lg hover:bg-white/5 transition-colors">
                View Site
              </a>
              <div className="text-right">
                <p className="text-sm font-medium text-white">{session?.user?.name}</p>
                <p className="text-xs text-[#6b7280]">Administrator</p>
              </div>
              <div className="h-9 w-9 rounded-full bg-[#6366f1] flex items-center justify-center">
                <span className="text-white text-sm font-semibold">
                  {session?.user?.name?.charAt(0) || 'A'}
                </span>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: '/' })}
                className="px-3 py-1.5 text-sm font-medium text-[#9ca3af] bg-[#252d3d] rounded-lg hover:bg-[#2d3548] transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-[#1a1f2e] border-b border-[#2d3548]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex gap-6 -mb-px">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`py-3 px-1 border-b-2 text-sm font-medium transition-colors ${
                  activeTab === tab.key
                    ? 'border-[#6366f1] text-[#818cf8]'
                    : 'border-transparent text-[#6b7280] hover:text-[#9ca3af] hover:border-[#4b5563]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* ─── OVERVIEW TAB ─── */}
        {activeTab === 'dashboard' && adminStats && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

            {/* Primary Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label="Total Users" value={adminStats.totalUsers} color="blue" icon={
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              } />
              <StatCard label="Active Clients" value={adminStats.activeClients} color="green" icon={
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              } />
              <StatCard label="Trainers" value={adminStats.totalTrainers} color="indigo" icon={
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              } />
              <StatCard label="Appointments" value={adminStats.totalAppointments} color="yellow" icon={
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              } />
            </div>

            {/* Secondary Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              <MiniStat label="Workout Sessions" value={adminStats.totalWorkoutSessions} />
              <MiniStat label="Progress Entries" value={adminStats.totalProgressEntries} />
              <MiniStat label="Food Entries" value={adminStats.totalFoodEntries} />
              <MiniStat label="Messages" value={adminStats.totalMessages} />
              <MiniStat label="New Contacts" value={adminStats.newContactSubmissions} highlight={adminStats.newContactSubmissions > 0} />
            </div>

            {/* Quick Actions + System Info side by side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Quick Actions */}
              <div className="bg-[#1e2433] rounded-xl border border-[#2d3548] p-6">
                <h3 className="text-base font-semibold text-white mb-4">Quick Actions</h3>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setActiveTab('contacts')}
                    className="flex items-center gap-2 px-4 py-3 bg-blue-50 text-blue-700 rounded-lg hover:bg-[#6366f1]/10 transition-colors text-sm font-medium"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                    View Contacts
                    {adminStats.newContactSubmissions > 0 && (
                      <span className="ml-auto bg-[#6366f1] text-white text-xs px-1.5 py-0.5 rounded-full">{adminStats.newContactSubmissions}</span>
                    )}
                  </button>
                  <button
                    onClick={() => setActiveTab('invitations')}
                    className="flex items-center gap-2 px-4 py-3 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors text-sm font-medium"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                    Send Invitation
                    {adminStats.pendingInvitations > 0 && (
                      <span className="ml-auto bg-purple-600 text-white text-xs px-1.5 py-0.5 rounded-full">{adminStats.pendingInvitations}</span>
                    )}
                  </button>
                  <button
                    onClick={() => setActiveTab('users')}
                    className="flex items-center gap-2 px-4 py-3 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors text-sm font-medium"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" /></svg>
                    Manage Users
                  </button>
                  <a
                    href="/trainer/dashboard"
                    className="flex items-center gap-2 px-4 py-3 bg-[#0f1219] text-[#9ca3af] rounded-lg hover:bg-[#252d3d] transition-colors text-sm font-medium"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                    Trainer View
                  </a>
                  <a
                    href="/admin/shop"
                    className="flex items-center gap-2 px-4 py-3 bg-[#6366f1]/10 text-[#818cf8] rounded-lg hover:bg-[#6366f1]/20 transition-colors text-sm font-medium"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
                    Manage Shop
                  </a>
                </div>
              </div>

              {/* System Info */}
              <div className="bg-[#1e2433] rounded-xl border border-[#2d3548] p-6">
                <h3 className="text-base font-semibold text-white mb-4">System Information</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-[#0f1219] rounded-lg p-3">
                    <p className="text-xs text-[#6b7280] mb-1">Database</p>
                    <p className="text-sm font-semibold text-white">PostgreSQL</p>
                  </div>
                  <div className="bg-[#0f1219] rounded-lg p-3">
                    <p className="text-xs text-[#6b7280] mb-1">Hosting</p>
                    <p className="text-sm font-semibold text-white">Railway</p>
                  </div>
                  <div className="bg-[#0f1219] rounded-lg p-3">
                    <p className="text-xs text-[#6b7280] mb-1">Status</p>
                    <p className="text-sm font-semibold text-green-600 flex items-center gap-1">
                      <span className="w-2 h-2 bg-green-500 rounded-full inline-block"></span>
                      Online
                    </p>
                  </div>
                  <div className="bg-[#0f1219] rounded-lg p-3">
                    <p className="text-xs text-[#6b7280] mb-1">Framework</p>
                    <p className="text-sm font-semibold text-white">Next.js</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Users Table */}
            <div className="bg-[#1e2433] rounded-xl border border-[#2d3548]">
              <div className="px-6 py-4 border-b border-[#2d3548] flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-white">All Users</h3>
                  <p className="text-sm text-[#6b7280]">Manage accounts, passwords, and access</p>
                </div>
                <button
                  onClick={() => setActiveTab('users')}
                  className="text-sm text-[#818cf8] hover:text-[#818cf8] font-medium"
                >
                  View all &rarr;
                </button>
              </div>
              <UserTable
                users={adminStats.recentActivity.slice(0, 10)}
                onResetPassword={resetPassword}
                onToggleStatus={toggleUserStatus}
                onDelete={deleteUser}
              />
            </div>
          </motion.div>
        )}

        {/* ─── USERS TAB ─── */}
        {activeTab === 'users' && adminStats && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            {/* Search and Filters */}
            <div className="bg-[#1e2433] rounded-xl border border-[#2d3548] p-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 relative">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4b5563]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search by name or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-[#2d3548] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="px-3 py-2 border border-[#2d3548] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6366f1] bg-[#0f1219] text-white"
                >
                  <option value="ALL">All Roles</option>
                  <option value="ADMIN">Admin</option>
                  <option value="TRAINER">Trainer</option>
                  <option value="CLIENT">Client</option>
                </select>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-[#2d3548] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6366f1] bg-[#0f1219] text-white"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>
              <p className="text-xs text-[#6b7280] mt-2">{filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''} found</p>
            </div>

            {/* Users Table */}
            <div className="bg-[#1e2433] rounded-xl border border-[#2d3548]">
              <UserTable
                users={filteredUsers}
                onResetPassword={resetPassword}
                onToggleStatus={toggleUserStatus}
                onDelete={deleteUser}
                showActivity
              />
              {filteredUsers.length === 0 && (
                <div className="text-center py-12 text-[#6b7280]">
                  <p>No users match your filters.</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ─── CONTACTS TAB ─── */}
        {activeTab === 'contacts' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            {/* Filter Bar */}
            <div className="bg-[#1e2433] rounded-xl border border-[#2d3548] p-4 flex items-center gap-3">
              <span className="text-sm text-[#9ca3af]">Filter:</span>
              {['ALL', 'NEW', 'IN_PROGRESS', 'INVITED', 'COMPLETED'].map(s => (
                <button
                  key={s}
                  onClick={() => setContactStatusFilter(s)}
                  className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                    contactStatusFilter === s
                      ? 'bg-[#6366f1] text-white'
                      : 'bg-[#252d3d] text-[#9ca3af] hover:bg-gray-200'
                  }`}
                >
                  {s === 'ALL' ? 'All' : s.replace('_', ' ')}
                </button>
              ))}
              <span className="ml-auto text-xs text-[#6b7280]">{filteredContacts.length} submission{filteredContacts.length !== 1 ? 's' : ''}</span>
            </div>

            {/* Submissions */}
            <div className="space-y-3">
              {filteredContacts.map((submission) => (
                <div key={submission.id} className="bg-[#1e2433] rounded-xl border border-[#2d3548] p-5 hover:border-[#2d3548] transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-semibold text-white">{submission.name}</h3>
                        <StatusBadge status={submission.status} />
                      </div>
                      <div className="text-xs text-[#6b7280] mb-2 flex flex-wrap gap-3">
                        <span>{submission.email}</span>
                        {submission.phone && <span>{submission.phone}</span>}
                        <span>{new Date(submission.createdAt).toLocaleDateString()}</span>
                      </div>
                      <p className="text-sm text-[#9ca3af] line-clamp-2">{submission.message}</p>
                    </div>
                  </div>
                </div>
              ))}
              {filteredContacts.length === 0 && (
                <div className="text-center py-12 text-[#6b7280] bg-[#1e2433] rounded-xl border border-[#2d3548]">
                  <p>No contact submissions match this filter.</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ─── INVITATIONS TAB ─── */}
        {activeTab === 'invitations' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            {/* Send Invitation */}
            <div className="bg-[#1e2433] rounded-xl border border-[#2d3548] p-5">
              <h3 className="text-base font-semibold text-white mb-3">Send New Invitation</h3>
              <form onSubmit={sendInvitation} className="flex gap-3">
                <input
                  type="email"
                  value={newInviteEmail}
                  onChange={(e) => setNewInviteEmail(e.target.value)}
                  placeholder="Enter email address..."
                  className="flex-1 px-3 py-2 border border-[#2d3548] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
                <button
                  type="submit"
                  disabled={sendingInvite}
                  className="px-5 py-2 bg-[#6366f1] text-white rounded-lg text-sm font-medium hover:bg-[#5558e3] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {sendingInvite ? 'Sending...' : 'Send Invite'}
                </button>
              </form>
            </div>

            {/* Invitation List */}
            <div className="bg-[#1e2433] rounded-xl border border-[#2d3548] overflow-hidden">
              <div className="px-5 py-3 border-b border-[#2d3548]">
                <h3 className="text-base font-semibold text-white">Invitation History</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-[#0f1219]">
                    <tr>
                      <th className="px-5 py-3 text-left text-xs font-medium text-[#6b7280] uppercase">Email</th>
                      <th className="px-5 py-3 text-left text-xs font-medium text-[#6b7280] uppercase">Status</th>
                      <th className="px-5 py-3 text-left text-xs font-medium text-[#6b7280] uppercase">Invited By</th>
                      <th className="px-5 py-3 text-left text-xs font-medium text-[#6b7280] uppercase">Sent</th>
                      <th className="px-5 py-3 text-left text-xs font-medium text-[#6b7280] uppercase">Expires</th>
                      <th className="px-5 py-3 text-left text-xs font-medium text-[#6b7280] uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {adminData?.invitations?.map((invitation) => (
                      <tr key={invitation.id} className="hover:bg-[#0f1219]">
                        <td className="px-5 py-3 text-sm text-white">{invitation.email}</td>
                        <td className="px-5 py-3"><StatusBadge status={invitation.status} /></td>
                        <td className="px-5 py-3 text-sm text-[#6b7280]">{invitation.inviter.name}</td>
                        <td className="px-5 py-3 text-sm text-[#6b7280]">{new Date(invitation.createdAt).toLocaleDateString()}</td>
                        <td className="px-5 py-3 text-sm text-[#6b7280]">{new Date(invitation.expiresAt).toLocaleDateString()}</td>
                        <td className="px-5 py-3">
                          {invitation.status === 'PENDING' && (
                            <button
                              onClick={() => {
                                const inviteUrl = `${window.location.origin}/invite/${invitation.code}`;
                                navigator.clipboard.writeText(inviteUrl);
                                alert('Invitation link copied to clipboard!');
                              }}
                              className="text-sm text-[#818cf8] hover:text-[#818cf8] font-medium"
                            >
                              Copy Link
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {(!adminData?.invitations || adminData.invitations.length === 0) && (
                <div className="text-center py-12 text-[#6b7280]">
                  <p>No invitations sent yet.</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

/* ─── COMPONENTS ─── */

function StatCard({ label, value, color, icon }: { label: string; value: number; color: string; icon: React.ReactNode }) {
  const colors: Record<string, { bg: string; text: string; icon: string; border: string }> = {
    blue:   { bg: 'bg-blue-50',   text: 'text-blue-700',   icon: 'text-blue-500',   border: 'border-blue-200' },
    green:  { bg: 'bg-green-50',  text: 'text-green-700',  icon: 'text-green-500',  border: 'border-green-200' },
    indigo: { bg: 'bg-indigo-50', text: 'text-indigo-700', icon: 'text-indigo-500', border: 'border-indigo-200' },
    yellow: { bg: 'bg-amber-50',  text: 'text-amber-700',  icon: 'text-amber-500',  border: 'border-amber-200' },
  };
  const c = colors[color] || colors.blue;

  return (
    <div className={`${c.bg} border ${c.border} rounded-lg p-5`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-[#6b7280] uppercase tracking-wide">{label}</p>
          <p className={`text-2xl font-bold ${c.text} mt-1`}>{value}</p>
        </div>
        <div className={`p-2.5 rounded-lg bg-[#252d3d]`}>
          <svg className={`w-5 h-5 ${c.icon}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {icon}
          </svg>
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className={`bg-[#1e2433] rounded-xl border p-4 ${highlight ? 'border-[#6366f1]/40 bg-[#6366f1]/5' : 'border-[#2d3548]'}`}>
      <p className={`text-xl font-bold ${highlight ? 'text-blue-700' : 'text-white'}`}>{value}</p>
      <p className="text-xs text-[#6b7280] mt-0.5">{label}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    NEW: 'bg-[#6366f1]/10 text-blue-700',
    IN_PROGRESS: 'bg-yellow-100 text-yellow-700',
    INVITED: 'bg-purple-100 text-purple-700',
    COMPLETED: 'bg-green-100 text-green-700',
    PENDING: 'bg-yellow-100 text-yellow-700',
    ACCEPTED: 'bg-green-100 text-green-700',
    EXPIRED: 'bg-red-100 text-red-400',
  };
  return (
    <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${styles[status] || 'bg-[#252d3d] text-[#9ca3af]'}`}>
      {status.replace('_', ' ')}
    </span>
  );
}

function RoleBadge({ role }: { role: string }) {
  const styles: Record<string, string> = {
    ADMIN: 'bg-red-100 text-red-400',
    TRAINER: 'bg-indigo-100 text-indigo-700',
    CLIENT: 'bg-emerald-100 text-emerald-700',
  };
  return (
    <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${styles[role] || 'bg-[#252d3d] text-[#9ca3af]'}`}>
      {role}
    </span>
  );
}

function UserTable({
  users,
  onResetPassword,
  onToggleStatus,
  onDelete,
  showActivity,
}: {
  users: User[];
  onResetPassword: (id: string, name: string) => void;
  onToggleStatus: (id: string, isActive: boolean, name: string) => void;
  onDelete: (id: string, name: string, email: string) => void;
  showActivity?: boolean;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-[#0f1219]">
          <tr>
            <th className="px-5 py-3 text-left text-xs font-medium text-[#6b7280] uppercase">User</th>
            <th className="px-5 py-3 text-left text-xs font-medium text-[#6b7280] uppercase">Role</th>
            <th className="px-5 py-3 text-left text-xs font-medium text-[#6b7280] uppercase">Status</th>
            {showActivity && <th className="px-5 py-3 text-left text-xs font-medium text-[#6b7280] uppercase">Activity</th>}
            <th className="px-5 py-3 text-left text-xs font-medium text-[#6b7280] uppercase">Last Login</th>
            <th className="px-5 py-3 text-right text-xs font-medium text-[#6b7280] uppercase">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {users.map((user) => (
            <tr key={user.id} className="hover:bg-[#0f1219]">
              <td className="px-5 py-3">
                <div>
                  <p className="text-sm font-medium text-white">{user.name || 'No name'}</p>
                  <p className="text-xs text-[#6b7280]">{user.email}</p>
                </div>
              </td>
              <td className="px-5 py-3"><RoleBadge role={user.role} /></td>
              <td className="px-5 py-3">
                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${user.isActive ? 'bg-green-500' : 'bg-red-400'}`}></span>
                  <span className="text-sm text-[#9ca3af]">{user.isActive ? 'Active' : 'Inactive'}</span>
                </div>
              </td>
              {showActivity && (
                <td className="px-5 py-3 text-xs text-[#6b7280]">
                  <div className="flex gap-3">
                    <span title="Workouts">{user._count.workoutSessions || 0} workouts</span>
                    <span title="Food entries">{user._count.foodEntries || 0} meals</span>
                    <span title="Logins">{user.loginCount} logins</span>
                  </div>
                </td>
              )}
              <td className="px-5 py-3 text-sm text-[#6b7280]">
                {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
              </td>
              <td className="px-5 py-3">
                {user.role === 'ADMIN' ? (
                  <span className="text-xs text-[#4b5563]">Protected account</span>
                ) : (
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => onResetPassword(user.id, user.name || user.email)}
                    className="px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 rounded-md hover:bg-[#6366f1]/10 transition-colors"
                  >
                    Reset PW
                  </button>
                  <button
                    onClick={() => onToggleStatus(user.id, user.isActive, user.name || user.email)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                      user.isActive
                        ? 'text-amber-700 bg-amber-50 hover:bg-amber-100'
                        : 'text-green-700 bg-green-50 hover:bg-green-100'
                    }`}
                  >
                    {user.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                  <button
                    onClick={() => onDelete(user.id, user.name || 'Unknown', user.email)}
                    className="px-2.5 py-1 text-xs font-medium text-red-400 bg-red-500/10 rounded-md hover:bg-red-100 transition-colors"
                  >
                    Delete
                  </button>
                </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
