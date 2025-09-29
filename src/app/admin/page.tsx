'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
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
  totalAppointments: number;
  totalFoodEntries: number;
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

  const deleteUser = async (userId: string, userName: string, userEmail: string) => {
    // First confirmation
    const firstConfirm = confirm(
      `⚠️ WARNING: DELETE USER PERMANENTLY\n\n` +
      `User: ${userName} (${userEmail})\n\n` +
      `This will PERMANENTLY DELETE:\n` +
      `• User account and login access\n` +
      `• All workout sessions and progress\n` +
      `• All appointments and schedules\n` +
      `• All food entries and nutrition data\n` +
      `• All messages and notifications\n\n` +
      `❌ THIS CANNOT BE UNDONE!\n\n` +
      `Consider deactivating instead to preserve data.\n\n` +
      `Continue with deletion?`
    );

    if (!firstConfirm) {
      return;
    }

    // Second confirmation for extra safety
    const secondConfirm = confirm(
      `🚨 FINAL CONFIRMATION\n\n` +
      `Type the user's email to confirm deletion:\n` +
      `Expected: ${userEmail}\n\n` +
      `Click OK to confirm PERMANENT deletion of ${userName}`
    );

    if (!secondConfirm) {
      return;
    }

    try {
      const response = await fetch(`/api/admin?userId=${userId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        alert(`✅ User ${userName} has been permanently deleted.`);
        fetchAdminData();
        fetchAdminStats();
      } else {
        const error = await response.json();
        alert(`❌ Failed to delete user: ${error.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to delete user:', error);
      alert('❌ Failed to delete user. Please try again.');
    }
  };

  const resetPassword = async (userId: string) => {
    try {
      const response = await fetch('/api/admin/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      
      if (response.ok) {
        const data = await response.json();
        alert(`Password reset successfully! New password: ${data.newPassword}\nUser must change this on next login.`);
        fetchAdminData();
        fetchAdminStats();
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
    // Get user confirmation before making changes
    const action = currentStatus ? 'deactivate' : 'reactivate';
    const actionPast = currentStatus ? 'deactivated' : 'reactivated';
    
    const confirmMessage = currentStatus 
      ? `Are you sure you want to DEACTIVATE ${userName}?\n\nThis will:\n• Prevent them from logging in\n• Disable their access to the platform\n• Keep their data intact for potential reactivation\n\nYou can reactivate them later if they return.`
      : `Are you sure you want to REACTIVATE ${userName}?\n\nThis will:\n• Allow them to log in again\n• Restore their access to the platform\n• Enable all their previous functionality`;
    
    if (!confirm(confirmMessage)) {
      return; // User cancelled
    }

    try {
      const response = await fetch('/api/admin/toggle-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, isActive: !currentStatus })
      });
      
      if (response.ok) {
        alert(`✅ ${userName} has been ${actionPast} successfully!`);
        fetchAdminData();
        fetchAdminStats();
      } else {
        const error = await response.json();
        alert(`❌ Failed to ${action} user: ${error.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error(`Failed to ${action} user:`, error);
      alert(`❌ Failed to ${action} user. Please try again.`);
    }
  };

  const sendInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInviteEmail.trim()) return;

    setSendingInvite(true);
    try {
      const response = await fetch('/api/invitations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: newInviteEmail }),
      });

      if (response.ok) {
        const data = await response.json();
        setNewInviteEmail('');
        fetchAdminData();
        alert(`Invitation sent successfully! Share this link: ${data.invitation.invitationUrl}`);
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!session?.user || session.user.role !== 'ADMIN') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Access Denied</h1>
          <p className="text-gray-600">You need admin privileges to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-gray-600">Fitness Platform Management & PostgreSQL Control</p>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                Welcome, {session?.user?.name}
              </span>
              <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center">
                <span className="text-white text-sm font-medium">
                  {session?.user?.name?.charAt(0) || 'A'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-8">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'dashboard'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'users'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Users ({adminData?.users.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('contacts')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'contacts'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Contact Submissions ({adminData?.contactSubmissions.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('invitations')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'invitations'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Invitations ({adminData?.invitations?.length || 0})
            </button>
          </nav>
        </div>

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && adminStats && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            {/* Platform Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
                <div className="flex items-center">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">Total Users</h3>
                    <p className="text-3xl font-bold text-blue-600">{adminStats.totalUsers}</p>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-full">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"></path>
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
                <div className="flex items-center">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">Active Clients</h3>
                    <p className="text-3xl font-bold text-green-600">{adminStats.activeClients}</p>
                  </div>
                  <div className="p-3 bg-green-100 rounded-full">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6 border-l-4 border-yellow-500">
                <div className="flex items-center">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">Appointments</h3>
                    <p className="text-3xl font-bold text-yellow-600">{adminStats.totalAppointments}</p>
                  </div>
                  <div className="p-3 bg-yellow-100 rounded-full">
                    <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500">
                <div className="flex items-center">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">Food Entries</h3>
                    <p className="text-3xl font-bold text-purple-600">{adminStats.totalFoodEntries}</p>
                  </div>
                  <div className="p-3 bg-purple-100 rounded-full">
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* User Management */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">User Management</h2>
                <p className="text-gray-600">Manage platform users and their accounts</p>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Activity</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {adminStats.recentActivity.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{user.name}</div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                            <div className="text-xs text-gray-400">
                              Joined: {new Date(user.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            user.role === 'ADMIN' ? 'bg-red-100 text-red-800' :
                            user.role === 'TRAINER' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                          }`}>
                            {user.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className={`h-2 w-2 rounded-full mr-2 ${
                              user.isActive ? 'bg-green-400' : 'bg-red-400'
                            }`}></div>
                            <span className="text-sm text-gray-900">
                              {user.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500">
                            Logins: {user.loginCount}
                          </div>
                          {user.lastLogin && (
                            <div className="text-xs text-gray-500">
                              Last: {new Date(user.lastLogin).toLocaleDateString()}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div>Food: {user._count.foodEntries}</div>
                          <div>Appointments: {user._count.clientAppointments}</div>
                          <div>Progress: {user._count.progressEntries}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                          <div className="flex flex-wrap gap-2">
                            <button 
                              onClick={() => resetPassword(user.id)}
                              className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
                            >
                              Reset Password
                            </button>
                            <button 
                              onClick={() => toggleUserStatus(user.id, user.isActive, user.name || user.email)}
                              className={`px-3 py-1 rounded text-sm transition-colors ${
                                user.isActive 
                                  ? 'bg-red-600 text-white hover:bg-red-700' 
                                  : 'bg-green-600 text-white hover:bg-green-700'
                              }`}
                            >
                              {user.isActive ? 'Deactivate' : 'Reactivate'}
                            </button>
                            <button 
                              onClick={() => deleteUser(user.id, user.name || 'Unknown User', user.email)}
                              className="px-3 py-1 bg-gray-800 text-white rounded text-sm hover:bg-gray-900 transition-colors border border-red-500 hover:border-red-600"
                              title="Permanently delete user and all data"
                            >
                              🗑️ Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Database Info */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Database Information</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div className="p-4 bg-gray-50 rounded">
                  <div className="text-2xl font-bold text-gray-800">PostgreSQL</div>
                  <div className="text-sm text-gray-600">Database Type</div>
                </div>
                <div className="p-4 bg-gray-50 rounded">
                  <div className="text-2xl font-bold text-gray-800">Supabase</div>
                  <div className="text-sm text-gray-600">Hosting Provider</div>
                </div>
                <div className="p-4 bg-gray-50 rounded">
                  <div className="text-2xl font-bold text-green-600">Online</div>
                  <div className="text-sm text-gray-600">Status</div>
                </div>
                <div className="p-4 bg-gray-50 rounded">
                  <div className="text-2xl font-bold text-blue-600">500+</div>
                  <div className="text-sm text-gray-600">Client Capacity</div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white shadow rounded-lg overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">User Management</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {adminData?.users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {user.name || 'No name'}
                          </div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          user.role === 'ADMIN' ? 'bg-red-100 text-red-800' :
                          user.role === 'TRAINER' ? 'bg-blue-100 text-blue-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          user.hasProfile ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {user.hasProfile ? 'Complete' : 'Incomplete'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => deleteUser(user.id, user.name || 'Unknown User', user.email)}
                          className="text-red-600 hover:text-red-900"
                          title="Permanently delete user and all data"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* Contact Submissions Tab */}
        {activeTab === 'contacts' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white shadow rounded-lg overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Contact Submissions</h2>
            </div>
            <div className="divide-y divide-gray-200">
              {adminData?.contactSubmissions.map((submission) => (
                <div key={submission.id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="text-lg font-medium text-gray-900">{submission.name}</h3>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          submission.status === 'NEW' ? 'bg-blue-100 text-blue-800' :
                          submission.status === 'IN_PROGRESS' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {submission.status}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 mb-2">
                        <span className="font-medium">Email:</span> {submission.email}
                        {submission.phone && (
                          <span className="ml-4"><span className="font-medium">Phone:</span> {submission.phone}</span>
                        )}
                      </div>
                      <p className="text-gray-700">{submission.message}</p>
                    </div>
                    <div className="ml-4 text-sm text-gray-500">
                      {new Date(submission.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Invitations Tab */}
        {activeTab === 'invitations' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Send New Invitation */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Send New Invitation</h2>
              <form onSubmit={sendInvitation} className="flex gap-4">
                <div className="flex-1">
                  <input
                    type="email"
                    value={newInviteEmail}
                    onChange={(e) => setNewInviteEmail(e.target.value)}
                    placeholder="Enter client's email address"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={sendingInvite}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sendingInvite ? 'Sending...' : 'Send Invite'}
                </button>
              </form>
            </div>

            {/* Invitations List */}
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Invitation History</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Invited By
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Sent
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Expires
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {adminData?.invitations?.map((invitation) => (
                      <tr key={invitation.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {invitation.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            invitation.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                            invitation.status === 'ACCEPTED' ? 'bg-green-100 text-green-800' :
                            invitation.status === 'EXPIRED' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {invitation.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {invitation.inviter.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(invitation.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(invitation.expiresAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {invitation.status === 'PENDING' && (
                            <button
                              onClick={() => {
                                const baseUrl = window.location.origin;
                                const inviteUrl = `${baseUrl}/invite/${invitation.code}`;
                                navigator.clipboard.writeText(inviteUrl);
                                alert('Invitation link copied to clipboard!');
                              }}
                              className="text-blue-600 hover:text-blue-900"
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
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}