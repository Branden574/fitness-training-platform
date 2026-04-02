'use client';

import { motion } from 'framer-motion';
import { Calendar, X } from 'lucide-react';
import { useState } from 'react';

interface Appointment {
  id: string;
  title: string;
  type: string;
  status: string;
  startTime: string;
  endTime: string;
  duration: number;
  location?: string;
  notes?: string;
  trainer?: { id: string; name: string; email: string };
}

interface ScheduleTabProps {
  appointments: Appointment[];
  trainerId: string | null;
  onBookAppointment: () => void;
  onReschedule: (appointmentId: string) => void;
  onCancel: (appointmentId: string) => void;
}

export default function ScheduleTab({
  appointments,
  trainerId,
  onBookAppointment,
  onReschedule,
  onCancel,
}: ScheduleTabProps) {
  const upcomingAppointments = appointments
    .filter((apt) => new Date(apt.startTime) > new Date())
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  const pastAppointments = appointments
    .filter((apt) => new Date(apt.startTime) <= new Date())
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
    .slice(0, 5);

  const statusColors: Record<string, string> = {
    PENDING: 'bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400',
    APPROVED: 'bg-green-100 dark:bg-green-500/15 text-green-700 dark:text-green-400',
    COMPLETED: 'bg-indigo-100 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300',
    CANCELLED: 'bg-red-100 dark:bg-red-500/15 text-red-700 dark:text-red-400',
    REJECTED: 'bg-red-100 dark:bg-red-500/15 text-red-700 dark:text-red-400',
    NO_SHOW: 'bg-gray-100 dark:bg-gray-500/15 text-gray-700 dark:text-gray-400',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Your Schedule</h2>
        <button
          onClick={onBookAppointment}
          className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl hover:bg-indigo-700 transition-colors text-sm font-medium"
        >
          <Calendar className="w-4 h-4" />
          Request Session
        </button>
      </div>

      {/* Upcoming Sessions */}
      <div className="bg-white dark:bg-[#1a1f2e] rounded-xl border border-gray-100 dark:border-[#2a3042]">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-[#2a3042]">
          <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
            Upcoming Sessions ({upcomingAppointments.length})
          </h3>
        </div>

        <div className="divide-y divide-gray-100 dark:divide-[#2a3042]">
          {upcomingAppointments.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <Calendar className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-sm text-gray-500 dark:text-gray-400">No upcoming sessions.</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Book a session with your trainer!</p>
            </div>
          ) : (
            upcomingAppointments.map((apt) => (
              <div key={apt.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 dark:text-white text-sm">{apt.title}</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {new Date(apt.startTime).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                      {' · '}
                      {new Date(apt.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      {' - '}
                      {new Date(apt.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    {apt.trainer && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">with {apt.trainer.name}</p>
                    )}
                    <span className={`inline-block mt-2 px-2 py-0.5 text-xs font-medium rounded-full ${statusColors[apt.status] || statusColors.PENDING}`}>
                      {apt.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    {apt.status === 'APPROVED' && (
                      <button
                        onClick={() => onReschedule(apt.id)}
                        className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 font-medium"
                      >
                        Reschedule
                      </button>
                    )}
                    {apt.status !== 'CANCELLED' && apt.status !== 'COMPLETED' && (
                      <button
                        onClick={() => onCancel(apt.id)}
                        className="text-xs text-red-600 dark:text-red-400 hover:text-red-700 font-medium"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Past Sessions */}
      {pastAppointments.length > 0 && (
        <div className="bg-white dark:bg-[#1a1f2e] rounded-xl border border-gray-100 dark:border-[#2a3042]">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-[#2a3042]">
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Recent Sessions</h3>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-[#2a3042]">
            {pastAppointments.map((apt) => (
              <div key={apt.id} className="px-5 py-3 flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-sm text-gray-700 dark:text-gray-300 font-medium truncate">{apt.title}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    {new Date(apt.startTime).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[apt.status] || ''}`}>
                  {apt.status.replace('_', ' ')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
