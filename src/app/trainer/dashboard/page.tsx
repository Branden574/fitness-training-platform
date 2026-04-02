'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { useTheme } from '@/components/ThemeProvider';
import { useSettings } from '@/lib/useSettings';
import { useToast } from '@/components/Toast';
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
// OptimizedImage and imagePlaceholders moved to extracted components
import { Appointment, ContactSubmission } from '@/types';
import NotificationSystem from '@/components/NotificationSystem';
// TrainerProgressCharts and DailyProgressView are now used inside TrainerProgressTab
import TrainerOverviewTab from '@/components/trainer/TrainerOverviewTab';
import TrainerClientsTab from '@/components/trainer/TrainerClientsTab';
import TrainerContactsTab from '@/components/trainer/TrainerContactsTab';
import TrainerWorkoutsTab from '@/components/trainer/TrainerWorkoutsTab';
import TrainerExercisesTab from '@/components/trainer/TrainerExercisesTab';
import TrainerNutritionTab from '@/components/trainer/TrainerNutritionTab';
import TrainerScheduleTab from '@/components/trainer/TrainerScheduleTab';
import TrainerProgressTab from '@/components/trainer/TrainerProgressTab';
import TrainerSettingsTab from '@/components/trainer/TrainerSettingsTab';
import WorkoutModals from '@/components/trainer/modals/WorkoutModals';
import NutritionModals from '@/components/trainer/modals/NutritionModals';
import ClientModals from '@/components/trainer/modals/ClientModals';
import ScheduleModals from '@/components/trainer/modals/ScheduleModals';
import MiscModals from '@/components/trainer/modals/MiscModals';

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
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const { settings: persistedSettings, updateSetting: updatePersistedSetting, resetSettings: resetPersistedSettings, saveSettings } = useSettings();
  const [userSettings, setUserSettings] = useState({
    notifications: true,
    emailUpdates: true,
    autoApproval: false,
    theme: 'light' as string,
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
        console.error('Failed to fetch clients:', response.status, response.statusText);
        
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
      console.error('Network error fetching clients:', error);
      
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
        console.error('Invitation error:', error);
        toast(error.message || 'Failed to approve client. Please try again.', 'error');
      }
    } catch (error) {
      console.error('Failed to approve client:', error);
      toast('Error approving client. Please try again.', 'error');
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
        toast('Invitation email sent successfully!', 'success');
      } else {
        const errorData = await response.json();
        setInviteEmailSent(false);
        setInviteEmailError(errorData.error || 'Failed to send email');
        toast('Failed to send email. You can still copy the code manually.', 'error');
      }
    } catch (error) {
      console.error('Error resending email:', error);
      setInviteEmailSent(false);
      setInviteEmailError(error instanceof Error ? error.message : 'Unknown error');
      toast('Failed to send email. You can still copy the code manually.', 'error');
    } finally {
      setResendingEmail(false);
    }
  };

  // Appointment management functions
  const handleApproveAppointment = async (appointmentId: string) => {
    try {
      // Validate appointment ID
      if (!appointmentId || typeof appointmentId !== 'string' || appointmentId.length < 10) {
        console.error('Invalid appointment ID:', appointmentId);
        toast('Invalid appointment ID. Please refresh the page and try again.', 'warning');
        return;
      }

      // Check if appointment exists in current state
      const appointmentExists = appointments.find(apt => apt.id === appointmentId);
      if (!appointmentExists) {
        console.error('Appointment not found in current state:', appointmentId);
        toast('Appointment not found. Please refresh the page and try again.', 'warning');
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
        console.error('Approval failed:', error);
                const errorMessage = error.message || error.error || `Failed to approve appointment. Status: ${response.status}`;
        toast(errorMessage, 'error');
      }
    } catch (error) {
      console.error('Failed to approve appointment:', error);
      toast('Error approving appointment. Please try again.', 'error');
    }
  };

  const handleRejectAppointment = async (appointmentId: string) => {
    try {
      // Validate appointment ID
      if (!appointmentId || typeof appointmentId !== 'string' || appointmentId.length < 10) {
        console.error('Invalid appointment ID:', appointmentId);
        toast('Invalid appointment ID. Please refresh the page and try again.', 'warning');
        return;
      }

      // Check if appointment exists in current state
      const appointmentExists = appointments.find(apt => apt.id === appointmentId);
      if (!appointmentExists) {
        console.error('Appointment not found in current state:', appointmentId);
        toast('Appointment not found. Please refresh the page and try again.', 'warning');
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
        console.error('Rejection failed:', error);
        const errorMessage = error.message || error.error || `Failed to reject appointment. Status: ${response.status}`;
        toast(errorMessage, 'error');
      }
    } catch (error) {
      console.error('Failed to reject appointment:', error);
      toast('Error rejecting appointment. Please try again.', 'error');
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
        body: JSON.stringify({ clientId })
      });

      if (response.ok) {
        const result = await response.json();
        toast(`Password reset successful! Temporary password: ${result.tempPassword}\n\nShare this securely with the client. They will be required to change it on next login.`, 'info');
        setShowPasswordResetModal(null);
        setNewPassword('');
        setShowClientMenu(null);
      } else {
        const error = await response.json();
        toast(`Failed to reset password: ${error.message}`, 'info');
      }
    } catch (error) {
      console.error('Failed to reset client password:', error);
      toast('Error resetting password. Please try again.', 'success');
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
            console.error(`Failed to fetch data for ${dateString}, status:`, response.status);
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
        toast('Client created successfully! They will receive login instructions via email.', 'success');
      } else {
        const error = await response.json();
        toast(error.message || 'Failed to create client. Please try again.', 'error');
      }
    } catch (error) {
      console.error('Error creating client:', error);
      toast('Error creating client. Please try again.', 'error');
    }
  };

  const handleCreateWorkoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (workoutFormData.exercises.length === 0) {
      toast('Please add at least one exercise to the workout', 'warning');
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
        toast('Workout template created successfully!', 'success');
      } else {
        const error = await response.json();
        toast(error.message || 'Failed to create workout template. Please try again.', 'error');
      }
    } catch (error) {
      console.error('Error creating workout template:', error);
      toast('Error creating workout template. Please try again.', 'error');
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
      toast('Please add at least one exercise to the workout', 'warning');
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
        toast('Workout template updated successfully!', 'success');
      } else {
        const error = await response.json();
        toast(error.message || 'Failed to update workout template. Please try again.', 'error');
      }
    } catch (error) {
      console.error('Error updating workout template:', error);
      toast('Error updating workout template. Please try again.', 'error');
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
        toast('Workout template deleted successfully!', 'success');
      } else {
        const error = await response.json();
        toast(error.message || 'Failed to delete workout template. Please try again.', 'error');
      }
    } catch (error) {
      console.error('Error deleting workout template:', error);
      toast('Error deleting workout template. Please try again.', 'error');
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
        toast('Workout assigned to client successfully!', 'success');
      } else {
        const error = await response.json();
        toast(error.message || 'Failed to assign workout. Please try again.', 'error');
      }
    } catch (error) {
      console.error('Error assigning workout:', error);
      toast('Error assigning workout. Please try again.', 'error');
    }
  };

  const handleCreateNutritionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!nutritionFormData.name.trim()) {
      toast('Please enter a nutrition plan name', 'warning');
      return;
    }

    // Validate client assignment if enabled
    if (nutritionFormData.assignToClient && !nutritionFormData.clientId) {
      toast('Please select a client to assign this plan to', 'warning');
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
        toast(nutritionFormData.assignToClient
          ? 'Nutrition plan created and assigned!'
          : 'Nutrition plan created!', 'success');
      } else {
        const error = await response.json();
        toast(error.message || 'Failed to create nutrition plan. Please try again.', 'error');
      }
    } catch (error) {
      console.error('Error creating nutrition plan:', error);
      toast('Error creating nutrition plan. Please try again.', 'error');
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
        toast('Nutrition plan deleted successfully!', 'success');
      } else {
        const error = await response.json();
        toast(error.message || 'Failed to delete nutrition plan. Please try again.', 'error');
      }
    } catch (error) {
      console.error('Error deleting nutrition plan:', error);
      toast('Error deleting nutrition plan. Please try again.', 'error');
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
        toast('Nutrition plan assigned successfully!', 'success');
      } else {
        const error = await response.json();
        toast(error.message || 'Failed to assign nutrition plan. Please try again.', 'error');
      }
    } catch (error) {
      console.error('Error assigning nutrition plan:', error);
      toast('Error assigning nutrition plan. Please try again.', 'error');
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
        toast('Nutrition plan updated successfully!', 'success');
      } else {
        const error = await response.json();
        toast(error.message || 'Failed to update nutrition plan. Please try again.', 'error');
      }
    } catch (error) {
      console.error('Error updating nutrition plan:', error);
      toast('Error updating nutrition plan. Please try again.', 'error');
    }
  };

  const handleScheduleSessionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!scheduleFormData.clientId || !scheduleFormData.title || !scheduleFormData.date || !scheduleFormData.time) {
      toast('Please fill in all required fields', 'warning');
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
        toast('Session scheduled and pending your approval!', 'success');
      } else {
        const error = await response.json();
        console.error('Schedule session error:', error);
        console.error('Response status:', response.status);
        toast(error.message || 'Failed to schedule session', 'error');
      }
    } catch (error) {
      console.error('Network error scheduling session:', error);
      toast('Network error. Please check your connection and try again.', 'error');
    }
  };

  // Exercise Management Functions
  const handleCreateExercise = () => {
    setShowCreateExercise(true);
  };

  const handleCreateExerciseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!exerciseFormData.name.trim() || !exerciseFormData.targetMuscle.trim()) {
      toast('Please fill in the exercise name and target muscle', 'warning');
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
        toast('Exercise created successfully!', 'success');
      } else {
        const error = await response.json();
        toast(error.message || 'Failed to create exercise. Please try again.', 'error');
      }
    } catch (error) {
      console.error('Error creating exercise:', error);
      toast('Error creating exercise. Please try again.', 'error');
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
      toast('Please fill in the exercise name and target muscle', 'warning');
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
        toast('Exercise updated successfully!', 'success');
      } else {
        const error = await response.json();
        toast(error.message || 'Failed to update exercise. Please try again.', 'error');
      }
    } catch (error) {
      console.error('Error updating exercise:', error);
      toast('Error updating exercise. Please try again.', 'error');
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
        toast('Exercise deleted successfully!', 'success');
      } else {
        const error = await response.json();
        toast(error.message || 'Failed to delete exercise. Please try again.', 'error');
      }
    } catch (error) {
      console.error('Error deleting exercise:', error);
      toast('Error deleting exercise. Please try again.', 'error');
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
          console.error('Error initializing dashboard data:', error);
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

  // Sync persisted settings on load
  useEffect(() => {
    setUserSettings(prev => ({
      ...prev,
      notifications: persistedSettings.notifications,
      emailUpdates: persistedSettings.emailUpdates,
      theme: persistedSettings.theme,
      units: persistedSettings.units,
    }));
  }, [persistedSettings]);

  const updateTrainerSetting = (key: string, value: string | boolean) => {
    setUserSettings((prev) => ({ ...prev, [key]: value }));
    if (key === 'theme') {
      const t = value as 'light' | 'dark' | 'auto';
      setTheme(t);
      updatePersistedSetting('theme', t);
    } else if (key === 'notifications' || key === 'emailUpdates' || key === 'units') {
      updatePersistedSetting(key as keyof typeof persistedSettings, value as never);
    }
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
    resetPersistedSettings();
    setTheme('light');
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
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
                className="p-2 text-gray-400 hover:text-indigo-600 transition-colors duration-200 mr-2"
                title="Go to Homepage"
              >
                <Home className="w-5 h-5" />
              </motion.button>
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center mr-3">
                <Dumbbell className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
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
                <div className="w-12 h-12 mr-4 rounded-full bg-indigo-600 flex items-center justify-center overflow-hidden ring-2 ring-indigo-500/20 flex-shrink-0">
                  {session?.user?.image ? (
                    <img src={session.user.image} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xl font-bold text-white">
                      {(session?.user?.name || 'B').charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white truncate">
                    {session?.user?.name || 'Trainer'}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Certified Personal Trainer</p>
                </div>
              </div>
              
              <nav className="space-y-1">
                {menuItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                      activeTab === item.id
                        ? 'bg-indigo-100 text-blue-700 border-r-2 border-blue-700'
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
              <TrainerOverviewTab
                clients={clients}
                stats={stats}
                loading={loading}
                onTabChange={setActiveTab}
                onViewClient={(clientId: string) => handleViewClientDetails(clientId)}
              />
            )}

            {/* Clients Tab */}
            {activeTab === 'clients' && (
              <TrainerClientsTab
                clients={clients}
                clientSearchTerm={clientSearchTerm}
                onSearchChange={setClientSearchTerm}
                onViewClient={(clientId: string) => handleViewClientDetails(clientId)}
                onShowMenu={(clientId: string | null) => setShowClientMenu(clientId)}
                showClientMenu={showClientMenu}
                onRemoveClient={(clientId: string) => { setShowRemoveConfirm(clientId); setRemoveAction('remove'); }}
                onShowRemoveConfirm={(clientId: string | null) => setShowRemoveConfirm(clientId)}
                showRemoveConfirm={showRemoveConfirm}
                removeAction={removeAction}
                onSetRemoveAction={setRemoveAction}
                onConfirmRemove={(clientId: string) => handleRemoveClient(clientId, removeAction)}
                onShowAddClient={() => setShowAddClient(true)}
                onShowAssignWorkout={(clientId: string) => setShowAssignWorkoutModal(clientId)}
                onResetPassword={(clientId: string) => setShowPasswordResetModal(clientId)}
                onShowInvitationCode={(email: string) => { setShowInvitationCode(email); handleGenerateInvitation(email); }}
              />
            )}

            {/* Contact Submissions Tab */}
            {activeTab === 'contacts' && (
              <TrainerContactsTab
                contactSubmissions={contactSubmissions}
                onViewSubmission={setViewingSubmission}
                onShowInvitationCode={(email: string) => { setShowInvitationCode(email); handleGenerateInvitation(email); }}
                onApproveClient={(email: string) => handleApproveClient(email)}
                onUpdateStatus={(id: string, status: string) => updateSubmissionStatus(id, status)}
              />
            )}

            {/* Workouts Tab */}
            {activeTab === 'workouts' && (
              <TrainerWorkoutsTab
                workoutTemplates={workoutTemplates}
                assignedWorkouts={assignedWorkouts}
                onCreateWorkout={() => setShowCreateWorkout(true)}
                onEditWorkout={(workoutId: string) => {
                  const wt = workoutTemplates.find(w => w.id === workoutId);
                  if (wt) { setEditingWorkout(wt); setShowEditWorkout(workoutId); }
                }}
                onDeleteWorkout={handleDeleteWorkout}
                onAssignWorkout={(workoutId: string) => setShowAssignWorkoutModal(workoutId)}
                onRemoveAssignment={handleRemoveAssignment}
              />
            )}

            {/* Exercises Tab */}
            {activeTab === 'exercises' && (
              <TrainerExercisesTab
                availableExercises={availableExercises}
                exerciseFilter={exerciseFilter}
                onFilterChange={setExerciseFilter}
                exerciseSearchTerm={exerciseSearchTerm}
                onSearchChange={setExerciseSearchTerm}
                onCreateExercise={() => setShowCreateExercise(true)}
                onEditExercise={(exerciseId: string) => {
                  const ex = availableExercises.find(e => e.id === exerciseId);
                  if (ex) { setEditingExercise(ex); setShowEditExercise(exerciseId); }
                }}
                onDeleteExercise={(exerciseId: string) => setShowDeleteExerciseConfirm(exerciseId)}
              />
            )}

            {/* Nutrition Tab */}
            {activeTab === 'nutrition' && (
              <TrainerNutritionTab
                nutritionPlans={nutritionPlans}
                clients={clients}
                onCreatePlan={() => setShowCreateNutrition(true)}
                onEditPlan={(planId: string) => {
                  const plan = nutritionPlans.find(p => p.id === planId);
                  if (plan) { setEditingNutrition(plan); setShowEditNutrition(planId); }
                }}
                onDeletePlan={(planId: string) => setShowDeleteNutritionConfirm(planId)}
                onAssignPlan={(planId: string) => setShowAssignNutrition(planId)}
              />
            )}

            {/* Schedule Tab */}
            {activeTab === 'schedule' && (
              <TrainerScheduleTab
                appointments={appointments}
                clients={clients}
                currentMonth={currentMonth}
                selectedDate={selectedDate}
                showDayModal={showDayModal}
                onMonthChange={setCurrentMonth}
                onDateSelect={setSelectedDate}
                onShowDayModal={setShowDayModal}
                onScheduleSession={() => setShowScheduleSession(true)}
                onApproveAppointment={handleApproveAppointment}
                onRejectAppointment={handleRejectAppointment}
              />
            )}

            {/* Client Progress Tab */}
            {activeTab === 'progress' && (
              <TrainerProgressTab
                clients={clients}
                clientsProgress={clientsProgress}
                selectedClientProgress={selectedClientProgress}
                onSelectClient={setSelectedClientProgress}
                trainerProgressView={trainerProgressView}
                onViewChange={setTrainerProgressView}
                selectedClientData={selectedClientData}
                selectedFoodEntryDate={selectedFoodEntryDate}
                onFoodDateChange={setSelectedFoodEntryDate}
                selectedWorkoutProgressDate={selectedWorkoutProgressDate}
                onWorkoutDateChange={setSelectedWorkoutProgressDate}
                onRefreshClient={(clientId: string) => fetchClientProgress(clientId)}
                onViewClientDetails={(clientId: string) => handleViewClientDetails(clientId)}
              />
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
              <TrainerSettingsTab
                session={session}
                theme={theme}
                userSettings={userSettings}
                onUpdateSetting={(key: string, value: any) => {
                  if (key === 'theme') {
                    setTheme(value);
                  }
                  setUserSettings(prev => ({ ...prev, [key]: value }));
                }}
                onResetSettings={() => {
                  setUserSettings({ notifications: true, emailUpdates: true, autoApproval: false, theme: 'light', units: 'imperial', clientVisibility: 'all' });
                  setTheme('light');
                }}
                onSaveSettings={saveSettings}
              />
            )}
          </div>
        </div>
      </div>


      {/* ── Modals ── */}
      <MiscModals
        viewingAppointment={viewingAppointment}
        onCloseViewingAppointment={() => setViewingAppointment(null)}
        onApproveAppointment={handleApproveAppointment}
        onRejectAppointment={handleRejectAppointment}
        showRemoveConfirm={showRemoveConfirm}
        removeAction={removeAction}
        onRemoveActionChange={setRemoveAction}
        onRemoveClient={(clientId) => handleRemoveClient(clientId, removeAction)}
        onCloseRemoveConfirm={() => setShowRemoveConfirm(null)}
        clients={clients}
        showPasswordResetModal={showPasswordResetModal}
        newPassword={newPassword}
        onPasswordChange={setNewPassword}
        onResetClientPassword={handleResetClientPassword}
        onClosePasswordResetModal={() => { setShowPasswordResetModal(null); setNewPassword(''); }}
        showDayModal={showDayModal}
        selectedDate={selectedDate}
        appointments={appointments}
        onCloseDayModal={() => setShowDayModal(false)}
        onViewAppointmentFromDay={setViewingAppointment}
      />

      <WorkoutModals
        showCreateWorkout={showCreateWorkout}
        onCloseCreate={() => setShowCreateWorkout(false)}
        showEditWorkout={showEditWorkout}
        editingWorkout={editingWorkout}
        onCloseEdit={() => { setShowEditWorkout(null); setEditingWorkout(null); }}
        showAssignWorkoutModal={showAssignWorkoutModal}
        onCloseAssign={() => setShowAssignWorkoutModal(null)}
        workoutFormData={workoutFormData}
        onFormChange={setWorkoutFormData}
        availableExercises={availableExercises}
        exerciseSearchTerm={exerciseSearchTerm}
        onExerciseSearchChange={setExerciseSearchTerm}
        clients={clients}
        onAddExercise={(exerciseId) => {
          const exercise = availableExercises.find(e => e.id === exerciseId);
          if (exercise && !workoutFormData.exercises.find(e => e.exerciseId === exerciseId)) {
            setWorkoutFormData(prev => ({
              ...prev,
              exercises: [...prev.exercises, { exerciseId, sets: exercise.sets || 3, reps: exercise.reps ? parseInt(String(exercise.reps)) : 10, weight: exercise.weight, duration: exercise.duration, restTime: exercise.restTime || 60, notes: '', order: prev.exercises.length + 1 }]
            }));
          }
        }}
        onRemoveExercise={(exerciseId) => {
          setWorkoutFormData(prev => ({ ...prev, exercises: prev.exercises.filter(e => e.exerciseId !== exerciseId) }));
        }}
        onUpdateExercise={(exerciseId, field, value) => {
          setWorkoutFormData(prev => ({
            ...prev,
            exercises: prev.exercises.map(e => e.exerciseId === exerciseId ? { ...e, [field]: value } : e)
          }));
        }}
        onCreateSubmit={handleCreateWorkout}
        onEditSubmit={handleEditWorkout}
        onAssignToClient={(clientId, workoutId) => handleAssignWorkout(clientId, workoutId)}
      />

      <NutritionModals
        showCreateNutrition={showCreateNutrition}
        onCloseCreateNutrition={() => setShowCreateNutrition(false)}
        nutritionFormData={nutritionFormData}
        onNutritionFormDataChange={setNutritionFormData}
        clients={clients}
        onCreateNutritionSubmit={handleCreateNutrition}
        showAssignNutrition={showAssignNutrition}
        nutritionPlans={nutritionPlans}
        onCloseAssignNutrition={() => setShowAssignNutrition(null)}
        onAssignNutritionToClient={(clientId, planId) => handleAssignNutrition(clientId, planId)}
        showEditNutrition={showEditNutrition}
        editingNutrition={editingNutrition}
        onCloseEditNutrition={() => { setShowEditNutrition(null); setEditingNutrition(null); }}
        onEditNutritionChange={(field, value) => {
          if (editingNutrition) setEditingNutrition({ ...editingNutrition, [field]: value });
        }}
        onEditNutritionSubmit={handleEditNutrition}
        showDeleteNutritionConfirm={showDeleteNutritionConfirm}
        onCloseDeleteNutritionConfirm={() => setShowDeleteNutritionConfirm(null)}
        onDeleteNutritionPlan={handleDeleteNutrition}
      />

      <ClientModals
        showInvitationCode={showInvitationCode}
        generatedCode={generatedCode}
        inviteEmailSent={inviteEmailSent}
        inviteEmailError={inviteEmailError}
        resendingEmail={resendingEmail}
        onCloseInvitationCode={() => { setShowInvitationCode(null); setGeneratedCode(''); setInviteEmailSent(false); setInviteEmailError(null); }}
        onSendInviteEmail={handleSendInviteEmail}
        onResendInviteEmail={handleResendInviteEmail}
        viewingSubmission={viewingSubmission}
        onCloseViewingSubmission={() => setViewingSubmission(null)}
        onApproveClient={handleApproveClient}
        onUpdateSubmissionStatus={updateSubmissionStatus}
        showClientDetails={showClientDetails}
        selectedClientData={selectedClientData}
        loadingClientDetails={loadingClientDetails}
        selectedFoodEntryDate={selectedFoodEntryDate}
        onFoodEntryDateChange={setSelectedFoodEntryDate}
        selectedWorkoutProgressDate={selectedWorkoutProgressDate}
        onWorkoutProgressDateChange={setSelectedWorkoutProgressDate}
        onCloseClientDetails={() => { setShowClientDetails(null); setSelectedClientData(null); }}
        onAssignWorkout={(clientId) => setShowAssignWorkoutModal(clientId)}
        onCreateNutritionForClient={(clientId) => { setNutritionFormData(prev => ({ ...prev, clientId, assignToClient: true })); setShowCreateNutrition(true); }}
        onRemoveClient={(clientId) => { setShowRemoveConfirm(clientId); setRemoveAction('remove'); }}
        showAssignWorkout={showAssignWorkout}
        onCloseAssignWorkout={() => setShowAssignWorkout(null)}
        onAssignWorkoutToClient={handleAssignWorkout}
        workoutTemplates={workoutTemplates}
        showAddClient={showAddClient}
        onCloseAddClient={() => setShowAddClient(false)}
        onAddClient={handleAddClient}
      />

      <ScheduleModals
        showScheduleSession={showScheduleSession}
        onCloseScheduleSession={() => setShowScheduleSession(false)}
        scheduleFormData={scheduleFormData}
        onScheduleFormChange={setScheduleFormData}
        clients={clients}
        onScheduleSubmit={handleScheduleSession}
        showCreateExercise={showCreateExercise}
        onCloseCreateExercise={() => setShowCreateExercise(false)}
        exerciseFormData={exerciseFormData}
        onExerciseFormChange={setExerciseFormData}
        onCreateExerciseSubmit={handleCreateExercise}
        showEditExercise={showEditExercise}
        editingExercise={editingExercise}
        onCloseEditExercise={() => { setShowEditExercise(null); setEditingExercise(null); }}
        onUpdateExerciseSubmit={handleEditExercise}
        showDeleteExerciseConfirm={showDeleteExerciseConfirm}
        onCloseDeleteExerciseConfirm={() => setShowDeleteExerciseConfirm(null)}
        onDeleteExercise={handleDeleteExercise}
      />

    </div>
  );
};

export default TrainerDashboard;