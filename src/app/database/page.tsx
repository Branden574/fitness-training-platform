'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import LoadingSpinner from '@/components/LoadingSpinner';

interface User {
  id: string;
  name: string | null;
  email: string;
  role: string;
  createdAt: string;
}

interface ContactSubmission {
  id: string;
  name: string;
  email: string;
  message: string;
  status: string;
  createdAt: string;
}

interface DatabaseData {
  users: User[];
  contactSubmissions: ContactSubmission[];
}

export default function DatabasePage() {
  const { data: session, status } = useSession();
  const [data, setData] = useState<DatabaseData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.role === 'ADMIN') {
      fetchData();
    }
  }, [status, session]);

  const fetchData = async () => {
    try {
      const response = await fetch('/api/admin');
      if (response.ok) {
        const result = await response.json();
        setData(result);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
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
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Database Viewer</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Users */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              Users ({data?.users?.length || 0})
            </h2>
            <div className="space-y-3">
              {data?.users?.map((user: User) => (
                <div key={user.id} className="p-3 bg-gray-50 rounded border-l-4 border-blue-500">
                  <div className="font-semibold">{user.name}</div>
                  <div className="text-sm text-gray-600">{user.email}</div>
                  <div className="text-xs text-gray-500">
                    Role: {user.role} | Created: {new Date(user.createdAt).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Contact Submissions */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              Contact Submissions ({data?.contactSubmissions?.length || 0})
            </h2>
            <div className="space-y-3">
              {data?.contactSubmissions?.map((contact: ContactSubmission) => (
                <div key={contact.id} className="p-3 bg-gray-50 rounded border-l-4 border-green-500">
                  <div className="font-semibold">{contact.name}</div>
                  <div className="text-sm text-gray-600">{contact.email}</div>
                  <div className="text-sm text-gray-700 mt-1">{contact.message}</div>
                  <div className="text-xs text-gray-500 mt-2">
                    Status: {contact.status} | Submitted: {new Date(contact.createdAt).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Demo Credentials */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2 className="text-lg font-bold text-blue-800 mb-4">Demo Credentials</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded border">
              <h3 className="font-semibold text-red-600">Admin</h3>
              <p className="text-sm">Email: admin@brentmartinezfitness.com</p>
              <p className="text-sm">Password: admin123</p>
            </div>
            <div className="bg-white p-4 rounded border">
              <h3 className="font-semibold text-green-600">Client</h3>
              <p className="text-sm">Email: client@example.com</p>
              <p className="text-sm">Password: demo123</p>
            </div>
            <div className="bg-white p-4 rounded border">
              <h3 className="font-semibold text-blue-600">Trainer</h3>
              <p className="text-sm">Email: trainer@example.com</p>
              <p className="text-sm">Password: trainer123</p>
            </div>
          </div>
        </div>

        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Platform URLs</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold">Public Pages</h3>
              <ul className="space-y-1 text-sm">
                <li>• Home: <code>localhost:3000</code></li>
                <li>• Sign Up: <code>localhost:3000/auth/signup</code></li>
                <li>• Sign In: <code>localhost:3000/auth/signin</code></li>
                <li>• About: <code>localhost:3000/about</code></li>
                <li>• Programs: <code>localhost:3000/programs</code></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold">Protected Dashboards</h3>
              <ul className="space-y-1 text-sm">
                <li>• Client Dashboard: <code>localhost:3000/client/dashboard</code></li>
                <li>• Trainer Dashboard: <code>localhost:3000/trainer/dashboard</code></li>
                <li>• Admin Panel: <code>localhost:3000/admin</code></li>
                <li>• Database Viewer: <code>localhost:3000/database</code></li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}