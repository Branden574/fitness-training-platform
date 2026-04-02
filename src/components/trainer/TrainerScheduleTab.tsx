'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Plus, Users, Clock, Calendar, Check, X } from 'lucide-react';

interface Client {
  id: string;
  name: string;
}

interface Appointment {
  id: string;
  title: string;
  type: string;
  status: string;
  startTime: string;
  duration: number;
  location?: string;
  description?: string;
  createdAt: string;
  client?: { name: string };
}

interface TrainerScheduleTabProps {
  appointments: Appointment[];
  clients: Client[];
  currentMonth: Date;
  selectedDate: Date | null;
  showDayModal: boolean;
  onMonthChange: (date: Date) => void;
  onDateSelect: (date: Date) => void;
  onShowDayModal: (show: boolean) => void;
  onScheduleSession: () => void;
  onApproveAppointment: (appointmentId: string) => void;
  onRejectAppointment: (appointmentId: string) => void;
  onCancelAppointment?: (appointmentId: string) => void;
  onViewAppointment?: (appointmentId: string) => void;
}

export default function TrainerScheduleTab({
  appointments,
  clients,
  currentMonth,
  selectedDate,
  showDayModal,
  onMonthChange,
  onDateSelect,
  onShowDayModal,
  onScheduleSession,
  onApproveAppointment,
  onRejectAppointment,
}: TrainerScheduleTabProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Training Schedule</h2>
        <button
          onClick={onScheduleSession}
          className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
        >
          <Plus className="w-4 h-4 inline mr-2" />
          Schedule Session
        </button>
      </div>

      {/* Pending Approvals */}
      {appointments.filter(apt => apt.status === 'PENDING').length > 0 && (
        <div className="bg-white dark:bg-[#1a1f2e] rounded-xl shadow-sm overflow-hidden">
          <div className="p-6 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Pending Approvals</h3>
            <p className="text-gray-600 dark:text-gray-400">{appointments.filter(apt => apt.status === 'PENDING').length} appointment{appointments.filter(apt => apt.status === 'PENDING').length !== 1 ? 's' : ''} awaiting your approval</p>
          </div>

          <div className="divide-y divide-gray-200 dark:divide-[#2a3042]">
            {appointments.filter(apt => apt.status === 'PENDING').map((appointment) => (
              <div key={appointment.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      <h4 className="text-lg font-medium text-gray-900 dark:text-white">{appointment.title}</h4>
                      <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                        {appointment.type.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600 dark:text-gray-400 mb-4">
                      <div className="flex items-center">
                        <Users className="w-4 h-4 mr-2" />
                        {appointment.client?.name}
                      </div>
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 mr-2" />
                        {new Date(appointment.startTime).toLocaleDateString()} at {new Date(appointment.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 mr-2" />
                        {appointment.duration} minutes
                      </div>
                      {appointment.location && (
                        <div className="dark:text-gray-400">Location: {appointment.location}</div>
                      )}
                    </div>

                    {appointment.description && (
                      <p className="text-gray-700 dark:text-gray-300 mb-4">{appointment.description}</p>
                    )}

                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      Requested {new Date(appointment.createdAt).toLocaleDateString()} at {new Date(appointment.createdAt).toLocaleTimeString()}
                    </p>
                  </div>

                  <div className="flex space-x-2 ml-4">
                    <button
                      onClick={() => onApproveAppointment(appointment.id)}
                      className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50 transition-colors"
                      title="Approve"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onRejectAppointment(appointment.id)}
                      className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 transition-colors"
                      title="Reject"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Monthly Calendar */}
      <div className="bg-white dark:bg-[#1a1f2e] rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Monthly Schedule</h3>
              <p className="text-gray-600 dark:text-gray-400">{currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => {
                  const prevMonth = new Date(currentMonth);
                  prevMonth.setMonth(prevMonth.getMonth() - 1);
                  onMonthChange(prevMonth);
                }}
                className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                &larr;
              </button>
              <button
                onClick={() => {
                  const nextMonth = new Date(currentMonth);
                  nextMonth.setMonth(nextMonth.getMonth() + 1);
                  onMonthChange(nextMonth);
                }}
                className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                &rarr;
              </button>
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* Calendar Grid */}
          <div className="mb-4">
            {/* Days of week header */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="p-2 text-center text-sm font-medium text-gray-500 dark:text-gray-400">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar days */}
            <div className="grid grid-cols-7 gap-1">
              {(() => {
                const year = currentMonth.getFullYear();
                const month = currentMonth.getMonth();
                const firstDay = new Date(year, month, 1);
                const startDate = new Date(firstDay);
                startDate.setDate(firstDay.getDate() - firstDay.getDay());

                const calendarDays = [];
                const today = new Date();

                for (let i = 0; i < 42; i++) {
                  const currentDate = new Date(startDate);
                  currentDate.setDate(startDate.getDate() + i);

                  const isCurrentMonth = currentDate.getMonth() === month;
                  const isToday = currentDate.toDateString() === today.toDateString();

                  // Get appointments for this day
                  const dayStart = new Date(currentDate.setHours(0, 0, 0, 0));
                  const dayEnd = new Date(currentDate.setHours(23, 59, 59, 999));

                  const dayAppointments = appointments.filter(apt => {
                    const aptDate = new Date(apt.startTime);
                    return aptDate >= dayStart && aptDate <= dayEnd;
                  });

                  const pendingCount = dayAppointments.filter(apt => apt.status === 'PENDING').length;
                  const approvedCount = dayAppointments.filter(apt => apt.status === 'APPROVED').length;
                  const cancelledCount = dayAppointments.filter(apt => apt.status === 'CANCELLED' || apt.status === 'REJECTED').length;

                  calendarDays.push(
                    <div
                      key={i}
                      className={`
                        p-2 min-h-[80px] border border-gray-100 dark:border-[#2a3042] relative cursor-pointer hover:bg-gray-50 dark:hover:bg-[#2a3042] transition-colors
                        ${!isCurrentMonth ? 'text-gray-300 dark:text-gray-600 bg-gray-50 dark:bg-[#151928]' : ''}
                        ${isToday ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-700' : ''}
                      `}
                      onClick={() => {
                        onDateSelect(new Date(currentDate));
                        onShowDayModal(true);
                      }}
                    >
                      <div className={`text-sm font-medium ${isToday ? 'text-indigo-600 dark:text-indigo-400' : isCurrentMonth ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-600'}`}>
                        {currentDate.getDate()}
                      </div>

                      {/* Appointment indicators */}
                      <div className="mt-1 space-y-1">
                        {pendingCount > 0 && (
                          <div className="text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 px-1 rounded text-center">
                            {pendingCount} pending
                          </div>
                        )}
                        {approvedCount > 0 && (
                          <div className="text-xs bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 px-1 rounded text-center">
                            {approvedCount} confirmed
                          </div>
                        )}
                        {cancelledCount > 0 && (
                          <div className="text-xs bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 px-1 rounded text-center">
                            {cancelledCount} cancelled
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }

                return calendarDays;
              })()}
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center space-x-6 pt-4 border-t border-gray-200 dark:border-[#2a3042]">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded"></div>
              <span className="text-xs text-gray-600 dark:text-gray-400">Pending Requests</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded"></div>
              <span className="text-xs text-gray-600 dark:text-gray-400">Confirmed Appointments</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded"></div>
              <span className="text-xs text-gray-600 dark:text-gray-400">Cancelled Appointments</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
