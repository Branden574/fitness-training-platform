'use client';

import { motion } from 'framer-motion';
import {
  Mail,
  Phone,
  Check,
  X,
  Eye,
} from 'lucide-react';
import { ContactSubmission } from '@/types';

interface TrainerContactsTabProps {
  contactSubmissions: ContactSubmission[];
  onViewSubmission: (submission: ContactSubmission) => void;
  onShowInvitationCode: (submission: ContactSubmission) => void;
  onApproveClient: (submission: ContactSubmission) => void;
  onUpdateStatus: (id: string, status: string) => void;
}

export default function TrainerContactsTab({
  contactSubmissions,
  onViewSubmission,
  onShowInvitationCode,
  onApproveClient,
  onUpdateStatus,
}: TrainerContactsTabProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Contact Submissions</h2>

      <div className="bg-white dark:bg-[#1a1f2e] rounded-xl shadow-sm overflow-hidden">
        <div className="divide-y divide-gray-200 dark:border-[#2a3042]">
          {contactSubmissions.map((submission) => (
            <div key={submission.id} className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-3">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">{submission.name}</h3>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      submission.status === 'NEW'
                        ? 'bg-red-100 text-red-800'
                        : submission.status === 'CONTACTED'
                        ? 'bg-yellow-100 text-yellow-800'
                        : submission.status === 'INVITED'
                        ? 'bg-indigo-100 text-indigo-800'
                        : submission.status === 'COMPLETED'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {submission.status === 'COMPLETED' ? 'ACCEPTED' : submission.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600 dark:text-gray-400 mb-4">
                    <div className="flex items-center">
                      <Mail className="w-4 h-4 mr-2" />
                      {submission.email}
                    </div>
                    {submission.phone && (
                      <div className="flex items-center">
                        <Phone className="w-4 h-4 mr-2" />
                        {submission.phone}
                      </div>
                    )}
                    {submission.age && (
                      <div>Age: {submission.age}</div>
                    )}
                    {submission.fitnessLevel && (
                      <div>Fitness Level: {submission.fitnessLevel}</div>
                    )}
                  </div>

                  <p className="text-gray-700 dark:text-gray-400 mb-4">{submission.message}</p>

                  {submission.fitnessGoals && (
                    <div className="mb-4">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">Goals:</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{submission.fitnessGoals}</p>
                    </div>
                  )}

                  <p className="text-xs text-gray-400 dark:text-gray-400">
                    Submitted {new Date(submission.createdAt).toLocaleDateString()} at {new Date(submission.createdAt).toLocaleTimeString()}
                  </p>
                </div>

                <div className="flex space-x-2 ml-4">
                  {submission.status === 'NEW' && (
                    <>
                      <button
                        onClick={() => onApproveClient(submission)}
                        className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-colors"
                        title="Accept & Send Invitation"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onViewSubmission(submission)}
                        className="p-2 bg-indigo-100 text-indigo-600 rounded-lg hover:bg-indigo-200 transition-colors"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onUpdateStatus(submission.id, 'COMPLETED')}
                        className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                        title="Reject Application"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  )}
                  {submission.status === 'INVITED' && (
                    <>
                      <button
                        onClick={() => onApproveClient(submission)}
                        className="px-3 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors flex items-center space-x-2"
                        title="View Invitation & Send Email"
                      >
                        <Mail className="w-4 h-4" />
                        <span>Send Email</span>
                      </button>
                      <button
                        onClick={() => onViewSubmission(submission)}
                        className="p-2 bg-indigo-100 text-indigo-600 rounded-lg hover:bg-indigo-200 transition-colors"
                        title="View Details & Code"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
