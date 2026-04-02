'use client';

import {
  Check,
  X,
  Mail,
  Clock,
  TrendingUp,
  Dumbbell,
  Apple,
  UserMinus,
} from 'lucide-react';
import { ContactSubmission } from '@/types';

interface Client {
  id: string;
  name: string;
  email: string;
}

interface ClientData {
  id: string;
  name: string;
  email: string;
  image?: string;
  profile?: {
    joinDate: string;
    age: number;
    height: string;
    weight: string;
    fitnessLevel: string;
    goals: string;
  };
  progress?: {
    startingWeight: string;
    currentWeight: string;
    weightChange: string;
    bodyFatPercentage: string;
    muscleMass: string;
    workoutStreak: number;
    totalEntries: number;
  };
  assignedWorkouts?: Array<{
    id: string;
    name: string;
    description: string;
    assignedDate: string;
    completed: boolean;
    duration: string;
    exercises: number;
  }>;
  assignedNutritionPlans?: Array<{
    id: string;
    name: string;
    description: string;
    startDate: string;
    endDate: string;
    dailyCalorieTarget: number;
    dailyProteinTarget: number;
    isActive: boolean;
  }>;
  recentProgress?: Array<{
    id: string;
    date: string;
    weight?: number;
    bodyFat?: number;
    muscleMass?: number;
    mood?: number;
    energy?: number;
    notes?: string;
  }>;
  recentFoodEntries?: Array<{
    id: string;
    foodName: string;
    quantity: number;
    unit: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    mealType: string;
    date: string;
    notes?: string;
  }>;
  nutritionStats?: {
    avgCalories: number;
    avgProtein: number;
    adherenceRate: string;
  };
  workoutProgress?: Array<{
    id: string;
    date: string;
    weight?: number;
    sets?: number;
    reps?: number;
    notes?: string;
    exercise?: {
      id: string;
      name: string;
    };
    workoutSession?: {
      id: string;
      workoutTemplate?: {
        id: string;
        name: string;
      };
    };
  }>;
}

interface NewClientData {
  name: string;
  email: string;
  phone: string;
  age: string;
  height: string;
  weight: string;
  fitnessLevel: string;
  goals: string;
}

interface ClientModalsProps {
  // Invitation Code Modal
  showInvitationCode: string | null;
  generatedCode: string;
  inviteEmailSent: boolean;
  inviteEmailError: string | null;
  resendingEmail: boolean;
  onCloseInvitationCode: () => void;
  onResendInviteEmail: (email: string, name: string, code: string) => void;

  // Submission Viewer Modal
  viewingSubmission: ContactSubmission | null;
  onCloseViewingSubmission: () => void;
  onApproveClient: (submission: ContactSubmission) => void;
  onUpdateSubmissionStatus: (id: string, status: string) => void;

  // Client Details Modal
  showClientDetails: string | null;
  selectedClientData: ClientData | null;
  selectedFoodEntryDate: string;
  selectedWorkoutProgressDate: string;
  onCloseClientDetails: () => void;
  onSelectedFoodEntryDateChange: (date: string) => void;
  onSelectedWorkoutProgressDateChange: (date: string) => void;
  onAssignWorkoutFromDetails: (clientId: string) => void;
  onCreateNutritionFromDetails: () => void;
  onRemoveClient: (clientId: string) => void;
  getMembershipDuration: (joinDate: string) => string;

  // Assign Workout Modal
  showAssignWorkout: string | null;
  clients: Client[];
  onCloseAssignWorkout: () => void;
  onCreateNewTemplate: () => void;

  // Add Client Modal
  showAddClient: boolean;
  newClientData: NewClientData;
  onCloseAddClient: () => void;
  onNewClientDataChange: (data: NewClientData) => void;
  onAddClientSubmit: (e: React.FormEvent) => void;
}

export default function ClientModals({
  showInvitationCode,
  generatedCode,
  inviteEmailSent,
  inviteEmailError,
  resendingEmail,
  onCloseInvitationCode,
  onResendInviteEmail,
  viewingSubmission,
  onCloseViewingSubmission,
  onApproveClient,
  onUpdateSubmissionStatus,
  showClientDetails,
  selectedClientData,
  selectedFoodEntryDate,
  selectedWorkoutProgressDate,
  onCloseClientDetails,
  onSelectedFoodEntryDateChange,
  onSelectedWorkoutProgressDateChange,
  onAssignWorkoutFromDetails,
  onCreateNutritionFromDetails,
  onRemoveClient,
  getMembershipDuration,
  showAssignWorkout,
  clients,
  onCloseAssignWorkout,
  onCreateNewTemplate,
  showAddClient,
  newClientData,
  onCloseAddClient,
  onNewClientDataChange,
  onAddClientSubmit,
}: ClientModalsProps) {
  const { toast } = useToast();
  return (
    <>
      {/* Invitation Code Modal */}
      {showInvitationCode && (
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Client Approved!</h3>
              <button
                onClick={onCloseInvitationCode}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-gray-600 dark:text-gray-400">
                Client has been approved! Share this invitation code with them:
              </p>

              {/* Email Status */}
              {inviteEmailSent ? (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 flex items-start space-x-2">
                  <Check className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-green-800 dark:text-green-300">Email Sent Successfully!</p>
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                      The invitation has been sent to {showInvitationCode}
                    </p>
                  </div>
                </div>
              ) : inviteEmailError ? (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 flex items-start space-x-2">
                  <X className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">Email Failed to Send</p>
                    <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                      You can try sending again or copy the code to share manually
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-3 flex items-start space-x-2">
                  <Mail className="w-5 h-5 text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-indigo-800 dark:text-indigo-300">Ready to Send Email</p>
                    <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1">
                      Click &quot;Send Email&quot; below to email the invitation to {showInvitationCode}
                    </p>
                  </div>
                </div>
              )}

              <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
                <div className="text-center">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Invitation Code</p>
                  <p className="text-2xl font-mono font-bold text-green-600 dark:text-green-400 tracking-widest">
                    {generatedCode}
                  </p>
                </div>
              </div>

              {/* Invitation URL */}
              <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Full Invitation Link:</p>
                <p className="text-xs font-mono text-gray-700 dark:text-gray-300 break-all">
                  {`${typeof window !== 'undefined' ? window.location.origin : ''}/invite/${generatedCode}`}
                </p>
              </div>

              <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-lg">
                <p className="text-sm text-indigo-800 dark:text-indigo-300">
                  <strong>Instructions for client:</strong><br/>
                  1. Go to the sign-up page<br/>
                  2. Enter this invitation code<br/>
                  3. Complete their account setup<br/>
                  4. Start their fitness journey!
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(generatedCode);
                    toast('Invitation code copied to clipboard!', 'success');
                  }}
                  className="px-4 py-2 text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-colors flex items-center justify-center space-x-2"
                >
                  <span>Copy Code</span>
                </button>
                <button
                  onClick={() => {
                    const inviteUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/invite/${generatedCode}`;
                    navigator.clipboard.writeText(inviteUrl);
                    toast('Invitation link copied to clipboard!', 'success');
                  }}
                  className="px-4 py-2 text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-900/30 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors flex items-center justify-center space-x-2"
                >
                  <span>Copy Link</span>
                </button>
              </div>

              {/* Send Email Button */}
              {!inviteEmailSent && (
                <button
                  onClick={() => {
                    if (showInvitationCode) {
                      onResendInviteEmail(
                        showInvitationCode,
                        showInvitationCode.split('@')[0],
                        generatedCode
                      );
                    }
                  }}
                  disabled={resendingEmail}
                  className={`w-full px-4 py-2 rounded-lg transition-colors flex items-center justify-center space-x-2 ${
                    resendingEmail
                      ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                      : 'bg-indigo-600 text-white hover:bg-indigo-700'
                  }`}
                >
                  <Mail className="w-4 h-4" />
                  <span>{resendingEmail ? 'Sending...' : inviteEmailError ? 'Resend Invitation Email' : 'Send Invitation Email'}</span>
                </button>
              )}

              <div className="flex space-x-3">
                <button
                  onClick={onCloseInvitationCode}
                  className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Contact Submission Details Modal */}
      {viewingSubmission && (
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Contact Submission Details</h3>
              <button
                onClick={onCloseViewingSubmission}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Status Badge */}
              <div className="flex items-center space-x-3">
                <span className={`px-3 py-1 text-sm rounded-full ${
                  viewingSubmission.status === 'NEW'
                    ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                    : viewingSubmission.status === 'CONTACTED'
                    ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
                    : 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                }`}>
                  {viewingSubmission.status}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Submitted {new Date(viewingSubmission.createdAt).toLocaleDateString()} at {new Date(viewingSubmission.createdAt).toLocaleTimeString()}
                </span>
              </div>

              {/* Contact Information */}
              <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Contact Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Name</label>
                    <p className="text-gray-900 dark:text-white">{viewingSubmission.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Email</label>
                    <p className="text-gray-900 dark:text-white">{viewingSubmission.email}</p>
                  </div>
                  {viewingSubmission.phone && (
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Phone</label>
                      <p className="text-gray-900 dark:text-white">{viewingSubmission.phone}</p>
                    </div>
                  )}
                  {viewingSubmission.age && (
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Age</label>
                      <p className="text-gray-900 dark:text-white">{viewingSubmission.age}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Fitness Information */}
              {viewingSubmission.fitnessLevel && (
                <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Fitness Information</h4>
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Fitness Level</label>
                    <p className="text-gray-900 dark:text-white">{viewingSubmission.fitnessLevel}</p>
                  </div>
                </div>
              )}

              {/* Message */}
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Message</h4>
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{viewingSubmission.message}</p>
              </div>

              {/* Goals */}
              {viewingSubmission.fitnessGoals && (
                <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Fitness Goals</h4>
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{viewingSubmission.fitnessGoals}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex space-x-3 pt-4 border-t dark:border-gray-700">
                {viewingSubmission.status === 'NEW' && (
                  <>
                    <button
                      onClick={() => {
                        onApproveClient(viewingSubmission);
                        onCloseViewingSubmission();
                      }}
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center space-x-2"
                    >
                      <Check className="w-4 h-4" />
                      <span>Accept & Send Invitation</span>
                    </button>
                    <button
                      onClick={() => {
                        onUpdateSubmissionStatus(viewingSubmission.id, 'COMPLETED');
                        onCloseViewingSubmission();
                      }}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center space-x-2"
                    >
                      <X className="w-4 h-4" />
                      <span>Reject Application</span>
                    </button>
                  </>
                )}
                <button
                  onClick={onCloseViewingSubmission}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Client Details Modal */}
      {showClientDetails && selectedClientData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-semibold text-gray-900 dark:text-white">Client Details</h3>
              <button
                onClick={onCloseClientDetails}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Client Header */}
            <div className="bg-indigo-50 dark:bg-indigo-500/8 rounded-xl p-6 mb-6 border border-indigo-100 dark:border-indigo-500/10">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center overflow-hidden ring-2 ring-indigo-500/20">
                  {selectedClientData.image ? (
                    <img src={selectedClientData.image} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-white text-xl font-bold">
                      {selectedClientData.name.split(' ').map((n: string) => n[0]).join('')}
                    </span>
                  )}
                </div>
                <div>
                  <h4 className="text-xl font-bold text-gray-900 dark:text-white">{selectedClientData.name}</h4>
                  <p className="text-gray-600 dark:text-gray-400">{selectedClientData.email}</p>
                  <div className="flex items-center space-x-4 mt-2">
                    <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                      <Clock className="w-4 h-4 mr-1" />
                      <span className="font-medium">Joined:</span>
                      <span className="ml-1">
                        {selectedClientData.profile?.joinDate ? new Date(selectedClientData.profile.joinDate).toLocaleDateString() : 'Unknown'}
                      </span>
                    </div>
                    {selectedClientData.profile?.joinDate && (
                      <span className="text-sm text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/30 px-3 py-1 rounded-full font-medium">
                        {getMembershipDuration(selectedClientData.profile.joinDate)} as client
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Profile Information */}
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                <h5 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Profile Information</h5>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Age:</span>
                    <span className="font-medium text-gray-900 dark:text-white dark:text-white">{selectedClientData.profile?.age} years</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Height:</span>
                    <span className="font-medium text-gray-900 dark:text-white dark:text-white">{selectedClientData.profile?.height}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Current Weight:</span>
                    <span className="font-medium text-gray-900 dark:text-white dark:text-white">{selectedClientData.profile?.weight}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Fitness Level:</span>
                    <span className="font-medium text-gray-900 dark:text-white dark:text-white">{selectedClientData.profile?.fitnessLevel}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Primary Goal:</span>
                    <span className="font-medium text-gray-900 dark:text-white dark:text-white">{selectedClientData.profile?.goals}</span>
                  </div>
                </div>
              </div>

              {/* Progress Stats */}
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                <h5 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Progress Overview</h5>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Current Weight:</span>
                    <span className="font-medium text-gray-900 dark:text-white dark:text-white">{selectedClientData.progress?.currentWeight}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Weight Change:</span>
                    <span className={`font-medium ${selectedClientData.progress?.weightChange?.includes('-') ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {selectedClientData.progress?.weightChange}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Progress Streak:</span>
                    <span className="font-medium text-purple-600 dark:text-purple-400">{selectedClientData.progress?.workoutStreak} days</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Total Entries:</span>
                    <span className="font-medium text-indigo-600 dark:text-indigo-400">{selectedClientData.progress?.totalEntries}</span>
                  </div>
                  {selectedClientData.progress?.totalEntries === 0 && (
                    <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                      <TrendingUp className="w-8 h-8 mx-auto mb-2 text-gray-400 dark:text-gray-500" />
                      <p className="text-sm">No progress data available yet</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Assigned Workouts */}
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                <h5 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Assigned Workouts</h5>
                <div className="space-y-3">
                  {selectedClientData.assignedWorkouts && selectedClientData.assignedWorkouts.length > 0 ? (
                    selectedClientData.assignedWorkouts.map((workout, index: number) => (
                      <div key={index} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{workout.name}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Assigned: {workout.assignedDate}</p>
                          <p className="text-xs text-gray-400 dark:text-gray-500">{workout.exercises} exercises</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium dark:text-gray-300">{workout.duration}</p>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            workout.completed ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
                          }`}>
                            {workout.completed ? 'Completed' : 'Pending'}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                      <Dumbbell className="w-8 h-8 mx-auto mb-2 text-gray-400 dark:text-gray-500" />
                      <p>No workouts assigned yet</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Assigned Nutrition Plans */}
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                <h5 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Assigned Nutrition Plans</h5>
                <div className="space-y-3">
                  {selectedClientData.assignedNutritionPlans && selectedClientData.assignedNutritionPlans.length > 0 ? (
                    selectedClientData.assignedNutritionPlans.map((plan, index: number) => (
                      <div key={index} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{plan.name}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{plan.startDate} - {plan.endDate}</p>
                          </div>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            plan.isActive ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' : 'bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-400'
                          }`}>
                            {plan.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 dark:text-gray-400">
                          <div>Calories: {plan.dailyCalorieTarget}</div>
                          <div>Protein: {plan.dailyProteinTarget}g</div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                      <Apple className="w-8 h-8 mx-auto mb-2 text-gray-400 dark:text-gray-500" />
                      <p>No nutrition plans assigned yet</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Nutrition Stats */}
              {selectedClientData.nutritionStats && (
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                  <h5 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Nutrition Overview (Last 7 Days)</h5>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                      <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{selectedClientData.nutritionStats.avgCalories}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Avg Calories/Day</p>
                    </div>
                    <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <p className="text-2xl font-bold text-green-600 dark:text-green-400">{selectedClientData.nutritionStats.avgProtein}g</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Avg Protein/Day</p>
                    </div>
                    <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                      <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{selectedClientData.nutritionStats.adherenceRate}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Plan Adherence</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Recent Food Entries */}
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                <div className="flex justify-between items-center mb-4">
                  <h5 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Food Entries</h5>
                  {selectedClientData.recentFoodEntries && selectedClientData.recentFoodEntries.length > 0 && (
                    <select
                      value={selectedFoodEntryDate}
                      onChange={(e) => onSelectedFoodEntryDateChange(e.target.value)}
                      className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 dark:text-white dark:text-white bg-white dark:bg-gray-700 min-w-[120px]"
                    >
                      <option value="all">All Days</option>
                      {(() => {
                        const uniqueDates = Array.from(new Set(selectedClientData.recentFoodEntries.map(entry => entry.date)));
                        return uniqueDates
                          .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
                          .map(date => {
                            const formattedDate = typeof date === 'string' && date.includes('-')
                              ? (() => {
                                  const [year, month, day] = date.split('-');
                                  return `${month}/${day}/${year}`;
                                })()
                              : new Date(date).toLocaleDateString();

                            return (
                              <option key={date} value={date}>
                                {formattedDate}
                              </option>
                            );
                          });
                      })()}
                    </select>
                  )}
                </div>

                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {selectedClientData.recentFoodEntries && selectedClientData.recentFoodEntries.length > 0 ? (
                    (() => {
                      const filteredEntries = selectedFoodEntryDate === 'all'
                        ? selectedClientData.recentFoodEntries
                        : selectedClientData.recentFoodEntries.filter(entry => entry.date === selectedFoodEntryDate);

                      if (filteredEntries.length === 0) {
                        return (
                          <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                            <Apple className="w-8 h-8 mx-auto mb-2 text-gray-400 dark:text-gray-500" />
                            <p>No food entries for selected date</p>
                          </div>
                        );
                      }

                      // Group entries by date when showing all days
                      if (selectedFoodEntryDate === 'all') {
                        const groupedEntries = filteredEntries.reduce((groups: Record<string, typeof filteredEntries>, entry) => {
                          if (!groups[entry.date]) {
                            groups[entry.date] = [];
                          }
                          groups[entry.date].push(entry);
                          return groups;
                        }, {});

                        return Object.entries(groupedEntries)
                          .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
                          .map(([date, entries]) => (
                            <div key={date}>
                              <div className="sticky top-0 bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded-lg mb-2">
                                <h6 className="font-medium text-gray-700 dark:text-gray-300 text-sm">
                                  {new Date(date).toLocaleDateString('en-US', {
                                    weekday: 'short',
                                    month: 'short',
                                    day: 'numeric'
                                  })}
                                  <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                                    ({entries.reduce((sum, entry) => sum + entry.calories, 0)} cal total)
                                  </span>
                                </h6>
                              </div>
                              {entries.map((entry, index: number) => (
                                <div key={`${date}-${index}`} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg mb-2">
                                  <div className="flex justify-between items-start mb-2">
                                    <div>
                                      <p className="font-medium text-gray-900 dark:text-white">{entry.foodName}</p>
                                      <p className="text-sm text-gray-500 dark:text-gray-400">{entry.quantity} {entry.unit}</p>
                                      <span className="inline-block text-xs px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 rounded-full mt-1">
                                        {entry.mealType}
                                      </span>
                                    </div>
                                    <div className="text-right">
                                      <p className="text-sm font-medium text-red-600 dark:text-red-400">{entry.calories} cal</p>
                                      <p className="text-xs text-gray-500 dark:text-gray-400">P:{entry.protein}g C:{entry.carbs}g F:{entry.fat}g</p>
                                    </div>
                                  </div>
                                  {entry.notes && (
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{entry.notes}</p>
                                  )}
                                </div>
                              ))}
                            </div>
                          ));
                      } else {
                        // Show entries for selected date only
                        return filteredEntries.map((entry, index: number) => (
                          <div key={index} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <p className="font-medium text-gray-900 dark:text-white">{entry.foodName}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{entry.quantity} {entry.unit}</p>
                                <span className="inline-block text-xs px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 rounded-full mt-1">
                                  {entry.mealType}
                                </span>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-medium text-red-600 dark:text-red-400">{entry.calories} cal</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">P:{entry.protein}g C:{entry.carbs}g F:{entry.fat}g</p>
                              </div>
                            </div>
                            {entry.notes && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{entry.notes}</p>
                            )}
                          </div>
                        ));
                      }
                    })()
                  ) : (
                    <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                      <Apple className="w-8 h-8 mx-auto mb-2 text-gray-400 dark:text-gray-500" />
                      <p>No food entries logged yet</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Recent Progress Entries */}
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                <h5 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Progress Entries</h5>
                <div className="space-y-3">
                  {selectedClientData.recentProgress && selectedClientData.recentProgress.length > 0 ? (
                    selectedClientData.recentProgress.map((entry, index: number) => (
                      <div key={index} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <div className="flex justify-between items-center mb-1">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {new Date(entry.date).toLocaleDateString()}
                          </p>
                          {entry.weight && (
                            <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400">{entry.weight} lbs</p>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 dark:text-gray-400">
                          {entry.mood && <div>Mood: {entry.mood}/10</div>}
                          {entry.energy && <div>Energy: {entry.energy}/10</div>}
                          {entry.bodyFat && <div>Body Fat: {entry.bodyFat}%</div>}
                          {entry.muscleMass && <div>Muscle: {entry.muscleMass} lbs</div>}
                        </div>
                        {entry.notes && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{entry.notes}</p>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                      <TrendingUp className="w-8 h-8 mx-auto mb-2 text-gray-400 dark:text-gray-500" />
                      <p>No progress entries yet</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Workout Progress */}
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                <div className="flex justify-between items-center mb-4">
                  <h5 className="text-lg font-semibold text-gray-900 dark:text-white">Workout Progress</h5>
                  {selectedClientData.workoutProgress && selectedClientData.workoutProgress.length > 0 && (
                    <select
                      value={selectedWorkoutProgressDate}
                      onChange={(e) => onSelectedWorkoutProgressDateChange(e.target.value)}
                      className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 dark:text-white dark:text-white bg-white dark:bg-gray-700 min-w-[120px]"
                    >
                      <option value="all">All Days</option>
                      {(() => {
                        const uniqueDates = Array.from(new Set(selectedClientData.workoutProgress.map(entry => entry.date)));
                        return uniqueDates
                          .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
                          .map(date => {
                            const formattedDate = new Date(date).toLocaleDateString();
                            return (
                              <option key={date} value={date}>
                                {formattedDate}
                              </option>
                            );
                          });
                      })()}
                    </select>
                  )}
                </div>
                <div className="space-y-3">
                  {selectedClientData.workoutProgress && selectedClientData.workoutProgress.length > 0 ? (
                    (() => {
                      const filteredProgress = selectedWorkoutProgressDate === 'all'
                        ? selectedClientData.workoutProgress
                        : (() => {
                            const results = selectedClientData.workoutProgress.filter(entry => {
                              const match = entry.date === selectedWorkoutProgressDate;
                              return match;
                            });
                            return results;
                          })();

                      if (filteredProgress.length === 0) {
                        return (
                          <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                            <Dumbbell className="w-8 h-8 mx-auto mb-2 text-gray-400 dark:text-gray-500" />
                            <p>No workout progress for selected date</p>
                          </div>
                        );
                      }

                      return filteredProgress.map((progress, index: number) => (
                        <div key={index} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                        <div className="flex justify-between items-center mb-3">
                          <div>
                            <h6 className="text-sm font-semibold text-gray-900 dark:text-white">
                              {progress.workoutSession?.workoutTemplate?.name || 'Workout'}
                            </h6>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {new Date(progress.date).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-500 dark:text-gray-400">Session</p>
                            <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
                              {progress.workoutSession?.id || 'N/A'}
                            </p>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              {progress.exercise?.name || 'Exercise'}
                            </span>
                            <div className="flex space-x-3 text-sm text-gray-600 dark:text-gray-400">
                              {progress.weight && (
                                <span className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300 px-2 py-1 rounded-md">
                                  {progress.weight} lbs
                                </span>
                              )}
                              {progress.sets && (
                                <span className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 px-2 py-1 rounded-md">
                                  {progress.sets} sets
                                </span>
                              )}
                              {progress.reps && (
                                <span className="bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 px-2 py-1 rounded-md">
                                  {progress.reps} reps
                                </span>
                              )}
                            </div>
                          </div>

                          {progress.notes && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 italic mt-2">
                              Notes: {progress.notes}
                            </p>
                          )}
                        </div>
                      </div>
                      ));
                    })()
                  ) : (
                    <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                      <Dumbbell className="w-8 h-8 mx-auto mb-2 text-gray-400 dark:text-gray-500" />
                      <p>No workout progress logged yet</p>
                      <p className="text-xs mt-1">Client workouts will appear here once they start logging exercises</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => onAssignWorkoutFromDetails(selectedClientData.id)}
                className="flex-1 px-4 py-2 text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center space-x-2"
              >
                <Dumbbell className="w-4 h-4" />
                <span>Assign Workout</span>
              </button>
              <button
                onClick={onCreateNutritionFromDetails}
                className="flex-1 px-4 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center space-x-2"
              >
                <Apple className="w-4 h-4" />
                <span>Create Nutrition Plan</span>
              </button>
              <button
                onClick={() => onRemoveClient(selectedClientData.id)}
                className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center space-x-2"
              >
                <UserMinus className="w-4 h-4" />
                <span>Remove Client</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Workout Modal */}
      {showAssignWorkout && (
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Assign Workout</h3>
              <button
                onClick={onCloseAssignWorkout}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Client Info */}
            <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-4 mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-medium">
                    {clients.find(c => c.id === showAssignWorkout)?.name.split(' ').map(n => n[0]).join('') || '?'}
                  </span>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white">
                    {clients.find(c => c.id === showAssignWorkout)?.name || 'Client'}
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {clients.find(c => c.id === showAssignWorkout)?.email || ''}
                  </p>
                </div>
              </div>
            </div>

            {/* Workout Templates */}
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Select Workout Template</h4>
              <div className="space-y-3">
                {[
                  {
                    id: '1',
                    name: 'Upper Body Strength',
                    description: 'Focus on chest, shoulders, and arms',
                    duration: '45 min',
                    difficulty: 'Intermediate',
                    exercises: ['Push-ups', 'Bench Press', 'Shoulder Press', 'Bicep Curls']
                  },
                  {
                    id: '2',
                    name: 'Lower Body Power',
                    description: 'Legs and glutes strength training',
                    duration: '50 min',
                    difficulty: 'Advanced',
                    exercises: ['Squats', 'Deadlifts', 'Lunges', 'Leg Press']
                  },
                  {
                    id: '3',
                    name: 'Cardio HIIT',
                    description: 'High-intensity interval training',
                    duration: '30 min',
                    difficulty: 'Beginner',
                    exercises: ['Burpees', 'Mountain Climbers', 'Jump Rope', 'Sprint Intervals']
                  }
                ].map((workout) => (
                  <div key={workout.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h5 className="font-semibold text-gray-900 dark:text-white">{workout.name}</h5>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{workout.description}</p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        workout.difficulty === 'Beginner' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' :
                        workout.difficulty === 'Intermediate' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300' :
                        'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                      }`}>
                        {workout.difficulty}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm text-gray-500 dark:text-gray-400 mb-3">
                      <span>
                        Duration: {workout.duration || 'Not specified'}
                      </span>
                      <span>{workout.exercises.length} exercises</span>
                    </div>
                    <div className="flex flex-wrap gap-1 mb-3">
                      {workout.exercises.map((exercise, idx) => (
                        <span key={idx} className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded">
                          {exercise}
                        </span>
                      ))}
                    </div>
                    <button
                      onClick={async () => {
                        try {
                          const response = await fetch('/api/clients', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              clientId: showAssignWorkout,
                              workoutId: workout.id,
                              notes: `Assigned ${workout.name} workout template`
                            })
                          });

                          if (response.ok) {
                            onCloseAssignWorkout();
                            toast(`Successfully assigned "${workout.name}" to client!`, 'info');
                          } else {
                            toast('Failed to assign workout. Please try again.', 'error');
                          }
                        } catch (error) {
                          console.error('Error assigning workout:', error);
                          toast('Error assigning workout. Please try again.', 'error');
                        }
                      }}
                      className="w-full bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                      Assign This Workout
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Custom Notes */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-900 dark:text-white dark:text-gray-200 mb-2">
                Additional Notes (Optional)
              </label>
              <textarea
                placeholder="Add any specific instructions or modifications..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 dark:text-white dark:text-white dark:bg-gray-700"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3">
              <button
                onClick={onCloseAssignWorkout}
                className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={onCreateNewTemplate}
                className="flex-1 px-4 py-2 text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors"
              >
                Create New Template
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Client Modal */}
      {showAddClient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Add New Client</h3>
              <button
                onClick={onCloseAddClient}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={onAddClientSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-white dark:text-gray-200 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={newClientData.name}
                    onChange={(e) => onNewClientDataChange({...newClientData, name: e.target.value})}
                    placeholder="Enter client's full name"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 dark:text-white dark:text-white dark:bg-gray-700"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-white dark:text-gray-200 mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={newClientData.email}
                    onChange={(e) => onNewClientDataChange({...newClientData, email: e.target.value})}
                    placeholder="client@example.com"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 dark:text-white dark:text-white dark:bg-gray-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-white dark:text-gray-200 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={newClientData.phone}
                    onChange={(e) => onNewClientDataChange({...newClientData, phone: e.target.value})}
                    placeholder="(555) 123-4567"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 dark:text-white dark:text-white dark:bg-gray-700"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-white dark:text-gray-200 mb-1">Age</label>
                  <input
                    type="number"
                    value={newClientData.age}
                    onChange={(e) => onNewClientDataChange({...newClientData, age: e.target.value})}
                    placeholder="25"
                    min="16"
                    max="100"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 dark:text-white dark:text-white dark:bg-gray-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-white dark:text-gray-200 mb-1">Height</label>
                  <input
                    type="text"
                    value={newClientData.height}
                    onChange={(e) => onNewClientDataChange({...newClientData, height: e.target.value})}
                    placeholder="5'8&quot; or 173cm"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 dark:text-white dark:text-white dark:bg-gray-700"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-white dark:text-gray-200 mb-1">Current Weight</label>
                  <input
                    type="text"
                    value={newClientData.weight}
                    onChange={(e) => onNewClientDataChange({...newClientData, weight: e.target.value})}
                    placeholder="150 lbs or 68 kg"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 dark:text-white dark:text-white dark:bg-gray-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-white dark:text-gray-200 mb-1">Fitness Level</label>
                <select
                  value={newClientData.fitnessLevel}
                  onChange={(e) => onNewClientDataChange({...newClientData, fitnessLevel: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 dark:text-white dark:text-white dark:bg-gray-700"
                >
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-white dark:text-gray-200 mb-1">Fitness Goals</label>
                <textarea
                  value={newClientData.goals}
                  onChange={(e) => onNewClientDataChange({...newClientData, goals: e.target.value})}
                  placeholder="Describe their fitness goals and what they want to achieve..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 dark:text-white dark:text-white dark:bg-gray-700"
                />
              </div>

              <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-4">
                <div className="flex items-start space-x-2">
                  <div className="text-indigo-600 dark:text-indigo-400 mt-0.5">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="text-sm text-indigo-700 dark:text-indigo-300">
                    <p className="font-medium mb-1">Account Setup Information:</p>
                    <ul className="space-y-1 text-indigo-600 dark:text-indigo-400">
                      <li>- Client will receive an email with login instructions</li>
                      <li>- A secure temporary password will be generated and shown to you once</li>
                      <li>- They will be required to change their password on first login</li>
                      <li>- Automatically assigned to you as their trainer</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={onCloseAddClient}
                  className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 text-white font-semibold bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Create Client Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
