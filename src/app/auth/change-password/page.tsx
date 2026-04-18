'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Lock, AlertTriangle } from 'lucide-react';

export const dynamic = 'force-dynamic';

const inputClasses = "block w-full rounded-lg border border-[#2d3548] bg-[#0f1219] px-3.5 py-2.5 pr-10 text-sm text-white placeholder:text-[#4b5563] focus:outline-none focus:ring-2 focus:ring-[#6366f1] focus:border-transparent";

export default function ChangePasswordPage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (status === 'loading') return;

    if (!session) {
      router.push('/auth/signin');
      return;
    }

    if (!session.user.passwordChangeRequired) {
      if (session.user.role === 'TRAINER') {
        router.push('/trainer');
      } else {
        router.push('/client');
      }
    }
  }, [session, status, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        await update();
        setTimeout(() => {
          if (session?.user.role === 'TRAINER') {
            router.push('/trainer');
          } else {
            router.push('/client');
          }
        }, 2000);
      } else {
        setError(data.message || 'Failed to update password');
      }
    } catch (error) {
      console.error('Password change error:', error);
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = (field: 'current' | 'new' | 'confirm') => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-[#0f1219] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#2d3548] border-t-[#6366f1]"></div>
      </div>
    );
  }

  if (!session?.user.passwordChangeRequired) {
    return (
      <div className="min-h-screen bg-[#0f1219] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#2d3548] border-t-[#6366f1] mx-auto mb-4"></div>
          <p className="text-[#9ca3af]">Redirecting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f1219] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="mx-auto h-12 w-12 bg-amber-500/10 border border-amber-500/30 rounded-full flex items-center justify-center">
            <Lock className="h-6 w-6 text-amber-400" />
          </div>
          <h2 className="mt-6 text-2xl font-bold text-white">
            Password Change Required
          </h2>
          <div className="mt-4 bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
            <div className="flex items-start">
              <AlertTriangle className="h-5 w-5 text-amber-400 mt-0.5 mr-3 flex-shrink-0" />
              <div className="text-sm text-amber-300/90">
                <p className="font-medium">Security Notice</p>
                <p className="mt-1">
                  You are using a temporary password. Please create a new secure password to continue.
                </p>
              </div>
            </div>
          </div>
        </div>

        {success ? (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4 text-center">
            <p className="font-medium text-emerald-400">Password Updated Successfully!</p>
            <p className="mt-1 text-sm text-emerald-400/70">Redirecting to your dashboard...</p>
          </div>
        ) : (
          <div className="bg-[#1e2433] border border-[#2d3548] rounded-xl p-8">
            <form className="space-y-5" onSubmit={handleSubmit}>
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              <div>
                <label htmlFor="currentPassword" className="block text-sm font-medium text-[#9ca3af] mb-1.5">
                  Current Password
                </label>
                <div className="relative">
                  <input
                    id="currentPassword"
                    type={showPasswords.current ? 'text' : 'password'}
                    required
                    value={formData.currentPassword}
                    onChange={(e) => setFormData({...formData, currentPassword: e.target.value})}
                    className={inputClasses}
                    placeholder="Enter your current password"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => togglePasswordVisibility('current')}
                  >
                    {showPasswords.current ? (
                      <EyeOff className="h-4 w-4 text-[#4b5563]" />
                    ) : (
                      <Eye className="h-4 w-4 text-[#4b5563]" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-[#9ca3af] mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <input
                    id="newPassword"
                    type={showPasswords.new ? 'text' : 'password'}
                    required
                    value={formData.newPassword}
                    onChange={(e) => setFormData({...formData, newPassword: e.target.value})}
                    className={inputClasses}
                    placeholder="Enter your new password"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => togglePasswordVisibility('new')}
                  >
                    {showPasswords.new ? (
                      <EyeOff className="h-4 w-4 text-[#4b5563]" />
                    ) : (
                      <Eye className="h-4 w-4 text-[#4b5563]" />
                    )}
                  </button>
                </div>
                <p className="mt-1.5 text-xs text-[#6b7280]">
                  Must be 8+ characters with uppercase, lowercase, number, and special character (@$!%*?&).
                </p>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-[#9ca3af] mb-1.5">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    type={showPasswords.confirm ? 'text' : 'password'}
                    required
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                    className={inputClasses}
                    placeholder="Confirm your new password"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => togglePasswordVisibility('confirm')}
                  >
                    {showPasswords.confirm ? (
                      <EyeOff className="h-4 w-4 text-[#4b5563]" />
                    ) : (
                      <Eye className="h-4 w-4 text-[#4b5563]" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-3 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#6366f1] text-white font-semibold py-2.5 rounded-lg hover:bg-[#5558e3] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  {loading ? 'Updating Password...' : 'Update Password'}
                </button>

                <button
                  type="button"
                  onClick={() => signOut({ callbackUrl: '/auth/signin' })}
                  className="w-full border border-[#2d3548] text-[#9ca3af] font-medium py-2.5 rounded-lg hover:bg-white/5 transition-colors text-sm"
                >
                  Sign Out Instead
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
