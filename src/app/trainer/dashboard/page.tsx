'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { 
  Calendar, 
  Activity, 
  Users,
  Dumbbell,
  Apple,
  Bell,
  Home,
  Settings,
  LogOut,
  Plus,
  Search,
  Filter,
  MoreVertical,
  TrendingUp,
  Mail,
  Phone,
  Check,
  X,
  Eye,
  UserMinus,
  Edit,
  Trash2,
  Clock
} from 'lucide-react';
import OptimizedImage from '@/components/OptimizedImage';
import { imagePlaceholders } from '@/lib/imagePlaceholders';
import { Appointment, ContactSubmission } from '@/types';
import NotificationSystem from '@/components/NotificationSystem';
import TrainerProgressCharts from '@/components/TrainerProgressCharts';
import DailyProgressView from '@/components/DailyProgressView';

interface ProgressEntry {
  id: string;
  date: string;
  weight?: number;
  bodyFat?: number;
  muscleMass?: number;
  mood?: number;
  energy?: number;
  notes?: string;
}

interface ProgressAnalytics {
  weight: {
    current: number | null;
    starting: number | null;
    average?: number | null;
    change: {
      daily: number | null;
      total: number | null;
      percentage: number | null;
    };
    trend: string;
  };
  bodyFat?: {
    current: number | null;
    starting: number | null;
    average?: number | null;
    change: {
      total: number | null;
    };
  };
  wellness?: {
    averageMood: number | null;
  };
  summary: {
    consistency: {
      streak: number;
      entriesPerWeek: number;
    };
    dateRange: {
      daysCovered: number;
    };
    totalEntries: number;
  };
  avgWeight?: number;
  weightChange?: number;
  totalEntries: number;
}

interface WorkoutSession {
  id: string;
  workout: {
    name: string;
    description: string;
    estimatedDuration?: string;
    exercises: Exercise[];
  };
  startTime: string;
  completed: boolean;
}

interface Exercise {
  id: string;
  name: string;
  description?: string;
}

interface NutritionPlan {
  id: string;
  name?: string;
  title?: string;
  description: string;
  startDate?: string;
  endDate?: string;
  totalCalories?: number;
  dailyCalorieTarget?: number;
  dailyProteinTarget?: number;
  dailyCarbTarget?: number;
  dailyFatTarget?: number;
  isActive?: boolean;
  assignedUsers?: Array<{
    id: string;
    name: string;
    email: string;
  }>;
  assignedClientsCount?: number;
  isTemplate?: boolean;
}

interface FoodEntry {
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
}

interface Client {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  lastActivity?: string;
  progress?: {
    currentWeight: number;
    goalWeight: number;
    workoutStreak: number;
  };
}

interface RecentWorkout {
  workout: string;
  date: string;
  duration: string;
  completed: boolean;
}

interface ClientData {
  id: string;
  name: string;
  email: string;
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
  recentWorkouts?: RecentWorkout[];
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

interface WorkoutTemplate {
  id: string;
  title: string;
  description: string;
  duration?: number;
  startDate?: string;
  endDate?: string;
  difficulty?: string;
  type?: string;
  exercises: Array<{
    id: string;
    exercise: {
      id: string;
      name: string;
      description: string;
      sets: number;
      reps: string;
      weight?: number;
      duration?: number;
      restTime: number;
    };
    order: number;
    sets: number;
    reps: string;
    weight?: number;
    duration?: number;
    restTime: number;
    notes?: string;
  }>;
  sessions: Array<{
    id: string;
    user: {
      id: string;
      name: string;
      email: string;
    };
  }>;
  createdAt: Date;
  // For assigned workouts (sessions)
  workout?: {
    title: string;
    duration?: number;
    difficulty?: string;
    exercises: Array<{
      exercise: {
        name: string;
      };
    }>;
  };
  user?: {
    id: string;
    name: string;
    email: string;
  };
  startTime?: Date;
  completed?: boolean;
  notes?: string;
}

interface AvailableExercise {
  id: string;
  name: string;
  description: string;
  sets: number;
  reps: string;
  weight?: number;
  duration?: number;
  restTime: number;
  muscleGroups?: string;
  targetMuscle?: string;
  difficulty?: string;
  instructions?: string;
  equipment?: string;
  category?: string;
}

const TrainerDashboard = () => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('overview');
  const [userSettings, setUserSettings] = useState({
    notifications: true,
    emailUpdates: true,
    autoApproval: false,
    theme: 'light',
    units: 'imperial',
    clientVisibility: 'all'
  });
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<Client[]>([]);
  
  // Helper function to calculate membership duration
  const getMembershipDuration = (joinDate: string): string => {
    const now = new Date();
    const joined = new Date(joinDate);
    const diffTime = Math.abs(now.getTime() - joined.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Joined today';
    if (diffDays === 1) return '1 day';
    if (diffDays < 7) return `${diffDays} days`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? 's' : ''}`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} month${Math.floor(diffDays / 30) > 1 ? 's' : ''}`;
    return `${Math.floor(diffDays / 365)} year${Math.floor(diffDays / 365) > 1 ? 's' : ''}`;
  };
  
  // CRITICAL: Verify trainer access with better session handling
  useEffect(() => {
    
    // Don't redirect while session is still loading
    if (status === 'loading') {
      return;
    }
    
    // Only redirect after session has finished loading
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }
    
    // Check for password change requirement first
    if (session && session.user.passwordChangeRequired) {
      router.push('/auth/change-password');
      return;
    }
    
    if (session && session.user.role !== 'TRAINER') {
      if (session.user.role === 'CLIENT') {
        router.push('/client/dashboard');
      } else {
        router.push('/');
      }
      return;
    }
  }, [session, status, router]);
  
  const [contactSubmissions, setContactSubmissions] = useState<ContactSubmission[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showDayModal, setShowDayModal] = useState(false);
  const [workoutTemplates, setWorkoutTemplates] = useState<WorkoutTemplate[]>([]);
  const [assignedWorkouts, setAssignedWorkouts] = useState<WorkoutTemplate[]>([]);
  const [availableExercises, setAvailableExercises] = useState<AvailableExercise[]>([]);
  const [nutritionPlans, setNutritionPlans] = useState<NutritionPlan[]>([]);
  const [clientsProgress, setClientsProgress] = useState<Record<string, { entries: ProgressEntry[]; analytics: ProgressAnalytics; }>>({});
  const [selectedClientProgress, setSelectedClientProgress] = useState<string | null>(null);
  const [trainerProgressView, setTrainerProgressView] = useState<'charts' | 'daily'>('charts');
  const [stats, setStats] = useState({
    totalClients: 0,
    activeClients: 0,
    newSubmissions: 0,
    totalWorkouts: 0,
    pendingAppointments: 0
  });
  
  // Modal states
  const [showCreateWorkout, setShowCreateWorkout] = useState(false);
  const [showCreateNutrition, setShowCreateNutrition] = useState(false);
  const [showClientMenu, setShowClientMenu] = useState<string | null>(null);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState<string | null>(null);
  const [removeAction, setRemoveAction] = useState<'remove' | 'delete'>('remove');
  const [showClientDetails, setShowClientDetails] = useState<string | null>(null);
  const [loadingClientDetails, setLoadingClientDetails] = useState<string | null>(null);
  const [showAssignWorkout, setShowAssignWorkout] = useState<string | null>(null);
  const [selectedClientData, setSelectedClientData] = useState<ClientData | null>(null);
  const [selectedFoodEntryDate, setSelectedFoodEntryDate] = useState<string>('all');
  const [selectedWorkoutProgressDate, setSelectedWorkoutProgressDate] = useState<string>('all');
  const [showAddClient, setShowAddClient] = useState(false);
  const [showAssignWorkoutModal, setShowAssignWorkoutModal] = useState<string | null>(null);
  const [showScheduleSession, setShowScheduleSession] = useState(false);
  const [showEditWorkout, setShowEditWorkout] = useState<string | null>(null);
  const [editingWorkout, setEditingWorkout] = useState<WorkoutTemplate | null>(null);
  const [workoutFormData, setWorkoutFormData] = useState({
    title: '',
    description: '',
    duration: 60, // Duration in minutes
    startDate: '',
    endDate: '',
    difficulty: 'BEGINNER',
    type: 'STRENGTH',
    exercises: [] as Array<{
      exerciseId: string;
      sets: number;
      reps: number;
      weight?: number;
      duration?: number;
      restTime: number;
      notes: string;
      order: number;
    }>
  });

  const [nutritionFormData, setNutritionFormData] = useState({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    clientId: '', // Add client selection
    assignToClient: false, // Toggle for immediate assignment
    dailyCalorieTarget: 2000,
    dailyProteinTarget: 150,
    dailyCarbTarget: 200,
    dailyFatTarget: 70
  });
  const [scheduleFormData, setScheduleFormData] = useState({
    clientId: '',
    title: '',
    type: 'TRAINING_SESSION',
    date: '',
    time: '',
    duration: 60,
    location: '',
    description: '',
    notes: ''
  });
  const [exerciseSearchTerm, setExerciseSearchTerm] = useState('');
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [showAssignNutrition, setShowAssignNutrition] = useState<string | null>(null);
  const [showEditNutrition, setShowEditNutrition] = useState<string | null>(null);
  const [editingNutrition, setEditingNutrition] = useState<NutritionPlan | null>(null);
  const [showDeleteNutritionConfirm, setShowDeleteNutritionConfirm] = useState<string | null>(null);
  const [showInvitationCode, setShowInvitationCode] = useState<string | null>(null);
  const [generatedCode, setGeneratedCode] = useState<string>('');
  const [inviteEmailSent, setInviteEmailSent] = useState<boolean>(false);
  const [inviteEmailError, setInviteEmailError] = useState<string | null>(null);
  const [resendingEmail, setResendingEmail] = useState<boolean>(false);
  const [viewingSubmission, setViewingSubmission] = useState<ContactSubmission | null>(null);
  const [viewingAppointment, setViewingAppointment] = useState<Appointment | null>(null);
  
  // Password Reset States
  const [showPasswordResetModal, setShowPasswordResetModal] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  
  // Exercise Management States
  const [showCreateExercise, setShowCreateExercise] = useState(false);
  const [showEditExercise, setShowEditExercise] = useState<string | null>(null);
  const [editingExercise, setEditingExercise] = useState<AvailableExercise | null>(null);
  const [showDeleteExerciseConfirm, setShowDeleteExerciseConfirm] = useState<string | null>(null);
  const [exerciseFilter, setExerciseFilter] = useState('all');
  const [exerciseFormData, setExerciseFormData] = useState({
    name: '',
    targetMuscle: '',
    difficulty: 'BEGINNER',
    instructions: '',
    equipment: 'BODYWEIGHT',
    category: 'STRENGTH'
  });
  const [newClientData, setNewClientData] = useState({
    name: '',
    email: '',
    phone: '',
    age: '',
    height: '',
    weight: '',
    fitnessLevel: 'Beginner',
    goals: ''
  });

  // Fetch functions
  const fetchClients = async () => {
    try {
      const response = await fetch('/api/clients');
      
      if (response.ok) {
        const data = await response.json();
        setClients(data);
        setStats(prev => ({ ...prev, totalClients: data.length, activeClients: data.length }));
      } else {
        console.error('❌ Failed to fetch clients:', response.status, response.statusText);
        
        // If unauthorized, retry after delay (session might be loading)
        if (response.status === 401) {
          setTimeout(fetchClients, 5000);
          return;
        }
        
        // For other errors, show mock data with real client info
        const mockClients = [
          {
            id: 'cmfn3t3ic0002xninyonutrrn',
            name: 'Branden Vincent-Walker',
            email: 'branden574@gmail.com',
            createdAt: '2024-09-16T22:07:43.338Z',
            lastActivity: '2024-09-17T10:00:00.000Z',
            progress: {
              currentWeight: 180,
              goalWeight: 170,
              workoutStreak: 5
            }
          }
        ];
        setClients(mockClients);
        setStats(prev => ({ ...prev, totalClients: mockClients.length, activeClients: mockClients.length }));
      }
    } catch (error) {
      console.error('❌ Network error fetching clients:', error);
      
      // Retry after delay on network errors
      setTimeout(fetchClients, 5000);
      
      // Fallback to mock data with real client info in the meantime
      const mockClients = [
        {
          id: 'cmfn3t3ic0002xninyonutrrn',
          name: 'Branden Vincent-Walker',
          email: 'branden574@gmail.com',
          createdAt: '2024-09-16T22:07:43.338Z',
          lastActivity: '2024-09-17T10:00:00.000Z',
          progress: {
            currentWeight: 180,
            goalWeight: 170,
            workoutStreak: 5
          }
        }
      ];
      setClients(mockClients);
      setStats(prev => ({ ...prev, totalClients: mockClients.length, activeClients: mockClients.length }));
    }
  };

  const fetchContactSubmissions = async () => {
    try {
      const response = await fetch('/api/contact');
      if (response.ok) {
        const data = await response.json();
        setContactSubmissions(data);
        const newCount = data.filter((submission: ContactSubmission) => submission.status === 'NEW').length;
        setStats(prev => ({ ...prev, newSubmissions: newCount }));
      }
    } catch (error) {
      console.error('Failed to fetch contact submissions:', error);
    }
  };

  const fetchAppointments = async () => {
    try {
      const response = await fetch('/api/appointments');
      if (response.ok) {
        const data = await response.json();
        setAppointments(data);
        const pendingCount = data.filter((appointment: Appointment) => appointment.status === 'PENDING').length;
        setStats(prev => ({ ...prev, pendingAppointments: pendingCount }));
        
        // Log appointment IDs for debugging
      } else {
        console.error('Failed to fetch appointments:', response.status, response.statusText);
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Error details:', errorData);
        // Clear appointments on error to prevent stale data
        setAppointments([]);
      }
    } catch (error) {
      console.error('Failed to fetch appointments:', error);
      // Clear appointments on error to prevent stale data
      setAppointments([]);
    }
  };

  const fetchWorkoutTemplates = async () => {
    try {
      const response = await fetch('/api/workout-templates');
      if (response.ok) {
        const data = await response.json();
        setWorkoutTemplates(data);
        setStats(prev => ({ ...prev, totalWorkouts: data.length }));
      }
    } catch (error) {
      console.error('Failed to fetch workout templates:', error);
    }
  };

  const fetchAssignedWorkouts = async () => {
    try {
      const response = await fetch('/api/workouts?type=assigned');
      if (response.ok) {
        const assigned = await response.json();
        setAssignedWorkouts(assigned);
      }
    } catch (error) {
      console.error('Error fetching assigned workouts:', error);
    }
  };

  const fetchNutritionPlans = async () => {
    try {
      const response = await fetch('/api/nutrition');
      if (response.ok) {
        const plans = await response.json();
        setNutritionPlans(plans);
      }
    } catch (error) {
      console.error('Error fetching nutrition plans:', error);
    }
  };

  const fetchAvailableExercises = async () => {
    try {
      const response = await fetch('/api/exercises');
      if (response.ok) {
        const data = await response.json();
        setAvailableExercises(data);
      }
    } catch (error) {
      console.error('Failed to fetch exercises:', error);
    }
  };

  const fetchClientProgress = useCallback(async (clientId?: string) => {
    try {
      const url = clientId ? `/api/progress?clientId=${clientId}` : '/api/progress';
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        if (clientId) {
          setClientsProgress(prev => ({ ...prev, [clientId]: data }));
        } else {
          // Fetch all clients' progress
          const allProgress: Record<string, { entries: ProgressEntry[]; analytics: ProgressAnalytics; }> = {};
          for (const client of clients) {
            try {
              const clientResponse = await fetch(`/api/progress?clientId=${client.id}`);
              if (clientResponse.ok) {
                const clientData = await clientResponse.json();
                allProgress[client.id] = clientData;
              }
            } catch (error) {
              console.error(`Failed to fetch progress for client ${client.id}:`, error);
            }
          }
          setClientsProgress(allProgress);
        }
      }
    } catch (error) {
      console.error('Failed to fetch client progress:', error);
    }
  }, [clients]);

  const updateSubmissionStatus = async (id: string, status: string) => {
    try {
      const response = await fetch('/api/contact', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status })
      });
      if (response.ok) {
        fetchContactSubmissions();
      }
    } catch (error) {
      console.error('Failed to update submission status:', error);
    }
  };

  const handleApproveClient = async (submission: ContactSubmission) => {
    try {
      
      const response = await fetch('/api/invitations', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          email: submission.email,
          name: submission.name,
          phone: submission.phone,
          submissionId: submission.id
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setGeneratedCode(data.code);
        setInviteEmailSent(data.emailSent || false);
        setInviteEmailError(data.emailError || null);
        setShowInvitationCode(submission.email);
        fetchContactSubmissions();
      } else {
        const error = await response.json();
        console.error('❌ Invitation error:', error);
        alert(error.message || 'Failed to approve client. Please try again.');
      }
    } catch (error) {
      console.error('Failed to approve client:', error);
      alert('Error approving client. Please try again.');
    }
  };

  // Send invitation email (manual trigger by trainer)
  const handleResendInviteEmail = async (clientEmail: string, clientName: string, inviteCode: string) => {
    try {
      setResendingEmail(true);
      const response = await fetch('/api/send-invite-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientEmail,
          clientName,
          inviteCode,
        }),
      });

      if (response.ok) {
        setInviteEmailSent(true);
        setInviteEmailError(null);
        alert('✅ Invitation email sent successfully!');
      } else {
        const errorData = await response.json();
        setInviteEmailSent(false);
        setInviteEmailError(errorData.error || 'Failed to send email');
        alert('❌ Failed to send email. You can still copy the code manually.');
      }
    } catch (error) {
      console.error('Error resending email:', error);
      setInviteEmailSent(false);
      setInviteEmailError(error instanceof Error ? error.message : 'Unknown error');
      alert('❌ Failed to send email. You can still copy the code manually.');
    } finally {
      setResendingEmail(false);
    }
  };

  // Appointment management functions
  const handleApproveAppointment = async (appointmentId: string) => {
    try {
      // Validate appointment ID
      if (!appointmentId || typeof appointmentId !== 'string' || appointmentId.length < 10) {
        console.error('❌ Invalid appointment ID:', appointmentId);
        alert('Invalid appointment ID. Please refresh the page and try again.');
        return;
      }

      // Check if appointment exists in current state
      const appointmentExists = appointments.find(apt => apt.id === appointmentId);
      if (!appointmentExists) {
        console.error('❌ Appointment not found in current state:', appointmentId);
        alert('Appointment not found. Please refresh the page and try again.');
        fetchAppointments(); // Refresh the appointments list
        return;
      }

      const response = await fetch('/api/appointments', {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json'
        },
        credentials: 'include', // Ensure cookies are sent
        body: JSON.stringify({ 
          appointmentId, 
          status: 'APPROVED' 
        })
      });
      
      if (response.ok) {
        const responseData = await response.json();
        
        // Update the local state immediately for better UX
        setAppointments(prev => prev.map(apt => 
          apt.id === appointmentId 
            ? { ...apt, status: 'APPROVED' as const }
            : apt
        ));
        
        // Then fetch fresh data
        setTimeout(() => {
          fetchAppointments();
        }, 500);
      } else {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('❌ Approval failed:', error);
        console.error('❌ Full response:', {
          status: response.status,
          statusText: response.statusText,
          error: error
        });
        const errorMessage = error.message || error.error || `Failed to approve appointment. Status: ${response.status}`;
        alert(errorMessage);
      }
    } catch (error) {
      console.error('❌ Failed to approve appointment:', error);
      alert('Error approving appointment. Please try again.');
    }
  };

  const handleRejectAppointment = async (appointmentId: string) => {
    try {
      // Validate appointment ID
      if (!appointmentId || typeof appointmentId !== 'string' || appointmentId.length < 10) {
        console.error('❌ Invalid appointment ID:', appointmentId);
        alert('Invalid appointment ID. Please refresh the page and try again.');
        return;
      }

      // Check if appointment exists in current state
      const appointmentExists = appointments.find(apt => apt.id === appointmentId);
      if (!appointmentExists) {
        console.error('❌ Appointment not found in current state:', appointmentId);
        alert('Appointment not found. Please refresh the page and try again.');
        fetchAppointments(); // Refresh the appointments list
        return;
      }

      const response = await fetch('/api/appointments', {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json'
        },
        credentials: 'include', // Ensure cookies are sent
        body: JSON.stringify({ 
          appointmentId, 
          status: 'REJECTED' 
        })
      });
      
      if (response.ok) {
        
        // Update the local state immediately for better UX
        setAppointments(prev => prev.map(apt => 
          apt.id === appointmentId 
            ? { ...apt, status: 'REJECTED' as const }
            : apt
        ));
        
        // Then fetch fresh data
        setTimeout(() => {
          fetchAppointments();
        }, 500);
      } else {
        const error = await response.json();
        console.error('❌ Rejection failed:', error);
        const errorMessage = error.message || error.error || `Failed to reject appointment. Status: ${response.status}`;
        alert(errorMessage);
      }
    } catch (error) {
      console.error('Failed to reject appointment:', error);
      alert('Error rejecting appointment. Please try again.');
    }
  };

  // Client management functions
  const handleRemoveClient = async (clientId: string) => {
    try {
      if (removeAction === 'delete') {
        // Completely delete the client account
        const response = await fetch(`/api/clients?clientId=${clientId}`, {
          method: 'DELETE',
        });
        if (response.ok) {
          // Remove client from local state
          setClients(prev => prev.filter(client => client.id !== clientId));
          setStats(prev => ({ 
            ...prev, 
            totalClients: prev.totalClients - 1,
            activeClients: prev.activeClients - 1
          }));
          setShowRemoveConfirm(null);
          setShowClientMenu(null);
          setShowClientDetails(null);
        }
      } else {
        // Just remove trainer-client relationship
        const response = await fetch('/api/clients', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clientId, status: 'INACTIVE' })
        });
        if (response.ok) {
          // Remove client from local state
          setClients(prev => prev.filter(client => client.id !== clientId));
          setStats(prev => ({ 
            ...prev, 
            totalClients: prev.totalClients - 1,
            activeClients: prev.activeClients - 1
          }));
          setShowRemoveConfirm(null);
          setShowClientMenu(null);
        }
      }
    } catch (error) {
      console.error('Failed to remove client:', error);
    }
  };

  const handleResetClientPassword = async (clientId: string) => {
    try {
      const response = await fetch('/api/clients/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          clientId,
          newPassword: newPassword || 'Changemetoday1234!' // Default password if none provided
        })
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Password reset successful! New password: ${result.newPassword}\n\nThe client will be prompted to change this password on their next login.`);
        setShowPasswordResetModal(null);
        setNewPassword('');
        setShowClientMenu(null);
      } else {
        const error = await response.json();
        alert(`Failed to reset password: ${error.message}`);
      }
    } catch (error) {
      console.error('Failed to reset client password:', error);
      alert('Error resetting password. Please try again.');
    }
  };

  const handleCreateWorkout = () => {
    setShowCreateWorkout(true);
  };

  const handleCreateNutrition = () => {
    setShowCreateNutrition(true);
  };

  const handleViewClientDetails = async (clientId: string) => {
    try {
      setLoadingClientDetails(clientId);
      setShowClientMenu(null); // Close the menu
      
      const client = clients.find(c => c.id === clientId);
      if (!client) {
        console.error('Client not found:', clientId);
        setLoadingClientDetails(null);
        return;
      }

      // Fetch real assigned workouts for this client
      const workoutsResponse = await fetch(`/api/workouts?type=assigned&clientId=${clientId}`);
      let assignedWorkouts = [];
      if (workoutsResponse.ok) {
        const workouts = await workoutsResponse.json();
        assignedWorkouts = workouts.map((session: WorkoutSession) => ({
          id: session.id,
          name: session.workout.name,
          description: session.workout.description,
          assignedDate: new Date(session.startTime).toLocaleDateString(),
          completed: session.completed,
          duration: session.workout.estimatedDuration || 'N/A',
          exercises: session.workout.exercises.length
        }));
      }

      // Fetch real assigned nutrition plans for this client
      const nutritionResponse = await fetch(`/api/nutrition?clientId=${clientId}`);
      let assignedNutritionPlans = [];
      if (nutritionResponse.ok) {
        const plans = await nutritionResponse.json();
        assignedNutritionPlans = plans.map((plan: NutritionPlan) => ({
          id: plan.id,
          name: plan.name,
          description: plan.description,
          startDate: plan.startDate ? new Date(plan.startDate).toLocaleDateString() : 'Not set',
          endDate: plan.endDate ? new Date(plan.endDate).toLocaleDateString() : 'Not set',
          dailyCalorieTarget: plan.dailyCalorieTarget,
          dailyProteinTarget: plan.dailyProteinTarget,
          isActive: plan.startDate && plan.endDate ? 
            (new Date() >= new Date(plan.startDate) && new Date() <= new Date(plan.endDate)) : false
        }));
      }

      // Fetch recent food entries for this client (last 7 days)
      const today = new Date();
      const allFoodEntries: FoodEntry[] = [];
      
      // Fetch food entries for each of the last 7 days
      for (let i = 0; i < 7; i++) {
        const targetDate = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
        const dateString = targetDate.toISOString().split('T')[0];
        
        try {
          const response = await fetch(`/api/food-entries?clientId=${clientId}&date=${dateString}`);
          if (response.ok) {
            const data = await response.json();
            if (data.entries && data.entries.length > 0) {
              allFoodEntries.push(...data.entries);
            }
          } else if (response.status === 404) {
            // 404 could mean client not assigned to trainer or no data for this date
          } else {
            console.error(`❌ Failed to fetch data for ${dateString}, status:`, response.status);
          }
        } catch (error) {
          console.error(`Error fetching food entries for ${dateString}:`, error);
        }
      }
      
      let recentFoodEntries: Array<{
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
      }> = [];
      let nutritionStats = { avgCalories: 0, avgProtein: 0, adherenceRate: '0%' };

      if (allFoodEntries.length > 0) {
        // Get the most recent entries (last 10)
        recentFoodEntries = allFoodEntries
          .sort((a: FoodEntry, b: FoodEntry) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .slice(0, 10)
          .map((entry: FoodEntry) => ({
            id: entry.id,
            foodName: entry.foodName,
            quantity: entry.quantity,
            unit: entry.unit,
            calories: entry.calories,
            protein: entry.protein,
            carbs: entry.carbs,
            fat: entry.fat,
            mealType: entry.mealType,
            date: new Date(entry.date).toLocaleDateString(),
            notes: entry.notes
          }));

        // Calculate nutrition stats
        const totalCalories = allFoodEntries.reduce((sum: number, entry: FoodEntry) => sum + entry.calories, 0);
        const totalProtein = allFoodEntries.reduce((sum: number, entry: FoodEntry) => sum + entry.protein, 0);
        const avgCalories = Math.round(totalCalories / Math.max(allFoodEntries.length, 1));
        const avgProtein = Math.round(totalProtein / Math.max(allFoodEntries.length, 1));
        
        // Calculate adherence rate based on assigned nutrition plan targets
        let adherenceRate = '0%';
        const activePlan = assignedNutritionPlans.find((plan: NutritionPlan) => plan.isActive);
        if (activePlan && activePlan.dailyCalorieTarget) {
          const adherence = Math.min(100, Math.round((avgCalories / activePlan.dailyCalorieTarget) * 100));
          adherenceRate = `${adherence}%`;
        }

        nutritionStats = { avgCalories, avgProtein, adherenceRate };
      }

      // Fetch client workout progress
      const workoutProgressResponse = await fetch(`/api/workout-progress?userId=${clientId}`);
      let workoutProgress = [];
      if (workoutProgressResponse.ok) {
        workoutProgress = await workoutProgressResponse.json();
      }

      // Get client progress data if available
      const clientProgress = clientsProgress[clientId];

      const detailedClientData = {
        ...client,
        profile: {
          age: 28,
          height: "5'8\"",
          weight: "165 lbs",
          fitnessLevel: 'INTERMEDIATE',
          goals: 'Weight Loss',
          joinDate: client.createdAt
        },
        progress: {
          startingWeight: '175 lbs',
          currentWeight: clientProgress?.analytics?.weight?.current ? `${clientProgress.analytics.weight.current} lbs` : '165 lbs',
          weightChange: clientProgress?.analytics?.weight?.change?.total ? `${clientProgress.analytics.weight.change.total > 0 ? '+' : ''}${clientProgress.analytics.weight.change.total} lbs` : '-10 lbs',
          bodyFatPercentage: '18%',
          muscleMass: '142 lbs',
          workoutStreak: clientProgress?.analytics?.summary?.consistency?.streak || 0,
          totalEntries: clientProgress?.analytics?.summary?.totalEntries || 0
        },
        assignedWorkouts,
        assignedNutritionPlans,
        recentProgress: clientProgress?.entries?.slice(0, 5) || [],
        recentFoodEntries,
        workoutProgress: workoutProgress.slice(0, 10) || [], // Recent 10 workout logs
        nutritionStats
      };

      setSelectedClientData(detailedClientData);
      setSelectedFoodEntryDate('all'); // Reset food entry filter
      setSelectedWorkoutProgressDate('all'); // Reset workout progress filter
      setShowClientDetails(clientId);
      setShowClientMenu(null);
      setLoadingClientDetails(null); // Clear loading state
    } catch (error) {
      console.error('Error fetching client details:', error);
      setLoadingClientDetails(null); // Clear loading state on error
    }
  };

  const handleAssignWorkout = (clientId: string) => {
    setShowAssignWorkout(clientId);
    setShowClientMenu(null);
  };

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/clients', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newClientData)
      });
      
      if (response.ok) {
        setShowAddClient(false);
        setNewClientData({
          name: '',
          email: '',
          phone: '',
          age: '',
          height: '',
          weight: '',
          fitnessLevel: 'Beginner',
          goals: ''
        });
        fetchClients(); // Refresh the client list
        alert('Client created successfully! They will receive login instructions via email.');
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to create client. Please try again.');
      }
    } catch (error) {
      console.error('Error creating client:', error);
      alert('Error creating client. Please try again.');
    }
  };

  const handleCreateWorkoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (workoutFormData.exercises.length === 0) {
      alert('Please add at least one exercise to the workout');
      return;
    }

    try {
      const response = await fetch('/api/workout-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(workoutFormData)
      });
      
      if (response.ok) {
        setShowCreateWorkout(false);
        setWorkoutFormData({
          title: '',
          description: '',
          duration: 60,
          startDate: '',
          endDate: '',
          difficulty: 'BEGINNER',
          type: 'STRENGTH',
          exercises: []
        });
        fetchWorkoutTemplates();
        alert('Workout template created successfully!');
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to create workout template. Please try again.');
      }
    } catch (error) {
      console.error('Error creating workout template:', error);
      alert('Error creating workout template. Please try again.');
    }
  };

  const addExerciseToWorkout = (exercise: AvailableExercise) => {
    const newExercise = {
      exerciseId: exercise.id,
      sets: 3,
      reps: 12,
      restTime: 60,
      notes: '',
      order: workoutFormData.exercises.length + 1
    };
    
    setWorkoutFormData(prev => ({
      ...prev,
      exercises: [...prev.exercises, newExercise]
    }));
  };

  const removeExerciseFromWorkout = (index: number) => {
    setWorkoutFormData(prev => ({
      ...prev,
      exercises: prev.exercises.filter((_, i) => i !== index).map((ex, i) => ({
        ...ex,
        order: i + 1
      }))
    }));
  };

  const updateExerciseInWorkout = (index: number, updates: { sets?: number; reps?: number; restTime?: number; notes?: string }) => {
    setWorkoutFormData(prev => ({
      ...prev,
      exercises: prev.exercises.map((ex, i) => 
        i === index ? { ...ex, ...updates } : ex
      )
    }));
  };

  const handleEditWorkout = (workout: WorkoutTemplate) => {
    setEditingWorkout(workout);
    setWorkoutFormData({
      title: workout.title,
      description: workout.description || '',
      duration: workout.duration || 60,
      startDate: workout.startDate || '',
      endDate: workout.endDate || '',
      difficulty: workout.difficulty || '',
      type: workout.type || '',
      exercises: workout.exercises.map((ex: WorkoutTemplate['exercises'][0]) => ({
        exerciseId: ex.exercise.id,
        sets: ex.sets,
        reps: parseInt(ex.reps) || 0,
        restTime: ex.restTime,
        notes: ex.notes || '',
        order: ex.order
      }))
    });
    setShowEditWorkout(workout.id);
  };

  const handleUpdateWorkoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingWorkout || workoutFormData.exercises.length === 0) {
      alert('Please add at least one exercise to the workout');
      return;
    }

    try {
      const response = await fetch('/api/workout-templates', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingWorkout.id,
          ...workoutFormData
        })
      });
      
      if (response.ok) {
        setShowEditWorkout(null);
        setEditingWorkout(null);
        setWorkoutFormData({
          title: '',
          description: '',
          duration: 60,
          startDate: '',
          endDate: '',
          difficulty: 'BEGINNER',
          type: 'STRENGTH',
          exercises: []
        });
        fetchWorkoutTemplates();
        alert('Workout template updated successfully!');
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to update workout template. Please try again.');
      }
    } catch (error) {
      console.error('Error updating workout template:', error);
      alert('Error updating workout template. Please try again.');
    }
  };

  const handleDeleteWorkout = async (workoutId: string) => {
    if (!confirm('Are you sure you want to delete this workout template? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch('/api/workout-templates', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: workoutId })
      });
      
      if (response.ok) {
        fetchWorkoutTemplates();
        alert('Workout template deleted successfully!');
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to delete workout template. Please try again.');
      }
    } catch (error) {
      console.error('Error deleting workout template:', error);
      alert('Error deleting workout template. Please try again.');
    }
  };

  const handleAssignWorkoutToClient = (workoutId: string) => {
    setShowAssignWorkoutModal(workoutId);
  };

  const handleAssignToClient = async (clientId: string, workoutId: string) => {
    try {
      const response = await fetch('/api/workouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workoutTemplateId: workoutId,
          clientId,
          scheduledDate: new Date().toISOString(),
          notes: 'Assigned by trainer'
        })
      });
      
      if (response.ok) {
        setShowAssignWorkoutModal(null);
        fetchAssignedWorkouts(); // Refresh assigned workouts
        alert('Workout assigned to client successfully!');
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to assign workout. Please try again.');
      }
    } catch (error) {
      console.error('Error assigning workout:', error);
      alert('Error assigning workout. Please try again.');
    }
  };

  const handleCreateNutritionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!nutritionFormData.name.trim()) {
      alert('Please enter a nutrition plan name');
      return;
    }

    // Validate client assignment if enabled
    if (nutritionFormData.assignToClient && !nutritionFormData.clientId) {
      alert('Please select a client to assign this plan to');
      return;
    }

    try {
      const requestBody = {
        ...nutritionFormData,
        // Only include clientId if assigning to a client
        clientId: nutritionFormData.assignToClient ? nutritionFormData.clientId : undefined,
        startDate: nutritionFormData.startDate || new Date().toISOString(),
        endDate: nutritionFormData.endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days from now
      };

      const response = await fetch('/api/nutrition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });
      
      if (response.ok) {
        setShowCreateNutrition(false);
        setNutritionFormData({
          name: '',
          description: '',
          startDate: '',
          endDate: '',
          clientId: '',
          assignToClient: false,
          dailyCalorieTarget: 2000,
          dailyProteinTarget: 150,
          dailyCarbTarget: 200,
          dailyFatTarget: 70
        });
        fetchNutritionPlans();
        alert(nutritionFormData.assignToClient 
          ? 'Nutrition plan created and assigned to client successfully!' 
          : 'Nutrition plan created successfully! You can assign it to clients later.');
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to create nutrition plan. Please try again.');
      }
    } catch (error) {
      console.error('Error creating nutrition plan:', error);
      alert('Error creating nutrition plan. Please try again.');
    }
  };

  const handleDeleteNutritionPlan = async (planId: string) => {
    if (!confirm('Are you sure you want to delete this nutrition plan? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/nutrition?id=${planId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        fetchNutritionPlans();
        alert('Nutrition plan deleted successfully!');
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to delete nutrition plan. Please try again.');
      }
    } catch (error) {
      console.error('Error deleting nutrition plan:', error);
      alert('Error deleting nutrition plan. Please try again.');
    }
  };

  const handleAssignNutrition = (planId: string) => {
    setShowAssignNutrition(planId);
  };

  const handleEditNutrition = (plan: NutritionPlan) => {
    setEditingNutrition(plan);
    setNutritionFormData({
      name: plan.name || '',
      description: plan.description,
      startDate: plan.startDate?.split('T')[0] || '',
      endDate: plan.endDate?.split('T')[0] || '',
      clientId: '',
      assignToClient: false,
      dailyCalorieTarget: plan.dailyCalorieTarget || 0,
      dailyProteinTarget: plan.dailyProteinTarget || 0,
      dailyCarbTarget: plan.dailyCarbTarget || 0,
      dailyFatTarget: plan.dailyFatTarget || 0
    });
    setShowEditNutrition(plan.id);
  };

  const handleAssignNutritionToClient = async (clientId: string, planId: string) => {
    try {
      const response = await fetch('/api/nutrition/assign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ clientId, planId })
      });
      
      if (response.ok) {
        fetchNutritionPlans();
        setShowAssignNutrition(null);
        alert('Nutrition plan assigned successfully!');
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to assign nutrition plan. Please try again.');
      }
    } catch (error) {
      console.error('Error assigning nutrition plan:', error);
      alert('Error assigning nutrition plan. Please try again.');
    }
  };

  const handleUpdateNutritionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNutrition) return;
    
    try {
      const response = await fetch(`/api/nutrition?id=${editingNutrition.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(nutritionFormData)
      });
      
      if (response.ok) {
        fetchNutritionPlans();
        setShowEditNutrition(null);
        setEditingNutrition(null);
        setNutritionFormData({
          name: '',
          description: '',
          startDate: '',
          endDate: '',
          clientId: '',
          assignToClient: false,
          dailyCalorieTarget: 2000,
          dailyProteinTarget: 150,
          dailyCarbTarget: 200,
          dailyFatTarget: 70
        });
        alert('Nutrition plan updated successfully!');
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to update nutrition plan. Please try again.');
      }
    } catch (error) {
      console.error('Error updating nutrition plan:', error);
      alert('Error updating nutrition plan. Please try again.');
    }
  };

  const handleScheduleSessionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!scheduleFormData.clientId || !scheduleFormData.title || !scheduleFormData.date || !scheduleFormData.time) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const startTime = new Date(`${scheduleFormData.date}T${scheduleFormData.time}`);
      const endTime = new Date(startTime);
      endTime.setMinutes(endTime.getMinutes() + scheduleFormData.duration);
      
      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          clientId: scheduleFormData.clientId, // Required when trainer creates for client
          title: scheduleFormData.title,
          type: scheduleFormData.type,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(), // Add missing endTime
          duration: scheduleFormData.duration,
          location: scheduleFormData.location,
          description: scheduleFormData.description,
          notes: scheduleFormData.notes
          // Don't send status - API will auto-approve trainer-created appointments
        })
      });
      
      if (response.ok) {
        fetchAppointments();
        setShowScheduleSession(false);
        setScheduleFormData({
          clientId: '',
          title: '',
          type: 'TRAINING_SESSION',
          date: '',
          time: '',
          duration: 60,
          location: '',
          description: '',
          notes: ''
        });
        alert('Session scheduled and pending your approval!');
      } else {
        const error = await response.json();
        console.error('❌ Schedule session error:', error);
        console.error('❌ Response status:', response.status);
        alert(error.message || `Failed to schedule session. Error: ${response.status}`);
      }
    } catch (error) {
      console.error('❌ Network error scheduling session:', error);
      alert('Network error. Please check your connection and try again.');
    }
  };

  // Exercise Management Functions
  const handleCreateExercise = () => {
    setShowCreateExercise(true);
  };

  const handleCreateExerciseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!exerciseFormData.name.trim() || !exerciseFormData.targetMuscle.trim()) {
      alert('Please fill in the exercise name and target muscle');
      return;
    }

    try {
      const response = await fetch('/api/exercises', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(exerciseFormData)
      });
      
      if (response.ok) {
        setShowCreateExercise(false);
        setExerciseFormData({
          name: '',
          targetMuscle: '',
          difficulty: 'BEGINNER',
          instructions: '',
          equipment: 'BODYWEIGHT',
          category: 'STRENGTH'
        });
        fetchAvailableExercises();
        alert('Exercise created successfully!');
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to create exercise. Please try again.');
      }
    } catch (error) {
      console.error('Error creating exercise:', error);
      alert('Error creating exercise. Please try again.');
    }
  };

  const handleEditExercise = (exercise: AvailableExercise) => {
    setEditingExercise(exercise);
    setExerciseFormData({
      name: exercise.name,
      targetMuscle: exercise.muscleGroups || exercise.targetMuscle || '',
      difficulty: exercise.difficulty || '',
      instructions: exercise.instructions || '',
      equipment: exercise.equipment || 'BODYWEIGHT',
      category: exercise.description || exercise.category || 'STRENGTH'
    });
    setShowEditExercise(exercise.id);
  };

  const handleUpdateExerciseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingExercise || !exerciseFormData.name.trim() || !exerciseFormData.targetMuscle.trim()) {
      alert('Please fill in the exercise name and target muscle');
      return;
    }

    try {
      const response = await fetch('/api/exercises', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingExercise.id,
          ...exerciseFormData
        })
      });
      
      if (response.ok) {
        setShowEditExercise(null);
        setEditingExercise(null);
        setExerciseFormData({
          name: '',
          targetMuscle: '',
          difficulty: 'BEGINNER',
          instructions: '',
          equipment: 'BODYWEIGHT',
          category: 'STRENGTH'
        });
        fetchAvailableExercises();
        alert('Exercise updated successfully!');
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to update exercise. Please try again.');
      }
    } catch (error) {
      console.error('Error updating exercise:', error);
      alert('Error updating exercise. Please try again.');
    }
  };

  const handleDeleteExercise = async (exerciseId: string) => {
    if (!confirm('Are you sure you want to delete this exercise? This action cannot be undone and may affect existing workout templates.')) {
      return;
    }

    try {
      const response = await fetch('/api/exercises', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: exerciseId })
      });
      
      if (response.ok) {
        fetchAvailableExercises();
        alert('Exercise deleted successfully!');
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to delete exercise. Please try again.');
      }
    } catch (error) {
      console.error('Error deleting exercise:', error);
      alert('Error deleting exercise. Please try again.');
    }
  };

  // Initialize data
  useEffect(() => {
    if (session?.user) {
      // Add delay to ensure proper session establishment and server readiness
      const initializeData = async () => {
        try {
          
          // Wait a moment for session to be fully established
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          await fetchClients();
          await fetchContactSubmissions();
          await fetchAppointments();
          await fetchWorkoutTemplates();
          await fetchAssignedWorkouts();
          await fetchNutritionPlans();
          await fetchAvailableExercises();
          
          setLoading(false);
        } catch (error) {
          console.error('❌ Error initializing dashboard data:', error);
          setLoading(false);
        }
      };
      
      // Add small delay before starting initialization
      setTimeout(initializeData, 500);
    }
  }, [session]);

  // Tab change handler
  useEffect(() => {
    if (activeTab === 'contacts') {
      fetchContactSubmissions();
    } else if (activeTab === 'clients') {
      fetchClients();
    } else if (activeTab === 'workouts') {
      fetchWorkoutTemplates();
    } else if (activeTab === 'progress') {
      fetchClientProgress();
    } else if (activeTab === 'schedule') {
      fetchAppointments();
    }
  }, [activeTab, fetchClientProgress]);

  // Load progress data when clients are available
  useEffect(() => {
    if (clients.length > 0 && (activeTab === 'progress' || activeTab === 'overview')) {
      fetchClientProgress();
    }
  }, [clients, activeTab, fetchClientProgress]);

  // Real-time updates for schedule tab
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (activeTab === 'schedule') {
      // Poll for updates every 30 seconds when on schedule tab
      interval = setInterval(() => {
        fetchAppointments();
      }, 30000);
    }
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [activeTab]);

  // Real-time updates for clients and contacts - poll more frequently for new signups
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (activeTab === 'clients' || activeTab === 'contacts' || activeTab === 'overview') {
      // Poll for updates every 15 seconds for new client signups and contact submissions
      interval = setInterval(() => {
        if (activeTab === 'clients' || activeTab === 'overview') {
          fetchClients(); // This updates stats for overview and client list
        }
        if (activeTab === 'contacts' || activeTab === 'overview') {
          fetchContactSubmissions(); // This updates pending contact submissions
        }
      }, 15000);
    }
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [activeTab]);

  const handleSignOut = () => {
    signOut({ callbackUrl: '/' });
  };

  const updateTrainerSetting = (key: string, value: string | boolean) => {
    setUserSettings((prev) => ({ ...prev, [key]: value }));
  };

  const resetTrainerSettings = () => {
    setUserSettings({
      notifications: true,
      emailUpdates: true,
      autoApproval: false,
      theme: 'light',
      units: 'imperial',
      clientVisibility: 'all'
    });
  };

  const handleGoHome = () => {
    router.push('/');
  };

  const menuItems = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'clients', label: 'Clients', icon: Users },
    { id: 'progress', label: 'Client Progress', icon: TrendingUp },
    { id: 'workouts', label: 'Workouts', icon: Dumbbell },
    { id: 'exercises', label: 'Exercise Management', icon: Settings },
    { id: 'nutrition', label: 'Nutrition', icon: Apple },
    { id: 'contacts', label: 'Contact Submissions', icon: Bell },
    { id: 'schedule', label: 'Schedule', icon: Calendar },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  if (loading || status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading trainer dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 relative">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleGoHome}
                className="p-2 text-gray-400 hover:text-blue-600 transition-colors duration-200 mr-2"
                title="Go to Homepage"
              >
                <Home className="w-5 h-5" />
              </motion.button>
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center mr-3">
                <Dumbbell className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Trainer Dashboard
              </h1>
            </div>
            
            <div className="flex items-center space-x-2 flex-shrink-0">
              {/* Notification System */}
              <NotificationSystem 
                userId={session?.user?.id || ''}
                userRole={session?.user?.role || ''}
              />
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setActiveTab('settings')}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors duration-200"
                title="Settings"
              >
                <Settings className="w-5 h-5" />
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSignOut}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors duration-200 flex items-center gap-2"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </motion.button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <div className="lg:w-64">
            <div className="bg-white rounded-xl shadow-sm p-4 space-y-2">
              <div className="flex items-center p-4">
                <div className="relative w-12 h-12 mr-4">
                  <OptimizedImage
                    src={imagePlaceholders.portrait}
                    alt="Brent Martinez - Personal Trainer"
                    fill
                    className="rounded-full object-cover ring-2 ring-blue-600"
                  />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Brent Martinez</h3>
                  <p className="text-sm text-gray-500">Certified Personal Trainer</p>
                </div>
              </div>
              
              <nav className="space-y-1">
                {menuItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                      activeTab === item.id
                        ? 'bg-blue-100 text-blue-700 border-r-2 border-blue-700'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <item.icon className="w-5 h-5 mr-3" />
                    {item.label}
                    {item.id === 'contacts' && stats.newSubmissions > 0 && (
                      <span className="ml-auto bg-red-600 text-white text-xs rounded-full px-2 py-1">
                        {stats.newSubmissions}
                      </span>
                    )}
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-white rounded-xl p-6 shadow-sm">
                    <div className="flex items-center">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Users className="w-6 h-6 text-blue-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Total Clients</p>
                        <p className="text-2xl font-bold text-gray-900">{stats.totalClients}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-xl p-6 shadow-sm">
                    <div className="flex items-center">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <TrendingUp className="w-6 h-6 text-green-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Active Clients</p>
                        <p className="text-2xl font-bold text-gray-900">{stats.activeClients}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-xl p-6 shadow-sm">
                    <div className="flex items-center">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <Dumbbell className="w-6 h-6 text-purple-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Workout Templates</p>
                        <p className="text-2xl font-bold text-gray-900">{stats.totalWorkouts}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-xl p-6 shadow-sm">
                    <div className="flex items-center">
                      <div className="p-2 bg-red-100 rounded-lg">
                        <Bell className="w-6 h-6 text-red-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">New Inquiries</p>
                        <p className="text-2xl font-bold text-gray-900">{stats.newSubmissions}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recent Activity */}
                <div className="bg-white rounded-xl p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
                  <div className="space-y-4">
                    {clients.slice(0, 3).map((client) => (
                      <div key={client.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                            <span className="text-white font-medium text-sm">
                              {client.name.split(' ').map(n => n[0]).join('')}
                            </span>
                          </div>
                          <div className="ml-3">
                            <p className="text-sm font-medium text-gray-900">{client.name}</p>
                            <div className="flex items-center space-x-3 mt-1">
                              <p className="text-xs text-gray-500 flex items-center">
                                <Clock className="w-3 h-3 mr-1" />
                                Joined {new Date(client.createdAt).toLocaleDateString()}
                              </p>
                              <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                                {getMembershipDuration(client.createdAt)}
                              </span>
                            </div>
                          </div>
                        </div>
                        <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">Active</span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Clients Tab */}
            {activeTab === 'clients' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold text-gray-900">Clients</h2>
                  <button 
                    onClick={() => setShowAddClient(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="w-4 h-4 inline mr-2" />
                    Add Client
                  </button>
                </div>

                <div className="bg-white rounded-xl shadow-sm">
                  <div className="p-6 border-b border-gray-200">
                    <div className="flex gap-4">
                      <div className="flex-1 relative">
                        <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search clients..."
                          value={clientSearchTerm}
                          onChange={(e) => setClientSearchTerm(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black placeholder-gray-400"
                        />
                      </div>
                      <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                        <Filter className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="divide-y divide-gray-200">
                    {clients
                      .filter(client => 
                        client.name.toLowerCase().includes(clientSearchTerm.toLowerCase()) ||
                        client.email.toLowerCase().includes(clientSearchTerm.toLowerCase())
                      )
                      .map((client) => (
                      <div key={client.id} className="p-6 hover:bg-gray-50 transition-colors relative">
                        {/* Loading Overlay */}
                        {loadingClientDetails === client.id && (
                          <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center z-50 rounded-lg">
                            <div className="text-center">
                              <div className="relative w-16 h-16 mx-auto mb-4">
                                <div className="absolute inset-0 border-4 border-blue-200 rounded-full"></div>
                                <div className="absolute inset-0 border-4 border-transparent border-t-blue-600 rounded-full animate-spin"></div>
                              </div>
                              <p className="text-sm font-medium text-gray-900">Loading client details...</p>
                              <p className="text-xs text-gray-500 mt-1">Please wait</p>
                            </div>
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                              <span className="text-white font-medium">
                                {client.name.split(' ').map(n => n[0]).join('')}
                              </span>
                            </div>
                            <div className="ml-4">
                              <h3 className="text-lg font-medium text-gray-900">{client.name}</h3>
                              <p className="text-sm text-gray-500">{client.email}</p>
                              <div className="flex items-center space-x-4 mt-2">
                                <div className="flex items-center text-xs text-gray-600">
                                  <Clock className="w-3 h-3 mr-1" />
                                  Joined {new Date(client.createdAt).toLocaleDateString()}
                                </div>
                                <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                                  {getMembershipDuration(client.createdAt)}
                                </span>
                                {client.lastActivity && (
                                  <div className="flex items-center text-xs text-green-600">
                                    <Activity className="w-3 h-3 mr-1" />
                                    Last active {new Date(client.lastActivity).toLocaleDateString()}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-4">
                            <div className="text-right">
                              <p className="text-sm font-medium text-gray-900">Progress</p>
                              <p className="text-xs text-green-600">On track</p>
                            </div>
                            <div className="relative">
                              <button 
                                onClick={() => setShowClientMenu(showClientMenu === client.id ? null : client.id)}
                                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                              >
                                <MoreVertical className="w-5 h-5" />
                              </button>
                              
                              {/* Client Actions Menu */}
                              {showClientMenu === client.id && (
                                <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-[9999] min-w-[200px]">
                                  <button
                                    onClick={() => handleViewClientDetails(client.id)}
                                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center space-x-2"
                                  >
                                    <Eye className="w-4 h-4" />
                                    <span>View Details</span>
                                  </button>
                                  <button
                                    onClick={() => handleAssignWorkout(client.id)}
                                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center space-x-2"
                                  >
                                    <Dumbbell className="w-4 h-4" />
                                    <span>Assign Workout</span>
                                  </button>
                                  <button
                                    onClick={() => {
                                      setShowPasswordResetModal(client.id);
                                      setShowClientMenu(null);
                                    }}
                                    className="w-full text-left px-4 py-2 text-sm text-orange-600 hover:bg-orange-50 transition-colors flex items-center space-x-2"
                                  >
                                    <Settings className="w-4 h-4" />
                                    <span>Reset Password</span>
                                  </button>
                                  <hr className="my-1" />
                                  <button
                                    onClick={() => setShowRemoveConfirm(client.id)}
                                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center space-x-2"
                                  >
                                    <UserMinus className="w-4 h-4" />
                                    <span>Remove Client</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Contact Submissions Tab */}
            {activeTab === 'contacts' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <h2 className="text-2xl font-bold text-gray-900">Contact Submissions</h2>

                <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                  <div className="divide-y divide-gray-200">
                    {contactSubmissions.map((submission) => (
                      <div key={submission.id} className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-3">
                              <h3 className="text-lg font-medium text-gray-900">{submission.name}</h3>
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                submission.status === 'NEW' 
                                  ? 'bg-red-100 text-red-800' 
                                  : submission.status === 'CONTACTED'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : submission.status === 'INVITED'
                                  ? 'bg-blue-100 text-blue-800'
                                  : submission.status === 'COMPLETED'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {submission.status === 'COMPLETED' ? 'ACCEPTED' : submission.status}
                              </span>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600 mb-4">
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
                            
                            <p className="text-gray-700 mb-4">{submission.message}</p>
                            
                            {submission.fitnessGoals && (
                              <div className="mb-4">
                                <p className="text-sm font-medium text-gray-900">Goals:</p>
                                <p className="text-sm text-gray-600">{submission.fitnessGoals}</p>
                              </div>
                            )}
                            
                            <p className="text-xs text-gray-400">
                              Submitted {new Date(submission.createdAt).toLocaleDateString()} at {new Date(submission.createdAt).toLocaleTimeString()}
                            </p>
                          </div>
                          
                          <div className="flex space-x-2 ml-4">
                            {submission.status === 'NEW' && (
                              <>
                                <button
                                  onClick={() => handleApproveClient(submission)}
                                  className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-colors"
                                  title="Accept & Send Invitation"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setViewingSubmission(submission)}
                                  className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
                                  title="View Details"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => updateSubmissionStatus(submission.id, 'COMPLETED')}
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
                                  onClick={() => handleApproveClient(submission)}
                                  className="px-3 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm rounded-lg hover:from-blue-700 hover:to-purple-700 transition-colors flex items-center space-x-2"
                                  title="View Invitation & Send Email"
                                >
                                  <Mail className="w-4 h-4" />
                                  <span>Send Email</span>
                                </button>
                                <button
                                  onClick={() => setViewingSubmission(submission)}
                                  className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
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
            )}

            {/* Workouts Tab */}
            {activeTab === 'workouts' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold text-gray-900">Workout Templates</h2>
                  <button 
                    onClick={handleCreateWorkout}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="w-4 h-4 inline mr-2" />
                    Create Template
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {workoutTemplates.length === 0 ? (
                    <div className="col-span-full text-center py-12">
                      <div className="text-gray-400 mb-4">
                        <Dumbbell className="w-12 h-12 mx-auto" />
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No workout templates yet</h3>
                      <p className="text-gray-500 mb-4">Create your first workout template to get started</p>
                      <button 
                        onClick={handleCreateWorkout}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <Plus className="w-4 h-4 inline mr-2" />
                        Create Your First Template
                      </button>
                    </div>
                  ) : (
                    workoutTemplates.map((workout) => (
                      <div key={workout.id} className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-4">
                          <h3 className="text-lg font-semibold text-gray-900">{workout.title}</h3>
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            workout.difficulty === 'BEGINNER' ? 'bg-green-100 text-green-800' :
                            workout.difficulty === 'INTERMEDIATE' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {workout.difficulty}
                          </span>
                        </div>
                        
                        <p className="text-gray-600 text-sm mb-4">{workout.description || 'No description provided'}</p>
                        
                        <div className="flex justify-between text-sm text-gray-500 mb-4">
                          <span>📋 {workout.difficulty || 'No difficulty set'}</span>
                          <span>🏋️ {workout.exercises?.length || 0} exercises</span>
                        </div>
                        
                        {workout.exercises?.length > 0 && (
                          <div className="mb-4">
                            <p className="text-xs text-gray-500 mb-2">Exercises:</p>
                            <div className="flex flex-wrap gap-1">
                              {workout.exercises.slice(0, 3).map((ex: { exercise: { name: string } }, idx: number) => (
                                <span key={idx} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                                  {ex.exercise?.name || 'Unknown'}
                                </span>
                              ))}
                              {workout.exercises.length > 3 && (
                                <span className="text-xs text-gray-500">+{workout.exercises.length - 3} more</span>
                              )}
                            </div>
                          </div>
                        )}
                        
                        <div className="flex space-x-2">
                          <button 
                            onClick={() => handleAssignWorkoutToClient(workout.id)}
                            className="flex-1 bg-blue-600 text-white py-2 px-3 rounded-lg text-sm hover:bg-blue-700 transition-colors"
                          >
                            Assign to Client
                          </button>
                          <div className="relative">
                            <button 
                              onClick={() => setShowClientMenu(showClientMenu === workout.id ? null : workout.id)}
                              className="p-2 text-gray-400 hover:text-gray-600 border border-gray-200 rounded-lg"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>
                            {showClientMenu === workout.id && (
                              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                                <button
                                  onClick={() => {
                                    handleEditWorkout(workout);
                                    setShowClientMenu(null);
                                  }}
                                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                >
                                  <Edit className="w-4 h-4 mr-3" />
                                  Edit Template
                                </button>
                                <button
                                  onClick={() => {
                                    handleDeleteWorkout(workout.id);
                                    setShowClientMenu(null);
                                  }}
                                  className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                                >
                                  <Trash2 className="w-4 h-4 mr-3" />
                                  Delete Template
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Assigned Workouts Section */}
                <div className="mt-12">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Assigned Workouts</h2>
                  
                  {assignedWorkouts.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-lg">
                      <div className="text-gray-400 mb-4">
                        <Calendar className="w-12 h-12 mx-auto" />
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No workouts assigned yet</h3>
                      <p className="text-gray-500">Assigned workouts will appear here</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {assignedWorkouts.map((session) => (
                        <div key={session.id} className="bg-white border border-gray-200 rounded-lg p-6">
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900">{session.workout?.title || 'Unknown Workout'}</h3>
                              <p className="text-sm text-gray-600">Assigned to: {session.user?.name || 'Unknown User'}</p>
                              <p className="text-sm text-gray-500">
                                Scheduled: {session.startTime ? new Date(session.startTime).toLocaleDateString() : 'Not scheduled'}
                              </p>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                session.completed 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {session.completed ? 'Completed' : 'Pending'}
                              </span>
                              <button
                                onClick={() => {
                                  if (confirm('Remove this workout assignment?')) {
                                    // TODO: Implement remove assignment
                                    fetch(`/api/workouts?sessionId=${session.id}`, { method: 'DELETE' })
                                      .then(() => fetchAssignedWorkouts());
                                  }
                                }}
                                className="text-red-600 hover:text-red-800 p-1"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <span className="flex items-center">
                              <Clock className="w-4 h-4 mr-1" />
                              {session.workout?.duration || 0} min
                            </span>
                            <span className="flex items-center">
                              <Dumbbell className="w-4 h-4 mr-1" />
                              {session.workout?.exercises?.length || 0} exercises
                            </span>
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              session.workout?.difficulty === 'BEGINNER' ? 'bg-green-100 text-green-800' :
                              session.workout?.difficulty === 'INTERMEDIATE' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {session.workout?.difficulty || 'Unknown'}
                            </span>
                          </div>
                          
                          {session.notes && (
                            <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                              <p className="text-sm text-gray-700">{session.notes}</p>
                            </div>
                          )}
                          
                          {session.workout?.exercises && session.workout.exercises.length > 0 && (
                            <div className="mt-4">
                              <p className="text-sm font-medium text-black mb-2">Exercises:</p>
                              <div className="flex flex-wrap gap-2">
                                {session.workout?.exercises?.slice(0, 4).map((ex: { exercise: { name: string } }, idx: number) => (
                                  <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                                    {ex.exercise.name}
                                  </span>
                                ))}
                                {session.workout && session.workout.exercises && session.workout.exercises.length > 4 && (
                                  <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                                    +{session.workout.exercises.length - 4} more
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Exercises Tab */}
            {activeTab === 'exercises' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold text-black">Exercise Management</h2>
                  <button 
                    onClick={handleCreateExercise}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="w-4 h-4 inline mr-2" />
                    Create Exercise
                  </button>
                </div>

                {/* Filters */}
                <div className="bg-white rounded-xl shadow-sm p-4">
                  <div className="flex flex-wrap gap-4 items-center">
                    <div className="flex-1 relative">
                      <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search exercises..."
                        value={exerciseSearchTerm}
                        onChange={(e) => setExerciseSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                      />
                    </div>
                    
                    <select
                      value={exerciseFilter}
                      onChange={(e) => setExerciseFilter(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                    >
                      <option value="all">All Muscle Groups</option>
                      <option value="chest">Chest</option>
                      <option value="back">Back</option>
                      <option value="shoulders">Shoulders</option>
                      <option value="arms">Arms</option>
                      <option value="legs">Legs</option>
                      <option value="core">Core</option>
                      <option value="cardio">Cardio</option>
                    </select>
                  </div>
                </div>

                {/* Exercise Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {availableExercises
                    .filter(exercise => {
                      const exerciseName = exercise.name || '';
                      
                      // Handle muscle groups - could be array, string, or undefined
                      let exerciseMuscle = '';
                      if (exercise.muscleGroups) {
                        if (Array.isArray(exercise.muscleGroups)) {
                          exerciseMuscle = exercise.muscleGroups.join(' ');
                        } else if (typeof exercise.muscleGroups === 'string') {
                          exerciseMuscle = exercise.muscleGroups;
                        }
                      } else if (exercise.targetMuscle && typeof exercise.targetMuscle === 'string') {
                        exerciseMuscle = exercise.targetMuscle;
                      }
                      
                      const searchTerm = exerciseSearchTerm.toLowerCase();
                      
                      const matchesSearch = exerciseName.toLowerCase().includes(searchTerm) ||
                                          exerciseMuscle.toLowerCase().includes(searchTerm);
                      const matchesFilter = exerciseFilter === 'all' || 
                                          exerciseMuscle.toLowerCase().includes(exerciseFilter.toLowerCase());
                      return matchesSearch && matchesFilter;
                    })
                    .map((exercise) => (
                    <div key={exercise.id} className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow flex flex-col h-full max-w-full overflow-hidden">
                      <div className="flex justify-between items-start mb-4">
                        <h3 className="text-lg font-semibold text-black flex-1 pr-2 overflow-hidden">
                          <span className="block truncate">{exercise.name}</span>
                        </h3>
                        <div className="relative flex-shrink-0">
                          <button 
                            onClick={() => setShowClientMenu(showClientMenu === exercise.id ? null : exercise.id)}
                            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                          
                          {showClientMenu === exercise.id && (
                            <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-10">
                              <button
                                onClick={() => {
                                  handleEditExercise(exercise);
                                  setShowClientMenu(null);
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center space-x-2"
                              >
                                <Edit className="w-4 h-4" />
                                <span>Edit Exercise</span>
                              </button>
                              <button
                                onClick={() => {
                                  setShowDeleteExerciseConfirm(exercise.id);
                                  setShowClientMenu(null);
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center space-x-2"
                              >
                                <Trash2 className="w-4 h-4" />
                                <span>Delete Exercise</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="space-y-2 mb-4">
                        <div className="flex justify-between text-sm items-center">
                          <span className="text-gray-600 flex-shrink-0">Target Muscle:</span>
                          <span className="font-medium text-black text-right truncate ml-2">{exercise.muscleGroups || exercise.targetMuscle || 'Not specified'}</span>
                        </div>
                        <div className="flex justify-between text-sm items-center">
                          <span className="text-gray-600 flex-shrink-0">Difficulty:</span>
                          <span className={`px-2 py-1 text-xs rounded-full flex-shrink-0 ${
                            exercise.difficulty === 'BEGINNER' ? 'bg-green-100 text-green-800' :
                            exercise.difficulty === 'INTERMEDIATE' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {exercise.difficulty}
                          </span>
                        </div>
                        {exercise.equipment && (
                          <div className="flex justify-between text-sm items-center">
                            <span className="text-gray-600 flex-shrink-0">Equipment:</span>
                            <span className="font-medium text-black text-right truncate ml-2">{exercise.equipment}</span>
                          </div>
                        )}
                        {(exercise.description || exercise.category) && (
                          <div className="flex justify-between text-sm items-center">
                            <span className="text-gray-600 flex-shrink-0">Category:</span>
                            <span className="font-medium text-black text-right truncate ml-2">{exercise.description || exercise.category}</span>
                          </div>
                        )}
                      </div>
                      
                      {exercise.instructions && (
                        <div className="mb-4 flex-1 overflow-hidden">
                          <p className="text-sm text-gray-700 overflow-hidden" style={{
                            display: '-webkit-box',
                            WebkitLineClamp: 3,
                            WebkitBoxOrient: 'vertical',
                            wordBreak: 'break-word',
                            overflowWrap: 'break-word'
                          }}>{exercise.instructions}</p>
                        </div>
                      )}
                      
                      <div className="pt-4 border-t border-gray-200 mt-auto">
                        <button
                          onClick={() => handleEditExercise(exercise)}
                          className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                        >
                          Edit Exercise
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Empty State */}
                {availableExercises.length === 0 && (
                  <div className="text-center py-12">
                    <div className="text-gray-400 mb-4">
                      <Dumbbell className="w-12 h-12 mx-auto" />
                    </div>
                    <h3 className="text-lg font-medium text-black mb-2">No exercises yet</h3>
                    <p className="text-gray-500 mb-4">Create your first exercise to get started</p>
                    <button 
                      onClick={handleCreateExercise}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Plus className="w-4 h-4 inline mr-2" />
                      Create Your First Exercise
                    </button>
                  </div>
                )}
              </motion.div>
            )}

            {/* Nutrition Tab */}
            {activeTab === 'nutrition' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold text-gray-900">Nutrition Plans</h2>
                  <button 
                    onClick={handleCreateNutrition}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <Plus className="w-4 h-4 inline mr-2" />
                    Create Plan
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {nutritionPlans.map((plan) => (
                    <div key={plan.id} className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">{plan.name}</h3>
                          <p className="text-gray-600 text-sm">{plan.description}</p>
                        </div>
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 text-xs rounded-full">
                          {plan.assignedClientsCount || 0} clients
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-xs text-gray-500 uppercase">Daily Calories</p>
                          <p className="text-lg font-semibold text-gray-900">{plan.dailyCalorieTarget || 'N/A'}</p>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-xs text-gray-500 uppercase">Protein</p>
                          <p className="text-lg font-semibold text-gray-900">{plan.dailyProteinTarget || 'N/A'}g</p>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-xs text-gray-500 uppercase">Carbs</p>
                          <p className="text-lg font-semibold text-gray-900">{plan.dailyCarbTarget || 'N/A'}g</p>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-xs text-gray-500 uppercase">Fat</p>
                          <p className="text-lg font-semibold text-gray-900">{plan.dailyFatTarget || 'N/A'}g</p>
                        </div>
                      </div>
                      
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => handleAssignNutrition(plan.id)}
                          className="flex-1 bg-green-600 text-white py-2 px-3 rounded-lg text-sm hover:bg-green-700 transition-colors"
                        >
                          Assign to Client
                        </button>
                        <button 
                          onClick={() => handleEditNutrition(plan)}
                          className="p-2 text-gray-400 hover:text-blue-600 border border-gray-200 rounded-lg"
                          title="Edit Plan"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => setShowDeleteNutritionConfirm(plan.id)}
                          className="p-2 text-gray-400 hover:text-red-600 border border-gray-200 rounded-lg"
                          title="Delete Plan"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Schedule Tab */}
            {activeTab === 'schedule' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold text-gray-900">Training Schedule</h2>
                  <button 
                    onClick={() => setShowScheduleSession(true)}
                    className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    <Plus className="w-4 h-4 inline mr-2" />
                    Schedule Session
                  </button>
                </div>

                {/* Pending Approvals */}
                {appointments.filter(apt => apt.status === 'PENDING').length > 0 && (
                  <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                    <div className="p-6 bg-gradient-to-r from-yellow-50 to-orange-50">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Pending Approvals</h3>
                      <p className="text-gray-600">{appointments.filter(apt => apt.status === 'PENDING').length} appointment{appointments.filter(apt => apt.status === 'PENDING').length !== 1 ? 's' : ''} awaiting your approval</p>
                    </div>
                    
                    <div className="divide-y divide-gray-200">
                      {appointments.filter(apt => apt.status === 'PENDING').map((appointment) => (
                        <div key={appointment.id} className="p-6">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-3">
                                <h4 className="text-lg font-medium text-gray-900">{appointment.title}</h4>
                                <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">
                                  {appointment.type.replace('_', ' ')}
                                </span>
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600 mb-4">
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
                                  <div>Location: {appointment.location}</div>
                                )}
                              </div>
                              
                              {appointment.description && (
                                <p className="text-gray-700 mb-4">{appointment.description}</p>
                              )}
                              
                              <p className="text-xs text-gray-400">
                                Requested {new Date(appointment.createdAt).toLocaleDateString()} at {new Date(appointment.createdAt).toLocaleTimeString()}
                              </p>
                            </div>
                            
                            <div className="flex space-x-2 ml-4">
                              <button
                                onClick={() => handleApproveAppointment(appointment.id)}
                                className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-colors"
                                title="Approve"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleRejectAppointment(appointment.id)}
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

                {/* Monthly Calendar */}
                <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                  <div className="p-6 bg-gradient-to-r from-purple-50 to-blue-50">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Monthly Schedule</h3>
                        <p className="text-gray-600">{currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            const prevMonth = new Date(currentMonth);
                            prevMonth.setMonth(prevMonth.getMonth() - 1);
                            setCurrentMonth(prevMonth);
                          }}
                          className="p-2 text-gray-600 hover:text-gray-900 transition-colors"
                        >
                          ←
                        </button>
                        <button
                          onClick={() => {
                            const nextMonth = new Date(currentMonth);
                            nextMonth.setMonth(nextMonth.getMonth() + 1);
                            setCurrentMonth(nextMonth);
                          }}
                          className="p-2 text-gray-600 hover:text-gray-900 transition-colors"
                        >
                          →
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
                          <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
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
                          
                          for (let i = 0; i < 42; i++) { // 6 weeks × 7 days
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
                                  p-2 min-h-[80px] border border-gray-100 relative cursor-pointer hover:bg-gray-50 transition-colors
                                  ${!isCurrentMonth ? 'text-gray-300 bg-gray-50' : ''}
                                  ${isToday ? 'bg-blue-50 border-blue-200' : ''}
                                `}
                                onClick={() => {
                                  setSelectedDate(new Date(currentDate));
                                  setShowDayModal(true);
                                }}
                              >
                                <div className={`text-sm font-medium ${isToday ? 'text-blue-600' : isCurrentMonth ? 'text-gray-900' : 'text-gray-400'}`}>
                                  {currentDate.getDate()}
                                </div>
                                
                                {/* Appointment indicators */}
                                <div className="mt-1 space-y-1">
                                  {pendingCount > 0 && (
                                    <div className="text-xs bg-yellow-100 text-yellow-800 px-1 rounded text-center">
                                      {pendingCount} pending
                                    </div>
                                  )}
                                  {approvedCount > 0 && (
                                    <div className="text-xs bg-green-100 text-green-800 px-1 rounded text-center">
                                      {approvedCount} confirmed
                                    </div>
                                  )}
                                  {cancelledCount > 0 && (
                                    <div className="text-xs bg-red-100 text-red-800 px-1 rounded text-center">
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
                    <div className="flex items-center justify-center space-x-6 pt-4 border-t border-gray-200">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-yellow-100 border border-yellow-200 rounded"></div>
                        <span className="text-xs text-gray-600">Pending Requests</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-green-100 border border-green-200 rounded"></div>
                        <span className="text-xs text-gray-600">Confirmed Appointments</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-red-100 border border-red-200 rounded"></div>
                        <span className="text-xs text-gray-600">Cancelled Appointments</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Client Progress Tab */}
            {activeTab === 'progress' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <h2 className="text-2xl font-bold text-black">Client Progress Management</h2>
                  <div className="flex items-center gap-3">
                    {/* Progress View Toggle */}
                    <div className="flex bg-gray-100 rounded-lg p-1">
                      <button
                        onClick={() => setTrainerProgressView('charts')}
                        className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                          trainerProgressView === 'charts'
                            ? 'bg-white text-blue-600 shadow-sm'
                            : 'text-black hover:text-blue-600'
                        }`}
                      >
                        📊 Analytics
                      </button>
                      <button
                        onClick={() => setTrainerProgressView('daily')}
                        className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                          trainerProgressView === 'daily'
                            ? 'bg-white text-blue-600 shadow-sm'
                            : 'text-black hover:text-blue-600'
                        }`}
                      >
                        📅 Daily Progress
                      </button>
                    </div>
                    
                    {/* Client Selector */}
                    <select
                      value={selectedClientProgress || ''}
                      onChange={(e) => setSelectedClientProgress(e.target.value || null)}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black bg-white"
                    >
                      <option value="">All Clients</option>
                      {clients.map((client) => (
                        <option key={client.id} value={client.id}>
                          {client.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Content based on selected view */}
                {trainerProgressView === 'charts' ? (
                  <>
                    {/* Interactive Progress Analytics Charts */}
                    <TrainerProgressCharts 
                      selectedClientId={selectedClientProgress}
                      clients={clients}
                    />
                    
                    {/* Progress Overview Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-semibold text-blue-900">Total Clients Tracking</h3>
                          <Users className="h-6 w-6 text-blue-600" />
                        </div>
                        <p className="text-3xl font-bold text-blue-900">
                          {Object.keys(clientsProgress).length}
                        </p>
                        <p className="text-sm text-blue-600">out of {clients.length} clients</p>
                      </div>

                      <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-semibold text-green-900">Active This Week</h3>
                          <TrendingUp className="h-6 w-6 text-green-600" />
                        </div>
                        <p className="text-3xl font-bold text-green-900">
                          {Object.values(clientsProgress).filter((progress: { entries: ProgressEntry[]; analytics: ProgressAnalytics; }) => 
                            progress?.analytics?.summary?.consistency?.entriesPerWeek > 0
                          ).length}
                        </p>
                        <p className="text-sm text-green-600">clients logged progress</p>
                      </div>

                      <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-semibold text-purple-900">Average Progress</h3>
                          <Activity className="h-6 w-6 text-purple-600" />
                        </div>
                        <p className="text-3xl font-bold text-purple-900">
                          {Object.values(clientsProgress).length > 0 ? 
                            (Object.values(clientsProgress).reduce((acc: number, progress: { entries: ProgressEntry[]; analytics: ProgressAnalytics; }) => 
                              acc + (progress?.analytics?.weight?.change?.total || 0), 0) / 
                              Object.values(clientsProgress).length).toFixed(1) : '0.0'}
                        </p>
                        <p className="text-sm text-purple-600">lbs weight change</p>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Daily Progress View for Selected Client */}
                    <DailyProgressView 
                      isTrainer={true}
                      clientId={selectedClientProgress || undefined}
                    />
                  </>
                )}

                {/* Client Progress List */}
                <div className="bg-white rounded-xl shadow-sm">
                  <div className="p-6 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {selectedClientProgress ? 
                        `${clients.find(c => c.id === selectedClientProgress)?.name} Progress` : 
                        'All Client Progress'}
                    </h3>
                  </div>

                  <div className="divide-y divide-gray-200">
                    {(selectedClientProgress ? [selectedClientProgress] : clients.map(c => c.id))
                      .filter(clientId => clientsProgress[clientId])
                      .map((clientId) => {
                        const client = clients.find(c => c.id === clientId);
                        const progress = clientsProgress[clientId];
                        
                        if (!client || !progress?.analytics) return null;

                        return (
                          <div key={clientId} className="p-6 hover:bg-gray-50 transition-colors">
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex items-center space-x-3">
                                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                                  <span className="text-blue-600 font-semibold text-lg">
                                    {client.name.split(' ').map(n => n[0]).join('')}
                                  </span>
                                </div>
                                <div>
                                  <h4 className="font-semibold text-gray-900">{client.name}</h4>
                                  <p className="text-sm text-gray-500">{client.email}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <span className={`px-2 py-1 text-xs rounded-full ${
                                  progress.analytics.weight.trend === 'decreasing' ? 'bg-green-100 text-green-800' :
                                  progress.analytics.weight.trend === 'increasing' ? 'bg-red-100 text-red-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {progress.analytics.weight.trend}
                                </span>
                              </div>
                            </div>

                            {/* Progress Metrics Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                              <div className="text-center">
                                <p className="text-sm text-gray-500">Current Weight</p>
                                <p className="text-lg font-semibold text-gray-900">
                                  {progress.analytics.weight.current || 'N/A'} lbs
                                </p>
                              </div>
                              <div className="text-center">
                                <p className="text-sm text-gray-500">Total Change</p>
                                <p className={`text-lg font-semibold ${
                                  progress.analytics.weight.change.total !== null && progress.analytics.weight.change.total < 0 ? 'text-green-600' :
                                  progress.analytics.weight.change.total !== null && progress.analytics.weight.change.total > 0 ? 'text-red-600' : 'text-gray-900'
                                }`}>
                                  {progress.analytics.weight.change.total !== null ? 
                                    `${progress.analytics.weight.change.total > 0 ? '+' : ''}${progress.analytics.weight.change.total}` : 'N/A'} lbs
                                </p>
                              </div>
                              <div className="text-center">
                                <p className="text-sm text-gray-500">Streak</p>
                                <p className="text-lg font-semibold text-purple-600">
                                  {progress.analytics.summary.consistency.streak} days
                                </p>
                              </div>
                              <div className="text-center">
                                <p className="text-sm text-gray-500">Entries</p>
                                <p className="text-lg font-semibold text-blue-600">
                                  {progress.analytics.summary.totalEntries}
                                </p>
                              </div>
                            </div>

                            {/* Recent Progress */}
                            {progress.entries && progress.entries.length > 0 && (
                              <div>
                                <h5 className="text-sm font-medium text-gray-700 mb-2">Recent Entries</h5>
                                <div className="flex space-x-3 overflow-x-auto pb-2">
                                  {progress.entries.slice(0, 5).map((entry: ProgressEntry) => (
                                    <div key={entry.id} className="flex-shrink-0 bg-gray-50 rounded-lg p-3 min-w-[120px]">
                                      <p className="text-xs text-gray-500 mb-1">
                                        {new Date(entry.date).toLocaleDateString()}
                                      </p>
                                      {entry.weight && (
                                        <p className="text-sm font-medium text-gray-900">
                                          {entry.weight} lbs
                                        </p>
                                      )}
                                      {entry.mood && (
                                        <p className="text-xs text-gray-600">
                                          Mood: {entry.mood}/10
                                        </p>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Quick Actions */}
                            <div className="flex justify-end space-x-2 mt-4">
                              <button
                                onClick={() => fetchClientProgress(clientId)}
                                className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              >
                                Refresh
                              </button>
                              <button
                                onClick={() => handleViewClientDetails(clientId)}
                                className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                              >
                                View Details
                              </button>
                            </div>
                          </div>
                        );
                      })}
                  </div>

                  {/* Empty State */}
                  {clients.length === 0 && (
                    <div className="p-12 text-center">
                      <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">No Clients Found</h3>
                      <p className="text-gray-600">Add clients to start tracking their progress.</p>
                    </div>
                  )}

                  {/* No Progress Data */}
                  {clients.length > 0 && Object.keys(clientsProgress).length === 0 && (
                    <div className="p-12 text-center">
                      <TrendingUp className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">No Progress Data</h3>
                      <p className="text-gray-600">Your clients haven&apos;t started logging their progress yet.</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="bg-white rounded-xl p-6 shadow-sm">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">
                    Trainer Settings
                  </h2>

                  <div className="space-y-8">
                    {/* Profile Settings */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        Profile Settings
                      </h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-black mb-2">
                            Trainer Name
                          </label>
                          <input
                            type="text"
                            value={session?.user?.name || ''}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-black"
                            readOnly
                          />
                          <p className="text-sm text-gray-500 mt-1">Contact admin to change your trainer name</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-black mb-2">
                            Email Address
                          </label>
                          <input
                            type="email"
                            value={session?.user?.email || ''}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-black"
                            readOnly
                          />
                          <p className="text-sm text-gray-500 mt-1">Contact admin to change your email address</p>
                        </div>
                      </div>
                    </div>

                    {/* Notification Settings */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        Notifications
                      </h3>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <label className="text-sm font-medium text-black">
                              Client Notifications
                            </label>
                            <p className="text-sm text-gray-500">Receive notifications for client activities and updates</p>
                          </div>
                          <button
                            onClick={() => updateTrainerSetting('notifications', !userSettings.notifications)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                              userSettings.notifications ? 'bg-purple-600' : 'bg-gray-300'
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                userSettings.notifications ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <label className="text-sm font-medium text-black">
                              Email Updates
                            </label>
                            <p className="text-sm text-gray-500">Receive daily summary reports and system updates</p>
                          </div>
                          <button
                            onClick={() => updateTrainerSetting('emailUpdates', !userSettings.emailUpdates)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                              userSettings.emailUpdates ? 'bg-purple-600' : 'bg-gray-300'
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                userSettings.emailUpdates ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <label className="text-sm font-medium text-black">
                              Auto-Approve Appointments
                            </label>
                            <p className="text-sm text-gray-500">Automatically approve client appointment requests</p>
                          </div>
                          <button
                            onClick={() => updateTrainerSetting('autoApproval', !userSettings.autoApproval)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                              userSettings.autoApproval ? 'bg-purple-600' : 'bg-gray-300'
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                userSettings.autoApproval ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Display Settings */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        Display & Units
                      </h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-black mb-2">
                            Measurement Units
                          </label>
                          <select
                            value={userSettings.units}
                            onChange={(e) => updateTrainerSetting('units', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-black"
                          >
                            <option value="imperial">Imperial (lbs, ft/in)</option>
                            <option value="metric">Metric (kg, cm)</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-black mb-2">
                            Theme
                          </label>
                          <select
                            value={userSettings.theme}
                            onChange={(e) => updateTrainerSetting('theme', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-black"
                          >
                            <option value="light">Light</option>
                            <option value="dark">Dark</option>
                            <option value="auto">Auto</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-black mb-2">
                            Client Data Visibility
                          </label>
                          <select
                            value={userSettings.clientVisibility}
                            onChange={(e) => updateTrainerSetting('clientVisibility', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-black"
                          >
                            <option value="all">Show all client data</option>
                            <option value="summary">Show summary only</option>
                            <option value="minimal">Show minimal data</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex space-x-4 pt-6 border-t">
                      <button
                        onClick={resetTrainerSettings}
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        Reset to Defaults
                      </button>
                      <button
                        onClick={() => {
                          alert('Trainer settings saved successfully!');
                        }}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                      >
                        Save Changes
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Other tabs placeholder - now only for undefined tabs */}
            {!['overview', 'clients', 'contacts', 'workouts', 'exercises', 'nutrition', 'schedule', 'progress', 'settings'].includes(activeTab) && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl p-8 shadow-sm text-center"
              >
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  {menuItems.find(item => item.id === activeTab)?.label}
                </h2>
                <p className="text-gray-500">
                  This section is under development. Features coming soon!
                </p>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Appointment Details Modal */}
      {viewingAppointment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-gray-900">Appointment Details</h3>
              <button
                onClick={() => setViewingAppointment(null)}
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
                <span className="text-sm text-gray-500">
                  {viewingAppointment.type.replace('_', ' ')}
                </span>
              </div>

              {/* Appointment Information */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-3">Appointment Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Title</label>
                    <p className="text-gray-900">{viewingAppointment.title}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Client</label>
                    <p className="text-gray-900">{viewingAppointment.client?.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Date</label>
                    <p className="text-gray-900">{new Date(viewingAppointment.startTime).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Time</label>
                    <p className="text-gray-900">
                      {new Date(viewingAppointment.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - 
                      {new Date(viewingAppointment.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Duration</label>
                    <p className="text-gray-900">{viewingAppointment.duration} minutes</p>
                  </div>
                  {viewingAppointment.location && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Location</label>
                      <p className="text-gray-900">{viewingAppointment.location}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Description */}
              {viewingAppointment.description && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-3">Description</h4>
                  <p className="text-gray-700 whitespace-pre-wrap">{viewingAppointment.description}</p>
                </div>
              )}

              {/* Notes */}
              {viewingAppointment.notes && (
                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-3">Notes</h4>
                  <p className="text-gray-700 whitespace-pre-wrap">{viewingAppointment.notes}</p>
                </div>
              )}

              {/* Cancel Reason */}
              {viewingAppointment.cancelReason && (
                <div className="bg-red-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-3">Cancellation Reason</h4>
                  <p className="text-gray-700 whitespace-pre-wrap">{viewingAppointment.cancelReason}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex space-x-3 pt-4 border-t">
                {viewingAppointment.status === 'PENDING' && (
                  <>
                    <button
                      onClick={() => {
                        handleApproveAppointment(viewingAppointment.id);
                        setViewingAppointment(null);
                      }}
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center space-x-2"
                    >
                      <Check className="w-4 h-4" />
                      <span>Approve</span>
                    </button>
                    <button
                      onClick={() => {
                        handleRejectAppointment(viewingAppointment.id);
                        setViewingAppointment(null);
                      }}
                      className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center space-x-2"
                    >
                      <X className="w-4 h-4" />
                      <span>Reject</span>
                    </button>
                  </>
                )}
                <button
                  onClick={() => setViewingAppointment(null)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
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
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Remove Client</h3>
            <p className="text-gray-600 mb-6">
              How would you like to handle this client? Choose an option below:
            </p>
            
            <div className="space-y-3 mb-6">
              <label className="flex items-start space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  value="remove"
                  checked={removeAction === 'remove'}
                  onChange={(e) => setRemoveAction(e.target.value as 'remove' | 'delete')}
                  className="mt-1"
                />
                <div>
                  <p className="font-medium text-gray-900">Remove from my client list</p>
                  <p className="text-sm text-gray-500">
                    Client account remains active but they won&apos;t be assigned to you
                  </p>
                </div>
              </label>
              
              <label className="flex items-start space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  value="delete"
                  checked={removeAction === 'delete'}
                  onChange={(e) => setRemoveAction(e.target.value as 'remove' | 'delete')}
                  className="mt-1"
                />
                <div>
                  <p className="font-medium text-gray-900">Delete account completely</p>
                  <p className="text-sm text-red-600">
                    ⚠️ This will permanently delete their account and all data
                  </p>
                </div>
              </label>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={() => setShowRemoveConfirm(null)}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRemoveClient(showRemoveConfirm)}
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
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Reset Client Password</h3>
            <p className="text-gray-600 mb-6">
              This will reset the password for this client. They will be prompted to change it on their next login.
            </p>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Password (leave blank for default)
              </label>
              <input
                type="text"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Changemetoday1234!"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Default password: <code className="bg-gray-100 px-1 rounded">Changemetoday1234!</code>
              </p>
            </div>

            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-6">
              <p className="text-sm text-orange-800">
                ⚠️ The client will need to use this password to log in and will be prompted to change it immediately.
              </p>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowPasswordResetModal(null);
                  setNewPassword('');
                }}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleResetClientPassword(showPasswordResetModal)}
                className="flex-1 px-4 py-2 text-white bg-orange-600 hover:bg-orange-700 rounded-lg transition-colors"
              >
                Reset Password
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Workout Template Modal */}
      {showCreateWorkout && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-bold text-black">Create Workout Template</h2>
              <button
                onClick={() => setShowCreateWorkout(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
              <form onSubmit={handleCreateWorkoutSubmit} className="p-6 space-y-6">
                {/* Basic Workout Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="title" className="block text-sm font-medium text-black mb-1">
                      Workout Title *
                    </label>
                    <input
                      type="text"
                      id="title"
                      required
                      value={workoutFormData.title}
                      onChange={(e) => setWorkoutFormData(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-black"
                      placeholder="e.g., Upper Body Strength"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="startDate" className="block text-sm font-medium text-black mb-1">
                      Program Start Date
                    </label>
                    <input
                      type="date"
                      id="startDate"
                      value={workoutFormData.startDate || ''}
                      onChange={(e) => setWorkoutFormData(prev => ({ ...prev, startDate: e.target.value }))}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-black"
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="endDate" className="block text-sm font-medium text-black mb-1">
                      Program End Date
                    </label>
                    <input
                      type="date"
                      id="endDate"
                      value={workoutFormData.endDate || ''}
                      onChange={(e) => setWorkoutFormData(prev => ({ ...prev, endDate: e.target.value }))}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-black"
                      min={workoutFormData.startDate || new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="duration" className="block text-sm font-medium text-black mb-1">
                      Duration (minutes)
                    </label>
                    <input
                      type="number"
                      id="duration"
                      required
                      min="5"
                      max="180"
                      value={workoutFormData.duration}
                      onChange={(e) => setWorkoutFormData(prev => ({ ...prev, duration: parseInt(e.target.value) || 60 }))}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-black"
                      placeholder="60"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="difficulty" className="block text-sm font-medium text-black mb-1">
                      Difficulty Level
                    </label>
                    <select
                      id="difficulty"
                      value={workoutFormData.difficulty}
                      onChange={(e) => setWorkoutFormData(prev => ({ ...prev, difficulty: e.target.value as 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' }))}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-black"
                    >
                      <option value="BEGINNER">Beginner</option>
                      <option value="INTERMEDIATE">Intermediate</option>
                      <option value="ADVANCED">Advanced</option>
                    </select>
                  </div>
                  
                  <div>
                    <label htmlFor="type" className="block text-sm font-medium text-black mb-1">
                      Workout Type
                    </label>
                    <select
                      id="type"
                      value={workoutFormData.type}
                      onChange={(e) => setWorkoutFormData(prev => ({ ...prev, type: e.target.value as 'STRENGTH' | 'CARDIO' | 'FLEXIBILITY' | 'MIXED' }))}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-black"
                    >
                      <option value="STRENGTH">Strength Training</option>
                      <option value="CARDIO">Cardio</option>
                      <option value="FLEXIBILITY">Flexibility</option>
                      <option value="MIXED">Mixed</option>
                    </select>
                  </div>
                </div>
                
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-black mb-1">
                    Description
                  </label>
                  <textarea
                    id="description"
                    value={workoutFormData.description}
                    onChange={(e) => setWorkoutFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-black"
                    rows={3}
                    placeholder="Describe the workout objectives and target muscle groups..."
                  />
                </div>

                {/* Exercise Selection */}
                <div>
                  <h3 className="text-lg font-semibold mb-3 text-black">Add Exercises</h3>
                  
                  {/* Exercise Search */}
                  <div className="mb-4">
                    <div className="relative mb-3">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="text"
                        placeholder="Search exercises by name or muscle group..."
                        value={exerciseSearchTerm}
                        onChange={(e) => setExerciseSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                      />
                    </div>
                    
                    {/* Quick Filter Buttons */}
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setExerciseSearchTerm('')}
                        className={`px-3 py-1 text-xs rounded-full transition-colors ${
                          exerciseSearchTerm === '' 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        All
                      </button>
                      <button
                        type="button"
                        onClick={() => setExerciseSearchTerm('chest')}
                        className={`px-3 py-1 text-xs rounded-full transition-colors ${
                          exerciseSearchTerm === 'chest' 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        Chest
                      </button>
                      <button
                        type="button"
                        onClick={() => setExerciseSearchTerm('back')}
                        className={`px-3 py-1 text-xs rounded-full transition-colors ${
                          exerciseSearchTerm === 'back' 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        Back
                      </button>
                      <button
                        type="button"
                        onClick={() => setExerciseSearchTerm('legs')}
                        className={`px-3 py-1 text-xs rounded-full transition-colors ${
                          exerciseSearchTerm === 'legs' 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        Legs
                      </button>
                      <button
                        type="button"
                        onClick={() => setExerciseSearchTerm('arms')}
                        className={`px-3 py-1 text-xs rounded-full transition-colors ${
                          exerciseSearchTerm === 'arms' 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        Arms
                      </button>
                      <button
                        type="button"
                        onClick={() => setExerciseSearchTerm('core')}
                        className={`px-3 py-1 text-xs rounded-full transition-colors ${
                          exerciseSearchTerm === 'core' 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        Core
                      </button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    {availableExercises
                      .filter(exercise => {
                        const searchTerm = exerciseSearchTerm.toLowerCase();
                        const name = exercise.name.toLowerCase();
                        
                        // Handle muscle groups - could be array, string, or undefined
                        let muscleText = '';
                        if (exercise.muscleGroups) {
                          if (Array.isArray(exercise.muscleGroups)) {
                            muscleText = exercise.muscleGroups.join(' ').toLowerCase();
                          } else if (typeof exercise.muscleGroups === 'string') {
                            muscleText = exercise.muscleGroups.toLowerCase();
                          }
                        } else if (exercise.targetMuscle && typeof exercise.targetMuscle === 'string') {
                          muscleText = exercise.targetMuscle.toLowerCase();
                        }
                        
                        const difficulty = exercise.difficulty?.toLowerCase() || '';
                        
                        return name.includes(searchTerm) ||
                               muscleText.includes(searchTerm) ||
                               difficulty.includes(searchTerm);
                      })
                      .map((exercise) => {
                        const isAdded = workoutFormData.exercises.some(ex => ex.exerciseId === exercise.id);
                        return (
                      <div key={exercise.id} className={`border rounded-lg p-3 ${isAdded ? 'border-green-300 bg-green-50' : 'border-gray-200'}`}>
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="font-medium text-black">{exercise.name}</h4>
                            <p className="text-sm text-gray-600">{exercise.muscleGroups || exercise.targetMuscle || 'Not specified'}</p>
                            <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full mt-1">
                              {exercise.difficulty}
                            </span>
                            {isAdded && (
                              <span className="inline-block px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full mt-1 ml-2">
                                Added ✓
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => addExerciseToWorkout(exercise)}
                            disabled={isAdded}
                            className={`px-3 py-1 text-sm rounded transition-colors ${
                              isAdded 
                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                                : 'bg-blue-600 text-white hover:bg-blue-700'
                            }`}
                          >
                            {isAdded ? 'Added' : 'Add'}
                          </button>
                        </div>
                        <p className="text-xs text-gray-500">{exercise.instructions}</p>
                      </div>
                    )})}
                  </div>
                </div>

                {/* Selected Exercises */}
                {workoutFormData.exercises.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3 text-black">Workout Exercises ({workoutFormData.exercises.length})</h3>
                    <div className="space-y-3">
                      {workoutFormData.exercises.map((exercise, index) => {
                        const exerciseData = availableExercises.find(ex => ex.id === exercise.exerciseId);
                        return (
                          <div key={index} className="border border-gray-200 rounded-lg p-4">
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <h4 className="font-medium text-black">{exerciseData?.name}</h4>
                                <p className="text-sm text-gray-600">{exerciseData?.targetMuscle}</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeExerciseFromWorkout(index)}
                                className="text-red-600 hover:text-red-800"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                            
                            <div className="grid grid-cols-3 gap-3">
                              <div>
                                <label className="block text-xs font-medium text-black mb-1">Sets</label>
                                <input
                                  type="number"
                                  value={exercise.sets}
                                  onChange={(e) => updateExerciseInWorkout(index, { sets: parseInt(e.target.value) || 1 })}
                                  className="w-full p-1 border border-gray-300 rounded text-sm text-black"
                                  min="1"
                                  max="10"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-black mb-1">Reps</label>
                                <input
                                  type="number"
                                  value={exercise.reps}
                                  onChange={(e) => updateExerciseInWorkout(index, { reps: parseInt(e.target.value) || 1 })}
                                  className="w-full p-1 border border-gray-300 rounded text-sm text-black"
                                  min="1"
                                  max="100"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-black mb-1">Rest (sec)</label>
                                <input
                                  type="number"
                                  value={exercise.restTime}
                                  onChange={(e) => updateExerciseInWorkout(index, { restTime: parseInt(e.target.value) || 30 })}
                                  className="w-full p-1 border border-gray-300 rounded text-sm text-black"
                                  min="15"
                                  max="300"
                                />
                              </div>
                            </div>
                            
                            <div className="mt-3">
                              <label className="block text-xs font-medium text-black mb-1">Notes (optional)</label>
                              <input
                                type="text"
                                value={exercise.notes}
                                onChange={(e) => updateExerciseInWorkout(index, { notes: e.target.value })}
                                className="w-full p-1 border border-gray-300 rounded text-sm text-black"
                                placeholder="Special instructions or modifications..."
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Submit Buttons */}
                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => setShowCreateWorkout(false)}
                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Create Template
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Workout Template Modal */}
      {showEditWorkout && editingWorkout && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-bold">Edit Workout Template</h2>
              <button
                onClick={() => {
                  setShowEditWorkout(null);
                  setEditingWorkout(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
              <form onSubmit={handleUpdateWorkoutSubmit} className="p-6 space-y-6">
                {/* Basic Workout Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="edit-title" className="block text-sm font-medium text-black mb-1">
                      Workout Title *
                    </label>
                    <input
                      type="text"
                      id="edit-title"
                      required
                      value={workoutFormData.title}
                      onChange={(e) => setWorkoutFormData(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-black"
                      placeholder="e.g., Upper Body Strength"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="edit-startDate" className="block text-sm font-medium text-black mb-1">
                      Program Start Date
                    </label>
                    <input
                      type="date"
                      id="edit-startDate"
                      value={workoutFormData.startDate || ''}
                      onChange={(e) => setWorkoutFormData(prev => ({ ...prev, startDate: e.target.value }))}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-black"
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="edit-endDate" className="block text-sm font-medium text-black mb-1">
                      Program End Date
                    </label>
                    <input
                      type="date"
                      id="edit-endDate"
                      value={workoutFormData.endDate || ''}
                      onChange={(e) => setWorkoutFormData(prev => ({ ...prev, endDate: e.target.value }))}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-black"
                      min={workoutFormData.startDate || new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="edit-duration" className="block text-sm font-medium text-black mb-1">
                      Duration (minutes)
                    </label>
                    <input
                      type="number"
                      id="edit-duration"
                      required
                      min="5"
                      max="180"
                      value={workoutFormData.duration}
                      onChange={(e) => setWorkoutFormData(prev => ({ ...prev, duration: parseInt(e.target.value) || 60 }))}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-black"
                      placeholder="60"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="edit-difficulty" className="block text-sm font-medium text-black mb-1">
                      Difficulty Level
                    </label>
                    <select
                      id="edit-difficulty"
                      value={workoutFormData.difficulty}
                      onChange={(e) => setWorkoutFormData(prev => ({ ...prev, difficulty: e.target.value as 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' }))}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-black"
                    >
                      <option value="BEGINNER">Beginner</option>
                      <option value="INTERMEDIATE">Intermediate</option>
                      <option value="ADVANCED">Advanced</option>
                    </select>
                  </div>
                  
                  <div>
                    <label htmlFor="edit-type" className="block text-sm font-medium text-black mb-1">
                      Workout Type
                    </label>
                    <select
                      id="edit-type"
                      value={workoutFormData.type}
                      onChange={(e) => setWorkoutFormData(prev => ({ ...prev, type: e.target.value as 'STRENGTH' | 'CARDIO' | 'FLEXIBILITY' | 'MIXED' }))}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-black"
                    >
                      <option value="STRENGTH">Strength Training</option>
                      <option value="CARDIO">Cardio</option>
                      <option value="FLEXIBILITY">Flexibility</option>
                      <option value="MIXED">Mixed</option>
                    </select>
                  </div>
                </div>
                
                <div>
                  <label htmlFor="edit-description" className="block text-sm font-medium text-black mb-1">
                    Description
                  </label>
                  <textarea
                    id="edit-description"
                    value={workoutFormData.description}
                    onChange={(e) => setWorkoutFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-black"
                    rows={3}
                    placeholder="Describe the workout objectives and target muscle groups..."
                  />
                </div>

                {/* Add More Exercises Section */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Add More Exercises</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    {availableExercises
                      .filter(exercise => !workoutFormData.exercises.some(ex => ex.exerciseId === exercise.id))
                      .map((exercise) => (
                      <div key={exercise.id} className="border border-gray-200 rounded-lg p-3">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="font-medium text-black">{exercise.name}</h4>
                            <p className="text-sm text-gray-600">{exercise.muscleGroups || exercise.targetMuscle || 'Not specified'}</p>
                            <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full mt-1">
                              {exercise.difficulty}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => addExerciseToWorkout(exercise)}
                            className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                          >
                            Add
                          </button>
                        </div>
                        <p className="text-xs text-gray-500">{exercise.instructions}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Current Exercises */}
                {workoutFormData.exercises.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Current Exercises ({workoutFormData.exercises.length})</h3>
                    <div className="space-y-3">
                      {workoutFormData.exercises.map((exercise, index) => {
                        const exerciseData = availableExercises.find(ex => ex.id === exercise.exerciseId);
                        return (
                          <div key={index} className="border border-gray-200 rounded-lg p-4">
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <h4 className="font-medium text-black">{exerciseData?.name}</h4>
                                <p className="text-sm text-gray-600">{exerciseData?.targetMuscle}</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeExerciseFromWorkout(index)}
                                className="text-red-600 hover:text-red-800"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                            
                            <div className="grid grid-cols-3 gap-3">
                              <div>
                                <label className="block text-xs font-medium text-black mb-1">Sets</label>
                                <input
                                  type="number"
                                  value={exercise.sets}
                                  onChange={(e) => updateExerciseInWorkout(index, { sets: parseInt(e.target.value) || 1 })}
                                  className="w-full p-1 border border-gray-300 rounded text-sm text-black"
                                  min="1"
                                  max="10"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-black mb-1">Reps</label>
                                <input
                                  type="number"
                                  value={exercise.reps}
                                  onChange={(e) => updateExerciseInWorkout(index, { reps: parseInt(e.target.value) || 1 })}
                                  className="w-full p-1 border border-gray-300 rounded text-sm text-black"
                                  min="1"
                                  max="100"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-black mb-1">Rest (sec)</label>
                                <input
                                  type="number"
                                  value={exercise.restTime}
                                  onChange={(e) => updateExerciseInWorkout(index, { restTime: parseInt(e.target.value) || 30 })}
                                  className="w-full p-1 border border-gray-300 rounded text-sm text-black"
                                  min="15"
                                  max="300"
                                />
                              </div>
                            </div>
                            
                            <div className="mt-3">
                              <label className="block text-xs font-medium text-black mb-1">Notes (optional)</label>
                              <input
                                type="text"
                                value={exercise.notes}
                                onChange={(e) => updateExerciseInWorkout(index, { notes: e.target.value })}
                                className="w-full p-1 border border-gray-300 rounded text-sm text-black"
                                placeholder="Special instructions or modifications..."
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Submit Buttons */}
                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditWorkout(null);
                      setEditingWorkout(null);
                    }}
                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Update Template
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Assign Workout to Client Modal */}
      {showAssignWorkoutModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-black">Assign Workout to Client</h2>
              <button
                onClick={() => setShowAssignWorkoutModal(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              <p className="text-black">Select a client to assign this workout template:</p>
              
              <div className="max-h-64 overflow-y-auto space-y-2">
                {clients.length === 0 ? (
                  <p className="text-black text-center py-4">No clients available. Add clients first.</p>
                ) : (
                  clients.map((client) => (
                    <button
                      key={client.id}
                      onClick={() => handleAssignToClient(client.id, showAssignWorkoutModal)}
                      className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="font-medium text-black">{client.name}</div>
                      <div className="text-sm text-black">{client.email}</div>
                    </button>
                  ))
                )}
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 pt-4 border-t mt-4">
              <button
                onClick={() => setShowAssignWorkoutModal(null)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Nutrition Plan Modal */}
      {showCreateNutrition && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-gray-900">Create Nutrition Plan</h3>
              <button
                onClick={() => setShowCreateNutrition(false)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreateNutritionSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-black mb-1">Plan Name</label>
                <input
                  type="text"
                  value={nutritionFormData.name}
                  onChange={(e) => setNutritionFormData({...nutritionFormData, name: e.target.value})}
                  placeholder="e.g., Weight Loss Plan"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-black placeholder-gray-400"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-black mb-1">Description</label>
                <textarea
                  value={nutritionFormData.description}
                  onChange={(e) => setNutritionFormData({...nutritionFormData, description: e.target.value})}
                  placeholder="Describe the nutrition plan goals and approach..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-black placeholder-gray-400"
                  required
                />
              </div>

              {/* Date Range */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-black mb-1">Start Date</label>
                  <input
                    type="date"
                    value={nutritionFormData.startDate}
                    onChange={(e) => setNutritionFormData({...nutritionFormData, startDate: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-black"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-black mb-1">End Date</label>
                  <input
                    type="date"
                    value={nutritionFormData.endDate}
                    onChange={(e) => setNutritionFormData({...nutritionFormData, endDate: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-black"
                  />
                </div>
              </div>

              {/* Client Assignment */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center mb-3">
                  <input
                    type="checkbox"
                    id="assignToClient"
                    checked={nutritionFormData.assignToClient}
                    onChange={(e) => setNutritionFormData({...nutritionFormData, assignToClient: e.target.checked})}
                    className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                  />
                  <label htmlFor="assignToClient" className="ml-2 text-sm font-medium text-gray-900">
                    Assign to a client immediately
                  </label>
                </div>
                
                {nutritionFormData.assignToClient && (
                  <div>
                    <label className="block text-sm font-medium text-black mb-1">Select Client</label>
                    <select
                      value={nutritionFormData.clientId}
                      onChange={(e) => setNutritionFormData({...nutritionFormData, clientId: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-black"
                      required={nutritionFormData.assignToClient}
                    >
                      <option value="">Choose a client...</option>
                      {clients.map((client) => (
                        <option key={client.id} value={client.id}>
                          {client.name} ({client.email})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                
                {!nutritionFormData.assignToClient && (
                  <p className="text-xs text-gray-600 mt-2">
                    You can assign this plan to clients later from the nutrition plans list.
                  </p>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-black mb-1">Daily Calories</label>
                  <input
                    type="number"
                    value={nutritionFormData.dailyCalorieTarget}
                    onChange={(e) => setNutritionFormData({...nutritionFormData, dailyCalorieTarget: parseInt(e.target.value) || 0})}
                    placeholder="1800"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-black placeholder-gray-400"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-black mb-1">Protein (g)</label>
                  <input
                    type="number"
                    value={nutritionFormData.dailyProteinTarget}
                    onChange={(e) => setNutritionFormData({...nutritionFormData, dailyProteinTarget: parseInt(e.target.value) || 0})}
                    placeholder="120"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-black placeholder-gray-400"
                    required
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-black mb-1">Carbs (g)</label>
                  <input
                    type="number"
                    value={nutritionFormData.dailyCarbTarget}
                    onChange={(e) => setNutritionFormData({...nutritionFormData, dailyCarbTarget: parseInt(e.target.value) || 0})}
                    placeholder="150"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-black placeholder-gray-400"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-black mb-1">Fat (g)</label>
                  <input
                    type="number"
                    value={nutritionFormData.dailyFatTarget}
                    onChange={(e) => setNutritionFormData({...nutritionFormData, dailyFatTarget: parseInt(e.target.value) || 0})}
                    placeholder="60"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-black placeholder-gray-400"
                    required
                  />
                </div>
              </div>
              
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateNutrition(false)}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
                >
                  Create Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Nutrition Plan Modal */}
      {showAssignNutrition && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-gray-900">Assign Nutrition Plan</h3>
              <button
                onClick={() => setShowAssignNutrition(null)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <p className="text-gray-600">Select a client to assign this nutrition plan to:</p>
              
              <div className="space-y-2">
                {clients.map((client) => (
                  <button
                    key={client.id}
                    onClick={() => handleAssignNutritionToClient(client.id, showAssignNutrition)}
                    className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="font-medium text-gray-900">{client.name}</div>
                    <div className="text-sm text-gray-500">{client.email}</div>
                  </button>
                ))}
              </div>
              
              {clients.length === 0 && (
                <p className="text-gray-500 text-center py-4">No clients available</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Nutrition Plan Modal */}
      {showEditNutrition && editingNutrition && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-gray-900">Edit Nutrition Plan</h3>
              <button
                onClick={() => {
                  setShowEditNutrition(null);
                  setEditingNutrition(null);
                }}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleUpdateNutritionSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-black mb-1">Plan Name</label>
                <input
                  type="text"
                  value={nutritionFormData.name}
                  onChange={(e) => setNutritionFormData({...nutritionFormData, name: e.target.value})}
                  placeholder="e.g., Weight Loss Plan"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-black placeholder-gray-400"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-black mb-1">Description</label>
                <textarea
                  value={nutritionFormData.description}
                  onChange={(e) => setNutritionFormData({...nutritionFormData, description: e.target.value})}
                  placeholder="Describe the nutrition plan goals and approach..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-black placeholder-gray-400"
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-black mb-1">Daily Calories</label>
                  <input
                    type="number"
                    value={nutritionFormData.dailyCalorieTarget}
                    onChange={(e) => setNutritionFormData({...nutritionFormData, dailyCalorieTarget: parseInt(e.target.value) || 0})}
                    placeholder="1800"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-black placeholder-gray-400"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-black mb-1">Protein (g)</label>
                  <input
                    type="number"
                    value={nutritionFormData.dailyProteinTarget}
                    onChange={(e) => setNutritionFormData({...nutritionFormData, dailyProteinTarget: parseInt(e.target.value) || 0})}
                    placeholder="120"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-black placeholder-gray-400"
                    required
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-black mb-1">Carbs (g)</label>
                  <input
                    type="number"
                    value={nutritionFormData.dailyCarbTarget}
                    onChange={(e) => setNutritionFormData({...nutritionFormData, dailyCarbTarget: parseInt(e.target.value) || 0})}
                    placeholder="150"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-black placeholder-gray-400"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-black mb-1">Fat (g)</label>
                  <input
                    type="number"
                    value={nutritionFormData.dailyFatTarget}
                    onChange={(e) => setNutritionFormData({...nutritionFormData, dailyFatTarget: parseInt(e.target.value) || 0})}
                    placeholder="60"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-black placeholder-gray-400"
                    required
                  />
                </div>
              </div>
              
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditNutrition(null);
                    setEditingNutrition(null);
                  }}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
                >
                  Update Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Nutrition Plan Confirmation Modal */}
      {showDeleteNutritionConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-gray-900">Delete Nutrition Plan</h3>
              <button
                onClick={() => setShowDeleteNutritionConfirm(null)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <p className="text-gray-600">
                Are you sure you want to delete this nutrition plan? This action cannot be undone.
              </p>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowDeleteNutritionConfirm(null)}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    handleDeleteNutritionPlan(showDeleteNutritionConfirm);
                    setShowDeleteNutritionConfirm(null);
                  }}
                  className="flex-1 px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                >
                  Delete Plan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invitation Code Modal */}
      {showInvitationCode && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-gray-900">Client Approved!</h3>
              <button
                onClick={() => {
                  setShowInvitationCode(null);
                  setGeneratedCode('');
                }}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <p className="text-gray-600">
                Client has been approved! Share this invitation code with them:
              </p>

              {/* Email Status */}
              {inviteEmailSent ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-start space-x-2">
                  <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-green-800">Email Sent Successfully!</p>
                    <p className="text-xs text-green-600 mt-1">
                      The invitation has been sent to {showInvitationCode}
                    </p>
                  </div>
                </div>
              ) : inviteEmailError ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start space-x-2">
                  <X className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-yellow-800">Email Failed to Send</p>
                    <p className="text-xs text-yellow-600 mt-1">
                      You can try sending again or copy the code to share manually
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start space-x-2">
                  <Mail className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-blue-800">Ready to Send Email</p>
                    <p className="text-xs text-blue-600 mt-1">
                      Click &quot;Send Email&quot; below to email the invitation to {showInvitationCode}
                    </p>
                  </div>
                </div>
              )}
              
              <div className="bg-gray-50 p-4 rounded-lg border-2 border-dashed border-gray-300">
                <div className="text-center">
                  <p className="text-sm text-gray-500 mb-2">Invitation Code</p>
                  <p className="text-2xl font-mono font-bold text-green-600 tracking-widest">
                    {generatedCode}
                  </p>
                </div>
              </div>

              {/* Invitation URL */}
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">Full Invitation Link:</p>
                <p className="text-xs font-mono text-gray-700 break-all">
                  {`${typeof window !== 'undefined' ? window.location.origin : ''}/invite/${generatedCode}`}
                </p>
              </div>
              
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-blue-800">
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
                    alert('Invitation code copied to clipboard!');
                  }}
                  className="px-4 py-2 text-blue-700 bg-blue-100 rounded-lg hover:bg-blue-200 transition-colors flex items-center justify-center space-x-2"
                >
                  <span>Copy Code</span>
                </button>
                <button
                  onClick={() => {
                    const inviteUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/invite/${generatedCode}`;
                    navigator.clipboard.writeText(inviteUrl);
                    alert('Invitation link copied to clipboard!');
                  }}
                  className="px-4 py-2 text-purple-700 bg-purple-100 rounded-lg hover:bg-purple-200 transition-colors flex items-center justify-center space-x-2"
                >
                  <span>Copy Link</span>
                </button>
              </div>

              {/* Send Email Button */}
              {!inviteEmailSent && (
                <button
                  onClick={() => {
                    if (showInvitationCode) {
                      handleResendInviteEmail(
                        showInvitationCode,
                        showInvitationCode.split('@')[0],
                        generatedCode
                      );
                    }
                  }}
                  disabled={resendingEmail}
                  className={`w-full px-4 py-2 rounded-lg transition-colors flex items-center justify-center space-x-2 ${
                    resendingEmail
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700'
                  }`}
                >
                  <Mail className="w-4 h-4" />
                  <span>{resendingEmail ? 'Sending...' : inviteEmailError ? 'Resend Invitation Email' : 'Send Invitation Email'}</span>
                </button>
              )}
              
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowInvitationCode(null);
                    setGeneratedCode('');
                    setInviteEmailSent(false);
                    setInviteEmailError(null);
                  }}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-gray-900">Contact Submission Details</h3>
              <button
                onClick={() => setViewingSubmission(null)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-6">
              {/* Status Badge */}
              <div className="flex items-center space-x-3">
                <span className={`px-3 py-1 text-sm rounded-full ${
                  viewingSubmission.status === 'NEW' 
                    ? 'bg-red-100 text-red-800' 
                    : viewingSubmission.status === 'CONTACTED'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-green-100 text-green-800'
                }`}>
                  {viewingSubmission.status}
                </span>
                <span className="text-sm text-gray-500">
                  Submitted {new Date(viewingSubmission.createdAt).toLocaleDateString()} at {new Date(viewingSubmission.createdAt).toLocaleTimeString()}
                </span>
              </div>

              {/* Contact Information */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-3">Contact Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Name</label>
                    <p className="text-gray-900">{viewingSubmission.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Email</label>
                    <p className="text-gray-900">{viewingSubmission.email}</p>
                  </div>
                  {viewingSubmission.phone && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Phone</label>
                      <p className="text-gray-900">{viewingSubmission.phone}</p>
                    </div>
                  )}
                  {viewingSubmission.age && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Age</label>
                      <p className="text-gray-900">{viewingSubmission.age}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Fitness Information */}
              {viewingSubmission.fitnessLevel && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-3">Fitness Information</h4>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Fitness Level</label>
                    <p className="text-gray-900">{viewingSubmission.fitnessLevel}</p>
                  </div>
                </div>
              )}

              {/* Message */}
              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-3">Message</h4>
                <p className="text-gray-700 whitespace-pre-wrap">{viewingSubmission.message}</p>
              </div>

              {/* Goals */}
              {viewingSubmission.fitnessGoals && (
                <div className="bg-purple-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-3">Fitness Goals</h4>
                  <p className="text-gray-700 whitespace-pre-wrap">{viewingSubmission.fitnessGoals}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex space-x-3 pt-4 border-t">
                {viewingSubmission.status === 'NEW' && (
                  <>
                    <button
                      onClick={() => {
                        handleApproveClient(viewingSubmission);
                        setViewingSubmission(null);
                      }}
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center space-x-2"
                    >
                      <Check className="w-4 h-4" />
                      <span>Accept & Send Invitation</span>
                    </button>
                    <button
                      onClick={() => {
                        updateSubmissionStatus(viewingSubmission.id, 'COMPLETED');
                        setViewingSubmission(null);
                      }}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center space-x-2"
                    >
                      <X className="w-4 h-4" />
                      <span>Reject Application</span>
                    </button>
                  </>
                )}
                <button
                  onClick={() => setViewingSubmission(null)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-semibold text-gray-900">Client Details</h3>
              <button
                onClick={() => {
                  setShowClientDetails(null);
                  setSelectedClientData(null);
                }}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            {/* Client Header */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 mb-6">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-xl font-bold">
                    {selectedClientData.name.split(' ').map((n: string) => n[0]).join('')}
                  </span>
                </div>
                <div>
                  <h4 className="text-xl font-bold text-gray-900">{selectedClientData.name}</h4>
                  <p className="text-gray-600">{selectedClientData.email}</p>
                  <div className="flex items-center space-x-4 mt-2">
                    <div className="flex items-center text-sm text-gray-600">
                      <Clock className="w-4 h-4 mr-1" />
                      <span className="font-medium">Joined:</span>
                      <span className="ml-1">
                        {selectedClientData.profile?.joinDate ? new Date(selectedClientData.profile.joinDate).toLocaleDateString() : 'Unknown'}
                      </span>
                    </div>
                    {selectedClientData.profile?.joinDate && (
                      <span className="text-sm text-blue-600 bg-blue-100 px-3 py-1 rounded-full font-medium">
                        {getMembershipDuration(selectedClientData.profile.joinDate)} as client
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Profile Information */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h5 className="text-lg font-semibold text-gray-900 mb-4">Profile Information</h5>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Age:</span>
                    <span className="font-medium text-black">{selectedClientData.profile?.age} years</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Height:</span>
                    <span className="font-medium text-black">{selectedClientData.profile?.height}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Current Weight:</span>
                    <span className="font-medium text-black">{selectedClientData.profile?.weight}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Fitness Level:</span>
                    <span className="font-medium text-black">{selectedClientData.profile?.fitnessLevel}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Primary Goal:</span>
                    <span className="font-medium text-black">{selectedClientData.profile?.goals}</span>
                  </div>
                </div>
              </div>

              {/* Progress Stats */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h5 className="text-lg font-semibold text-gray-900 mb-4">Progress Overview</h5>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Current Weight:</span>
                    <span className="font-medium text-black">{selectedClientData.progress?.currentWeight}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Weight Change:</span>
                    <span className={`font-medium ${selectedClientData.progress?.weightChange?.includes('-') ? 'text-green-600' : 'text-red-600'}`}>
                      {selectedClientData.progress?.weightChange}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Progress Streak:</span>
                    <span className="font-medium text-purple-600">{selectedClientData.progress?.workoutStreak} days</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Entries:</span>
                    <span className="font-medium text-blue-600">{selectedClientData.progress?.totalEntries}</span>
                  </div>
                  {selectedClientData.progress?.totalEntries === 0 && (
                    <div className="text-center py-4 text-gray-500">
                      <TrendingUp className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                      <p className="text-sm">No progress data available yet</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Assigned Workouts */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h5 className="text-lg font-semibold text-gray-900 mb-4">Assigned Workouts</h5>
                <div className="space-y-3">
                  {selectedClientData.assignedWorkouts && selectedClientData.assignedWorkouts.length > 0 ? (
                    selectedClientData.assignedWorkouts.map((workout, index: number) => (
                      <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">{workout.name}</p>
                          <p className="text-sm text-gray-500">Assigned: {workout.assignedDate}</p>
                          <p className="text-xs text-gray-400">{workout.exercises} exercises</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">{workout.duration}</p>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            workout.completed ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {workout.completed ? 'Completed' : 'Pending'}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4 text-gray-500">
                      <Dumbbell className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                      <p>No workouts assigned yet</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Assigned Nutrition Plans */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h5 className="text-lg font-semibold text-gray-900 mb-4">Assigned Nutrition Plans</h5>
                <div className="space-y-3">
                  {selectedClientData.assignedNutritionPlans && selectedClientData.assignedNutritionPlans.length > 0 ? (
                    selectedClientData.assignedNutritionPlans.map((plan, index: number) => (
                      <div key={index} className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-medium text-gray-900">{plan.name}</p>
                            <p className="text-sm text-gray-500">{plan.startDate} - {plan.endDate}</p>
                          </div>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            plan.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {plan.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                          <div>Calories: {plan.dailyCalorieTarget}</div>
                          <div>Protein: {plan.dailyProteinTarget}g</div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4 text-gray-500">
                      <Apple className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                      <p>No nutrition plans assigned yet</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Nutrition Stats */}
              {selectedClientData.nutritionStats && (
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h5 className="text-lg font-semibold text-gray-900 mb-4">Nutrition Overview (Last 7 Days)</h5>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <p className="text-2xl font-bold text-blue-600">{selectedClientData.nutritionStats.avgCalories}</p>
                      <p className="text-sm text-gray-600">Avg Calories/Day</p>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <p className="text-2xl font-bold text-green-600">{selectedClientData.nutritionStats.avgProtein}g</p>
                      <p className="text-sm text-gray-600">Avg Protein/Day</p>
                    </div>
                    <div className="text-center p-3 bg-purple-50 rounded-lg">
                      <p className="text-2xl font-bold text-purple-600">{selectedClientData.nutritionStats.adherenceRate}</p>
                      <p className="text-sm text-gray-600">Plan Adherence</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Recent Food Entries */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="flex justify-between items-center mb-4">
                  <h5 className="text-lg font-semibold text-gray-900">Recent Food Entries</h5>
                  {selectedClientData.recentFoodEntries && selectedClientData.recentFoodEntries.length > 0 && (
                    <select
                      value={selectedFoodEntryDate}
                      onChange={(e) => setSelectedFoodEntryDate(e.target.value)}
                      className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black bg-white min-w-[120px]"
                    >
                      <option value="all">All Days</option>
                      {(() => {
                        const uniqueDates = Array.from(new Set(selectedClientData.recentFoodEntries.map(entry => entry.date)));
                        return uniqueDates
                          .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
                          .map(date => {
                            // Format date without timezone issues
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
                          <div className="text-center py-4 text-gray-500">
                            <Apple className="w-8 h-8 mx-auto mb-2 text-gray-400" />
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
                              <div className="sticky top-0 bg-gray-100 px-3 py-2 rounded-lg mb-2">
                                <h6 className="font-medium text-gray-700 text-sm">
                                  {new Date(date).toLocaleDateString('en-US', { 
                                    weekday: 'short', 
                                    month: 'short', 
                                    day: 'numeric' 
                                  })}
                                  <span className="ml-2 text-xs text-gray-500">
                                    ({entries.reduce((sum, entry) => sum + entry.calories, 0)} cal total)
                                  </span>
                                </h6>
                              </div>
                              {entries.map((entry, index: number) => (
                                <div key={`${date}-${index}`} className="p-3 bg-gray-50 rounded-lg mb-2">
                                  <div className="flex justify-between items-start mb-2">
                                    <div>
                                      <p className="font-medium text-gray-900">{entry.foodName}</p>
                                      <p className="text-sm text-gray-500">{entry.quantity} {entry.unit}</p>
                                      <span className="inline-block text-xs px-2 py-1 bg-orange-100 text-orange-800 rounded-full mt-1">
                                        {entry.mealType}
                                      </span>
                                    </div>
                                    <div className="text-right">
                                      <p className="text-sm font-medium text-red-600">{entry.calories} cal</p>
                                      <p className="text-xs text-gray-500">P:{entry.protein}g C:{entry.carbs}g F:{entry.fat}g</p>
                                    </div>
                                  </div>
                                  {entry.notes && (
                                    <p className="text-xs text-gray-500 mt-1">{entry.notes}</p>
                                  )}
                                </div>
                              ))}
                            </div>
                          ));
                      } else {
                        // Show entries for selected date only
                        return filteredEntries.map((entry, index: number) => (
                          <div key={index} className="p-3 bg-gray-50 rounded-lg">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <p className="font-medium text-gray-900">{entry.foodName}</p>
                                <p className="text-sm text-gray-500">{entry.quantity} {entry.unit}</p>
                                <span className="inline-block text-xs px-2 py-1 bg-orange-100 text-orange-800 rounded-full mt-1">
                                  {entry.mealType}
                                </span>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-medium text-red-600">{entry.calories} cal</p>
                                <p className="text-xs text-gray-500">P:{entry.protein}g C:{entry.carbs}g F:{entry.fat}g</p>
                              </div>
                            </div>
                            {entry.notes && (
                              <p className="text-xs text-gray-500 mt-1">{entry.notes}</p>
                            )}
                          </div>
                        ));
                      }
                    })()
                  ) : (
                    <div className="text-center py-4 text-gray-500">
                      <Apple className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                      <p>No food entries logged yet</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Recent Progress Entries */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h5 className="text-lg font-semibold text-gray-900 mb-4">Recent Progress Entries</h5>
                <div className="space-y-3">
                  {selectedClientData.recentProgress && selectedClientData.recentProgress.length > 0 ? (
                    selectedClientData.recentProgress.map((entry, index: number) => (
                      <div key={index} className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex justify-between items-center mb-1">
                          <p className="text-sm font-medium text-gray-900">
                            {new Date(entry.date).toLocaleDateString()}
                          </p>
                          {entry.weight && (
                            <p className="text-sm font-medium text-blue-600">{entry.weight} lbs</p>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                          {entry.mood && <div>Mood: {entry.mood}/10</div>}
                          {entry.energy && <div>Energy: {entry.energy}/10</div>}
                          {entry.bodyFat && <div>Body Fat: {entry.bodyFat}%</div>}
                          {entry.muscleMass && <div>Muscle: {entry.muscleMass} lbs</div>}
                        </div>
                        {entry.notes && (
                          <p className="text-xs text-gray-500 mt-1">{entry.notes}</p>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4 text-gray-500">
                      <TrendingUp className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                      <p>No progress entries yet</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Workout Progress */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="flex justify-between items-center mb-4">
                  <h5 className="text-lg font-semibold text-gray-900">Workout Progress</h5>
                  {selectedClientData.workoutProgress && selectedClientData.workoutProgress.length > 0 && (
                    <select
                      value={selectedWorkoutProgressDate}
                      onChange={(e) => setSelectedWorkoutProgressDate(e.target.value)}
                      className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black bg-white min-w-[120px]"
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
                              const progressDate = new Date(entry.date);
                              const match = entry.date === selectedWorkoutProgressDate;
                              return match;
                            });
                            return results;
                          })();
                      
                      if (filteredProgress.length === 0) {
                        return (
                          <div className="text-center py-4 text-gray-500">
                            <Dumbbell className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                            <p>No workout progress for selected date</p>
                          </div>
                        );
                      }
                      
                      return filteredProgress.map((progress, index: number) => (
                        <div key={index} className="p-4 border border-gray-200 rounded-lg">
                        <div className="flex justify-between items-center mb-3">
                          <div>
                            <h6 className="text-sm font-semibold text-gray-900">
                              {progress.workoutSession?.workoutTemplate?.name || 'Workout'}
                            </h6>
                            <p className="text-xs text-gray-500">
                              {new Date(progress.date).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-500">Session</p>
                            <p className="text-sm font-medium text-blue-600">
                              {progress.workoutSession?.id || 'N/A'}
                            </p>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-700">
                              {progress.exercise?.name || 'Exercise'}
                            </span>
                            <div className="flex space-x-3 text-sm text-gray-600">
                              {progress.weight && (
                                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-md">
                                  {progress.weight} lbs
                                </span>
                              )}
                              {progress.sets && (
                                <span className="bg-green-100 text-green-800 px-2 py-1 rounded-md">
                                  {progress.sets} sets
                                </span>
                              )}
                              {progress.reps && (
                                <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-md">
                                  {progress.reps} reps
                                </span>
                              )}
                            </div>
                          </div>
                          
                          {progress.notes && (
                            <p className="text-xs text-gray-500 italic mt-2">
                              Notes: {progress.notes}
                            </p>
                          )}
                        </div>
                      </div>
                      ));
                    })()
                  ) : (
                    <div className="text-center py-6 text-gray-500">
                      <Dumbbell className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                      <p>No workout progress logged yet</p>
                      <p className="text-xs mt-1">Client workouts will appear here once they start logging exercises</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3 mt-6 pt-6 border-t border-gray-200">
              <button
                onClick={() => handleAssignWorkout(selectedClientData.id)}
                className="flex-1 px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
              >
                <Dumbbell className="w-4 h-4" />
                <span>Assign Workout</span>
              </button>
              <button
                onClick={() => {
                  // Handle create nutrition plan
                  setShowCreateNutrition(true);
                  setShowClientDetails(null);
                }}
                className="flex-1 px-4 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center space-x-2"
              >
                <Apple className="w-4 h-4" />
                <span>Create Nutrition Plan</span>
              </button>
              <button
                onClick={() => setShowRemoveConfirm(selectedClientData.id)}
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-gray-900">Assign Workout</h3>
              <button
                onClick={() => setShowAssignWorkout(null)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            {/* Client Info */}
            <div className="bg-blue-50 rounded-lg p-4 mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-medium">
                    {clients.find(c => c.id === showAssignWorkout)?.name.split(' ').map(n => n[0]).join('') || '?'}
                  </span>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">
                    {clients.find(c => c.id === showAssignWorkout)?.name || 'Client'}
                  </h4>
                  <p className="text-sm text-gray-600">
                    {clients.find(c => c.id === showAssignWorkout)?.email || ''}
                  </p>
                </div>
              </div>
            </div>

            {/* Workout Templates */}
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Select Workout Template</h4>
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
                  <div key={workout.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h5 className="font-semibold text-gray-900">{workout.name}</h5>
                        <p className="text-sm text-gray-600">{workout.description}</p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        workout.difficulty === 'Beginner' ? 'bg-green-100 text-green-800' :
                        workout.difficulty === 'Intermediate' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {workout.difficulty}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm text-gray-500 mb-3">
                      <span>
                        Duration: {workout.duration || 'Not specified'}
                      </span>
                      <span>{workout.exercises.length} exercises</span>
                    </div>
                    <div className="flex flex-wrap gap-1 mb-3">
                      {workout.exercises.map((exercise, idx) => (
                        <span key={idx} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
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
                            setShowAssignWorkout(null);
                            alert(`Successfully assigned "${workout.name}" to client!`);
                          } else {
                            alert('Failed to assign workout. Please try again.');
                          }
                        } catch (error) {
                          console.error('Error assigning workout:', error);
                          alert('Error assigning workout. Please try again.');
                        }
                      }}
                      className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Assign This Workout
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Custom Notes */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-black mb-2">
                Additional Notes (Optional)
              </label>
              <textarea
                placeholder="Add any specific instructions or modifications..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3">
              <button
                onClick={() => setShowAssignWorkout(null)}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowCreateWorkout(true)}
                className="flex-1 px-4 py-2 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
              >
                Create New Template
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Client Modal */}
      {showAddClient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-gray-900">Add New Client</h3>
              <button
                onClick={() => setShowAddClient(false)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleAddClient} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-black mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={newClientData.name}
                    onChange={(e) => setNewClientData({...newClientData, name: e.target.value})}
                    placeholder="Enter client's full name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-black mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={newClientData.email}
                    onChange={(e) => setNewClientData({...newClientData, email: e.target.value})}
                    placeholder="client@example.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-black mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={newClientData.phone}
                    onChange={(e) => setNewClientData({...newClientData, phone: e.target.value})}
                    placeholder="(555) 123-4567"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-black mb-1">Age</label>
                  <input
                    type="number"
                    value={newClientData.age}
                    onChange={(e) => setNewClientData({...newClientData, age: e.target.value})}
                    placeholder="25"
                    min="16"
                    max="100"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-black mb-1">Height</label>
                  <input
                    type="text"
                    value={newClientData.height}
                    onChange={(e) => setNewClientData({...newClientData, height: e.target.value})}
                    placeholder="5'8&quot; or 173cm"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-black mb-1">Current Weight</label>
                  <input
                    type="text"
                    value={newClientData.weight}
                    onChange={(e) => setNewClientData({...newClientData, weight: e.target.value})}
                    placeholder="150 lbs or 68 kg"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-black mb-1">Fitness Level</label>
                <select
                  value={newClientData.fitnessLevel}
                  onChange={(e) => setNewClientData({...newClientData, fitnessLevel: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                >
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-black mb-1">Fitness Goals</label>
                <textarea
                  value={newClientData.goals}
                  onChange={(e) => setNewClientData({...newClientData, goals: e.target.value})}
                  placeholder="Describe their fitness goals and what they want to achieve..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-2">
                  <div className="text-blue-600 mt-0.5">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="text-sm text-blue-700">
                    <p className="font-medium mb-1">Account Setup Information:</p>
                    <ul className="space-y-1 text-blue-600">
                      <li>• Client will receive an email with login instructions</li>
                      <li>• Default password: <code className="bg-blue-100 px-1 rounded">Changemetoday1234!</code></li>
                      <li>• They will be prompted to change password on first login</li>
                      <li>• Automatically assigned to you as their trainer</li>
                    </ul>
                  </div>
                </div>
              </div>
              
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddClient(false)}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 text-white font-semibold bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Create Client Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Schedule Session Modal */}
      {showScheduleSession && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-900">Schedule New Session</h2>
                <button
                  onClick={() => setShowScheduleSession(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            
            <form onSubmit={handleScheduleSessionSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-black mb-2">
                    Client *
                  </label>
                  <select
                    name="clientId"
                    value={scheduleFormData.clientId}
                    onChange={(e) => setScheduleFormData(prev => ({ ...prev, clientId: e.target.value }))}
                    required
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-black"
                  >
                    <option value="">Select a client</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-black mb-2">
                    Session Type *
                  </label>
                  <select
                    name="type"
                    value={scheduleFormData.type}
                    onChange={(e) => setScheduleFormData(prev => ({ ...prev, type: e.target.value }))}
                    required
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-black"
                  >
                    <option value="TRAINING_SESSION">Personal Training</option>
                    <option value="CHECK_IN">Progress Check-in</option>
                    <option value="NUTRITION_CONSULTATION">Nutrition Consultation</option>
                    <option value="ASSESSMENT">Fitness Assessment</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-black mb-2">
                  Session Title *
                </label>
                <input
                  type="text"
                  name="title"
                  value={scheduleFormData.title}
                  onChange={(e) => setScheduleFormData(prev => ({ ...prev, title: e.target.value }))}
                  required
                  placeholder="e.g., Upper Body Strength Training"
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-black"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-black mb-2">
                    Date *
                  </label>
                  <input
                    type="date"
                    name="date"
                    value={scheduleFormData.date}
                    onChange={(e) => setScheduleFormData(prev => ({ ...prev, date: e.target.value }))}
                    required
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-black"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-black mb-2">
                    Time *
                  </label>
                  <input
                    type="time"
                    name="time"
                    value={scheduleFormData.time}
                    onChange={(e) => setScheduleFormData(prev => ({ ...prev, time: e.target.value }))}
                    required
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-black"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-black mb-2">
                    Duration (minutes)
                  </label>
                  <select
                    name="duration"
                    value={scheduleFormData.duration}
                    onChange={(e) => setScheduleFormData(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-black"
                  >
                    <option value={30}>30 minutes</option>
                    <option value={45}>45 minutes</option>
                    <option value={60}>60 minutes</option>
                    <option value={90}>90 minutes</option>
                    <option value={120}>120 minutes</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-black mb-2">
                  Location (optional)
                </label>
                <input
                  type="text"
                  name="location"
                  value={scheduleFormData.location}
                  onChange={(e) => setScheduleFormData(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="e.g., Main Gym, Studio A, Client's Home"
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-black"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-black mb-2">
                  Session Description
                </label>
                <textarea
                  name="description"
                  value={scheduleFormData.description}
                  onChange={(e) => setScheduleFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  placeholder="What will you work on in this session?"
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-black"
                ></textarea>
              </div>

              <div>
                <label className="block text-sm font-medium text-black mb-2">
                  Notes (optional)
                </label>
                <textarea
                  name="notes"
                  value={scheduleFormData.notes}
                  onChange={(e) => setScheduleFormData(prev => ({ ...prev, notes: e.target.value }))}
                  rows={2}
                  placeholder="Any additional notes or special instructions"
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-black"
                ></textarea>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowScheduleSession(false)}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Schedule Session
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Exercise Modal */}
      {showCreateExercise && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-black">Create New Exercise</h2>
                <button
                  onClick={() => setShowCreateExercise(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            
            <form onSubmit={handleCreateExerciseSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-black mb-2">
                    Exercise Name *
                  </label>
                  <input
                    type="text"
                    value={exerciseFormData.name}
                    onChange={(e) => setExerciseFormData(prev => ({ ...prev, name: e.target.value }))}
                    required
                    placeholder="e.g., Push-ups, Bench Press"
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-black mb-2">
                    Target Muscle *
                  </label>
                  <select
                    value={exerciseFormData.targetMuscle}
                    onChange={(e) => setExerciseFormData(prev => ({ ...prev, targetMuscle: e.target.value }))}
                    required
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                  >
                    <option value="">Select target muscle</option>
                    <option value="Chest">Chest</option>
                    <option value="Back">Back</option>
                    <option value="Shoulders">Shoulders</option>
                    <option value="Arms">Arms</option>
                    <option value="Biceps">Biceps</option>
                    <option value="Triceps">Triceps</option>
                    <option value="Legs">Legs</option>
                    <option value="Quadriceps">Quadriceps</option>
                    <option value="Hamstrings">Hamstrings</option>
                    <option value="Glutes">Glutes</option>
                    <option value="Calves">Calves</option>
                    <option value="Core">Core</option>
                    <option value="Abs">Abs</option>
                    <option value="Cardio">Cardio</option>
                    <option value="Full Body">Full Body</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-black mb-2">
                    Difficulty Level
                  </label>
                  <select
                    value={exerciseFormData.difficulty}
                    onChange={(e) => setExerciseFormData(prev => ({ ...prev, difficulty: e.target.value }))}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                  >
                    <option value="BEGINNER">Beginner</option>
                    <option value="INTERMEDIATE">Intermediate</option>
                    <option value="ADVANCED">Advanced</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-black mb-2">
                    Equipment
                  </label>
                  <select
                    value={exerciseFormData.equipment}
                    onChange={(e) => setExerciseFormData(prev => ({ ...prev, equipment: e.target.value }))}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                  >
                    <option value="BODYWEIGHT">Bodyweight</option>
                    <option value="DUMBBELLS">Dumbbells</option>
                    <option value="BARBELL">Barbell</option>
                    <option value="RESISTANCE_BANDS">Resistance Bands</option>
                    <option value="CABLE_MACHINE">Cable Machine</option>
                    <option value="CARDIO_MACHINE">Cardio Machine</option>
                    <option value="KETTLEBELL">Kettlebell</option>
                    <option value="MEDICINE_BALL">Medicine Ball</option>
                    <option value="SUSPENSION_TRAINER">Suspension Trainer</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-black mb-2">
                    Category
                  </label>
                  <select
                    value={exerciseFormData.category}
                    onChange={(e) => setExerciseFormData(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                  >
                    <option value="STRENGTH">Strength Training</option>
                    <option value="CARDIO">Cardio</option>
                    <option value="FLEXIBILITY">Flexibility</option>
                    <option value="BALANCE">Balance</option>
                    <option value="PLYOMETRIC">Plyometric</option>
                    <option value="CORE">Core</option>
                    <option value="REHABILITATION">Rehabilitation</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-black mb-2">
                  Instructions
                </label>
                <textarea
                  value={exerciseFormData.instructions}
                  onChange={(e) => setExerciseFormData(prev => ({ ...prev, instructions: e.target.value }))}
                  rows={5}
                  placeholder="Provide detailed instructions on how to perform this exercise..."
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateExercise(false)}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Create Exercise
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Exercise Modal */}
      {showEditExercise && editingExercise && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-black">Edit Exercise</h2>
                <button
                  onClick={() => {
                    setShowEditExercise(null);
                    setEditingExercise(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            
            <form onSubmit={handleUpdateExerciseSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-black mb-2">
                    Exercise Name *
                  </label>
                  <input
                    type="text"
                    value={exerciseFormData.name}
                    onChange={(e) => setExerciseFormData(prev => ({ ...prev, name: e.target.value }))}
                    required
                    placeholder="e.g., Push-ups, Bench Press"
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-black mb-2">
                    Target Muscle *
                  </label>
                  <select
                    value={exerciseFormData.targetMuscle}
                    onChange={(e) => setExerciseFormData(prev => ({ ...prev, targetMuscle: e.target.value }))}
                    required
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                  >
                    <option value="">Select target muscle</option>
                    <option value="Chest">Chest</option>
                    <option value="Back">Back</option>
                    <option value="Shoulders">Shoulders</option>
                    <option value="Arms">Arms</option>
                    <option value="Biceps">Biceps</option>
                    <option value="Triceps">Triceps</option>
                    <option value="Legs">Legs</option>
                    <option value="Quadriceps">Quadriceps</option>
                    <option value="Hamstrings">Hamstrings</option>
                    <option value="Glutes">Glutes</option>
                    <option value="Calves">Calves</option>
                    <option value="Core">Core</option>
                    <option value="Abs">Abs</option>
                    <option value="Cardio">Cardio</option>
                    <option value="Full Body">Full Body</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-black mb-2">
                    Difficulty Level
                  </label>
                  <select
                    value={exerciseFormData.difficulty}
                    onChange={(e) => setExerciseFormData(prev => ({ ...prev, difficulty: e.target.value }))}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                  >
                    <option value="BEGINNER">Beginner</option>
                    <option value="INTERMEDIATE">Intermediate</option>
                    <option value="ADVANCED">Advanced</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-black mb-2">
                    Equipment
                  </label>
                  <select
                    value={exerciseFormData.equipment}
                    onChange={(e) => setExerciseFormData(prev => ({ ...prev, equipment: e.target.value }))}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                  >
                    <option value="BODYWEIGHT">Bodyweight</option>
                    <option value="DUMBBELLS">Dumbbells</option>
                    <option value="BARBELL">Barbell</option>
                    <option value="RESISTANCE_BANDS">Resistance Bands</option>
                    <option value="CABLE_MACHINE">Cable Machine</option>
                    <option value="CARDIO_MACHINE">Cardio Machine</option>
                    <option value="KETTLEBELL">Kettlebell</option>
                    <option value="MEDICINE_BALL">Medicine Ball</option>
                    <option value="SUSPENSION_TRAINER">Suspension Trainer</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-black mb-2">
                    Category
                  </label>
                  <select
                    value={exerciseFormData.category}
                    onChange={(e) => setExerciseFormData(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                  >
                    <option value="STRENGTH">Strength Training</option>
                    <option value="CARDIO">Cardio</option>
                    <option value="FLEXIBILITY">Flexibility</option>
                    <option value="BALANCE">Balance</option>
                    <option value="PLYOMETRIC">Plyometric</option>
                    <option value="CORE">Core</option>
                    <option value="REHABILITATION">Rehabilitation</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-black mb-2">
                  Instructions
                </label>
                <textarea
                  value={exerciseFormData.instructions}
                  onChange={(e) => setExerciseFormData(prev => ({ ...prev, instructions: e.target.value }))}
                  rows={5}
                  placeholder="Provide detailed instructions on how to perform this exercise..."
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditExercise(null);
                    setEditingExercise(null);
                  }}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Update Exercise
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Exercise Confirmation Modal */}
      {showDeleteExerciseConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-black">Delete Exercise</h3>
              <button
                onClick={() => setShowDeleteExerciseConfirm(null)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <p className="text-gray-600">
                Are you sure you want to delete this exercise? This action cannot be undone and may affect existing workout templates that use this exercise.
              </p>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowDeleteExerciseConfirm(null)}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    handleDeleteExercise(showDeleteExerciseConfirm);
                    setShowDeleteExerciseConfirm(null);
                  }}
                  className="flex-1 px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                >
                  Delete Exercise
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Click outside to close menus */}
      {showClientMenu && (
        <div 
          className="fixed inset-0 z-5"
          onClick={() => setShowClientMenu(null)}
        />
      )}

      {/* Day Detail Modal */}
      {showDayModal && selectedDate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">
                {selectedDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </h3>
              <button
                onClick={() => {
                  setShowDayModal(false);
                  setSelectedDate(null);
                }}
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
                      <h4 className="text-md font-medium text-yellow-800 mb-3 flex items-center">
                        <Bell className="w-4 h-4 mr-2" />
                        Pending Approval ({pendingAppointments.length})
                      </h4>
                      <div className="space-y-3">
                        {pendingAppointments.map((appointment) => (
                          <div key={appointment.id} className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h5 className="font-medium text-gray-900">{appointment.title}</h5>
                                <p className="text-sm text-gray-600 mt-1">
                                  {appointment.client?.name} • {new Date(appointment.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({appointment.duration} min)
                                </p>
                                {appointment.description && (
                                  <p className="text-sm text-gray-700 mt-2">{appointment.description}</p>
                                )}
                              </div>
                              <div className="flex space-x-2 ml-4">
                                <button
                                  onClick={() => handleApproveAppointment(appointment.id)}
                                  className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-colors"
                                  title="Approve"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleRejectAppointment(appointment.id)}
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
                      <h4 className="text-md font-medium text-green-800 mb-3 flex items-center">
                        <Calendar className="w-4 h-4 mr-2" />
                        Confirmed Appointments ({approvedAppointments.length})
                      </h4>
                      <div className="space-y-3">
                        {approvedAppointments.map((appointment) => (
                          <div key={appointment.id} className="p-4 bg-green-50 border border-green-200 rounded-lg">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h5 className="font-medium text-gray-900">{appointment.title}</h5>
                                <p className="text-sm text-gray-600 mt-1">
                                  {appointment.client?.name} • {new Date(appointment.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({appointment.duration} min)
                                </p>
                                {appointment.description && (
                                  <p className="text-sm text-gray-700 mt-2">{appointment.description}</p>
                                )}
                                {appointment.location && (
                                  <p className="text-sm text-gray-600 mt-1">📍 {appointment.location}</p>
                                )}
                              </div>
                              <button
                                onClick={() => {
                                  // Close the day modal first
                                  setShowDayModal(false);
                                  setSelectedDate(null);
                                  // Then show the appointment details
                                  setTimeout(() => {
                                    setViewingAppointment(appointment);
                                  }, 100); // Small delay to ensure day modal closes first
                                }}
                                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
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
                      <h4 className="text-md font-medium text-red-800 mb-3 flex items-center">
                        <X className="w-4 h-4 mr-2" />
                        Cancelled Appointments ({cancelledAppointments.length})
                      </h4>
                      <div className="space-y-3">
                        {cancelledAppointments.map((appointment) => (
                          <div key={appointment.id} className="p-4 bg-red-50 border border-red-200 rounded-lg">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h5 className="font-medium text-gray-900 line-through">{appointment.title}</h5>
                                <p className="text-sm text-gray-600 mt-1">
                                  {appointment.client?.name} • {new Date(appointment.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({appointment.duration} min)
                                </p>
                                {appointment.description && (
                                  <p className="text-sm text-gray-700 mt-2">{appointment.description}</p>
                                )}
                                {appointment.location && (
                                  <p className="text-sm text-gray-600 mt-1">📍 {appointment.location}</p>
                                )}
                                {appointment.notes && (
                                  <p className="text-sm text-red-600 mt-2 italic">Cancellation reason: {appointment.notes}</p>
                                )}
                              </div>
                              <div className="text-sm text-red-600 font-medium">
                                CANCELLED
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {dayAppointments.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p>No appointments scheduled for this day</p>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};

export default TrainerDashboard;