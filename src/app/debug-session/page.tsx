'use client';

import { useSession } from 'next-auth/react';
import { signOut } from 'next-auth/react';

export default function DebugSession() {
  const { data: session, status } = useSession();

  const handleClearSession = async () => {
    await signOut({ callbackUrl: '/auth/signin' });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold mb-6">Session Debug</h1>
        
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Status:</h2>
            <p className="text-gray-600">{status}</p>
          </div>
          
          <div>
            <h2 className="text-lg font-semibold">Session Data:</h2>
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
              {JSON.stringify(session, null, 2)}
            </pre>
          </div>
          
          <div className="flex gap-4">
            <button
              onClick={() => window.location.href = '/client/dashboard'}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Go to Client Dashboard
            </button>
            
            <button
              onClick={() => window.location.href = '/trainer/dashboard'}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Go to Trainer Dashboard
            </button>
            
            <button
              onClick={handleClearSession}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Clear Session & Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}