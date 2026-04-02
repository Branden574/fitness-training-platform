'use client';

import { Calendar, Bell, Check, X } from 'lucide-react';
import { Appointment } from '@/types';

interface MiscModalsProps {
  // Viewing Appointment
  viewingAppointment: Appointment | null;
  onCloseViewingAppointment: () => void;
  onApproveAppointment: (id: string) => void;
  onRejectAppointment: (id: string) => void;

  // Remove Client Confirm
  showRemoveConfirm: string | null;
  removeAction: 'remove' | 'delete';
  onCloseRemoveConfirm: () => void;
  onRemoveActionChange: (action: 'remove' | 'delete') => void;
  onRemoveClient: (clientId: string) => void;

  // Password Reset
  showPasswordResetModal: string | null;
  onClosePasswordResetModal: () => void;
  onResetClientPassword: (clientId: string) => void;

  // Day Modal
  showDayModal: boolean;
  selectedDate: Date | null;
  appointments: Appointment[];
  onCloseDayModal: () => void;
  onViewAppointmentFromDay: (appointment: Appointment) => void;

  // Client Menu overlay
  showClientMenu: string | null;
  onCloseClientMenu: () => void;
}

export default function MiscModals({
  viewingAppointment,
  onCloseViewingAppointment,
  onApproveAppointment,
  onRejectAppointment,
  showRemoveConfirm,
  removeAction,
  onCloseRemoveConfirm,
  onRemoveActionChange,
  onRemoveClient,
  showPasswordResetModal,
  onClosePasswordResetModal,
  onResetClientPassword,
  showDayModal,
  selectedDate,
  appointments,
  onCloseDayModal,
  onViewAppointmentFromDay,
  showClientMenu,
  onCloseClientMenu,
}: MiscModalsProps) {
  return (
    <>
      {/* Appointment Details Modal */}
      {viewingAppointment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-[#1a1f2e] rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Appointment Details</h3>
              <button
                onClick={onCloseViewingAppointment}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Status Badge */}
              <div className="flex items-center space-x-3">
                <span className={`px-3 py-1 text-sm rounded-full ${
                  viewingAppointment.status === 'PENDING'
                    ? 'bg-yellow-100 text-yellow-800'
                    : viewingAppointment.status === 'APPROVED'
                    ? 'bg-green-100 text-green-800'
                    : viewingAppointment.status === 'REJECTED'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {viewingAppointment.status}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {viewingAppointment.type.replace('_', ' ')}
                </span>
              </div>

              {/* Appointment Information */}
              <div className="bg-gray-50 dark:bg-[#2a3042] p-4 rounded-lg">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Appointment Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Title</label>
                    <p className="text-gray-900 dark:text-white">{viewingAppointment.title}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Client</label>
                    <p className="text-gray-900 dark:text-white">{viewingAppointment.client?.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Date</label>
                    <p className="text-gray-900 dark:text-white">{new Date(viewingAppointment.startTime).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Time</label>
                    <p className="text-gray-900 dark:text-white">
                      {new Date(viewingAppointment.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
                      {new Date(viewingAppointment.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Duration</label>
                    <p className="text-gray-900 dark:text-white">{viewingAppointment.duration} minutes</p>
                  </div>
                  {viewingAppointment.location && (
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Location</label>
                      <p className="text-gray-900 dark:text-white">{viewingAppointment.location}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Description */}
              {viewingAppointment.description && (
                <div className="bg-indigo-50 dark:bg-[#2a3042] p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Description</h4>
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{viewingAppointment.description}</p>
                </div>
              )}

              {/* Notes */}
              {viewingAppointment.notes && (
                <div className="bg-green-50 dark:bg-[#2a3042] p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Notes</h4>
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{viewingAppointment.notes}</p>
                </div>
              )}

              {/* Cancel Reason */}
              {viewingAppointment.cancelReason && (
                <div className="bg-red-50 dark:bg-[#2a3042] p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Cancellation Reason</h4>
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{viewingAppointment.cancelReason}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex space-x-3 pt-4 border-t dark:border-[#2a3042]">
                {viewingAppointment.status === 'PENDING' && (
                  <>
                    <button
                      onClick={() => {
                        onApproveAppointment(viewingAppointment.id);
                        onCloseViewingAppointment();
                      }}
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center space-x-2"
                    >
                      <Check className="w-4 h-4" />
                      <span>Approve</span>
                    </button>
                    <button
                      onClick={() => {
                        onRejectAppointment(viewingAppointment.id);
                        onCloseViewingAppointment();
                      }}
                      className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center space-x-2"
                    >
                      <X className="w-4 h-4" />
                      <span>Reject</span>
                    </button>
                  </>
                )}
                <button
                  onClick={onCloseViewingAppointment}
                  className="px-4 py-2 text-gray-700 dark:text-white bg-gray-100 dark:bg-[#2a3042] rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Remove Client Confirmation Modal */}
      {showRemoveConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-[#1a1f2e] rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Remove Client</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              How would you like to handle this client? Choose an option below:
            </p>

            <div className="space-y-3 mb-6">
              <label className="flex items-start space-x-3 p-3 border dark:border-[#2a3042] rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-[#2a3042]">
                <input
                  type="radio"
                  value="remove"
                  checked={removeAction === 'remove'}
                  onChange={(e) => onRemoveActionChange(e.target.value as 'remove' | 'delete')}
                  className="mt-1"
                />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Remove from my client list</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Client account remains active but they won&apos;t be assigned to you
                  </p>
                </div>
              </label>

              <label className="flex items-start space-x-3 p-3 border dark:border-[#2a3042] rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-[#2a3042]">
                <input
                  type="radio"
                  value="delete"
                  checked={removeAction === 'delete'}
                  onChange={(e) => onRemoveActionChange(e.target.value as 'remove' | 'delete')}
                  className="mt-1"
                />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Delete account completely</p>
                  <p className="text-sm text-red-600">
                    This will permanently delete their account and all data
                  </p>
                </div>
              </label>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={onCloseRemoveConfirm}
                className="flex-1 px-4 py-2 text-gray-700 dark:text-white bg-gray-100 dark:bg-[#2a3042] rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => onRemoveClient(showRemoveConfirm)}
                className={`flex-1 px-4 py-2 text-white rounded-lg transition-colors ${
                  removeAction === 'delete'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-orange-600 hover:bg-orange-700'
                }`}
              >
                {removeAction === 'delete' ? 'Delete Account' : 'Remove Client'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Password Reset Modal */}
      {showPasswordResetModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-[#1a1f2e] rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Reset Client Password</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              This will reset the password for this client. They will be prompted to change it on their next login.
            </p>

            <div className="mb-6">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                A secure random temporary password will be generated. You will see it once after reset to share with the client.
              </p>
            </div>

            <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3 mb-6">
              <p className="text-sm text-orange-800 dark:text-orange-300">
                The client will need to use this password to log in and will be prompted to change it immediately.
              </p>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={onClosePasswordResetModal}
                className="flex-1 px-4 py-2 text-gray-700 dark:text-white bg-gray-100 dark:bg-[#2a3042] rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => onResetClientPassword(showPasswordResetModal)}
                className="flex-1 px-4 py-2 text-white bg-orange-600 hover:bg-orange-700 rounded-lg transition-colors"
              >
                Reset Password
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Click outside to close menus */}
      {showClientMenu && (
        <div
          className="fixed inset-0 z-5"
          onClick={onCloseClientMenu}
        />
      )}

      {/* Day Detail Modal */}
      {showDayModal && selectedDate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-[#1a1f2e] rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold dark:text-white">
                {selectedDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </h3>
              <button
                onClick={onCloseDayModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {(() => {
              const dayStart = new Date(selectedDate);
              dayStart.setHours(0, 0, 0, 0);
              const dayEnd = new Date(selectedDate);
              dayEnd.setHours(23, 59, 59, 999);

              const dayAppointments = appointments.filter(apt => {
                const aptDate = new Date(apt.startTime);
                return aptDate >= dayStart && aptDate <= dayEnd;
              }).sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

              const pendingAppointments = dayAppointments.filter(apt => apt.status === 'PENDING');
              const approvedAppointments = dayAppointments.filter(apt => apt.status === 'APPROVED');
              const cancelledAppointments = dayAppointments.filter(apt => apt.status === 'CANCELLED' || apt.status === 'REJECTED');

              return (
                <div className="space-y-6">
                  {/* Pending Appointments */}
                  {pendingAppointments.length > 0 && (
                    <div>
                      <h4 className="text-md font-medium text-yellow-800 dark:text-yellow-300 mb-3 flex items-center">
                        <Bell className="w-4 h-4 mr-2" />
                        Pending Approval ({pendingAppointments.length})
                      </h4>
                      <div className="space-y-3">
                        {pendingAppointments.map((appointment) => (
                          <div key={appointment.id} className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h5 className="font-medium text-gray-900 dark:text-white">{appointment.title}</h5>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                  {appointment.client?.name} &bull; {new Date(appointment.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({appointment.duration} min)
                                </p>
                                {appointment.description && (
                                  <p className="text-sm text-gray-700 dark:text-gray-300 mt-2">{appointment.description}</p>
                                )}
                              </div>
                              <div className="flex space-x-2 ml-4">
                                <button
                                  onClick={() => onApproveAppointment(appointment.id)}
                                  className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-colors"
                                  title="Approve"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => onRejectAppointment(appointment.id)}
                                  className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
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

                  {/* Approved Appointments */}
                  {approvedAppointments.length > 0 && (
                    <div>
                      <h4 className="text-md font-medium text-green-800 dark:text-green-300 mb-3 flex items-center">
                        <Calendar className="w-4 h-4 mr-2" />
                        Confirmed Appointments ({approvedAppointments.length})
                      </h4>
                      <div className="space-y-3">
                        {approvedAppointments.map((appointment) => (
                          <div key={appointment.id} className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h5 className="font-medium text-gray-900 dark:text-white">{appointment.title}</h5>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                  {appointment.client?.name} &bull; {new Date(appointment.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({appointment.duration} min)
                                </p>
                                {appointment.description && (
                                  <p className="text-sm text-gray-700 dark:text-gray-300 mt-2">{appointment.description}</p>
                                )}
                                {appointment.location && (
                                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{appointment.location}</p>
                                )}
                              </div>
                              <button
                                onClick={() => onViewAppointmentFromDay(appointment)}
                                className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
                              >
                                View Details
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Cancelled Appointments */}
                  {cancelledAppointments.length > 0 && (
                    <div>
                      <h4 className="text-md font-medium text-red-800 dark:text-red-300 mb-3 flex items-center">
                        <X className="w-4 h-4 mr-2" />
                        Cancelled Appointments ({cancelledAppointments.length})
                      </h4>
                      <div className="space-y-3">
                        {cancelledAppointments.map((appointment) => (
                          <div key={appointment.id} className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h5 className="font-medium text-gray-900 dark:text-white line-through">{appointment.title}</h5>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                  {appointment.client?.name} &bull; {new Date(appointment.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({appointment.duration} min)
                                </p>
                                {appointment.description && (
                                  <p className="text-sm text-gray-700 dark:text-gray-300 mt-2">{appointment.description}</p>
                                )}
                                {appointment.location && (
                                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{appointment.location}</p>
                                )}
                                {appointment.notes && (
                                  <p className="text-sm text-red-600 dark:text-red-400 mt-2 italic">Cancellation reason: {appointment.notes}</p>
                                )}
                              </div>
                              <div className="text-sm text-red-600 dark:text-red-400 font-medium">
                                CANCELLED
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {dayAppointments.length === 0 && (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                      <p>No appointments scheduled for this day</p>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </>
  );
}
