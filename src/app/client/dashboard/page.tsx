"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { useTheme } from "@/components/ThemeProvider";
import { useSettings } from "@/lib/useSettings";
import { useToast } from "@/components/Toast";
import { motion } from "framer-motion";
import {
  Calendar,
  Activity,
  TrendingUp,
  Settings,
  LogOut,
  Dumbbell,
  Apple,
  Target,
  Home,
  X,
  MessageCircle,
} from "lucide-react";
import NotificationSystem from "@/components/NotificationSystem";
import LogProgressModal from "@/components/LogProgressModal";
import FoodEntryModal from "@/components/FoodEntryModal";
import ChatPanel from "@/components/ChatPanel";
import OverviewTab from "@/components/dashboard/OverviewTab";
import WorkoutsTab from "@/components/dashboard/WorkoutsTab";
import NutritionTab from "@/components/dashboard/NutritionTab";
import ProgressTab from "@/components/dashboard/ProgressTab";
import ScheduleTab from "@/components/dashboard/ScheduleTab";
import SettingsTab from "@/components/dashboard/SettingsTab";
import { Appointment } from "@/types";

// Simple loading spinner component
const LoadingSpinner = ({ size = "md" }: { size?: "sm" | "md" | "lg" }) => {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  };

  return (
    <div
      className={`animate-spin rounded-full border-2 border-gray-300 border-t-blue-600 ${sizeClasses[size]}`}
    ></div>
  );
};

interface WorkoutAnalytics {
  strongestExercise: {
    name: string;
    weight: number;
    formatted: string;
  } | null;
  mostImproved: {
    exerciseName: string;
    percentage: number;
    formatted: string;
  } | null;
  weeklyFrequency: {
    value: number;
    formatted: string;
  };
  totalProgress: number;
  totalWorkouts: number;
}

interface ProgressEntry {
  id: string;
  date: string;
  weight?: number;
  bodyFat?: number;
  muscleMass?: number;
  mood?: number;
  energy?: number;
  notes?: string;
  createdAt: string;
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
    averageEnergy: number | null;
    averageSleep: number | null;
  };
  summary: {
    consistency: {
      streak: number;
      entriesPerWeek: number;
    };
    dateRange: {
      daysCovered: number;
      start?: string;
      end?: string;
    };
    totalEntries?: number;
  };
  avgWeight?: number;
  weightChange?: number;
  totalEntries: number;
}

interface Workout {
  id: string;
  title: string;
  description?: string;
  duration?: string;
  difficulty?: string;
  exercises?: Exercise[];
  completed?: boolean;
  startTime?: string;
  endTime?: string;
  rating?: number;
  notes?: string;
  workout?: {
    id: string;
    title: string;
    description?: string;
    duration?: string;
    difficulty?: string;
    exercises?: Exercise[];
  };
}

interface Exercise {
  id: string;
  name: string;
  description?: string;
  sets?: number;
  reps?: number;
  duration?: number;
  restTime?: number;
  weight?: number;
  exercise?: {
    id: string;
    name: string;
    description?: string;
  };
}

interface NutritionPlan {
  id: string;
  name: string;
  description?: string;
  calories?: number;
  meals?: Meal[];
  dailyCalorieTarget?: number;
  dailyProteinTarget?: number;
  dailyCarbTarget?: number;
  dailyFatTarget?: number;
  startDate?: string;
  endDate?: string;
}

interface Meal {
  id: string;
  name: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
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
  mealType: "BREAKFAST" | "LUNCH" | "DINNER" | "SNACK";
  date: string;
  notes?: string;
  createdAt: string;
}

interface TrainerInfo {
  id: string;
  name: string;
  email: string;
}

const ClientDashboard = () => {
  const { data: session } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("overview");
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [workoutAnalytics, setWorkoutAnalytics] = useState<WorkoutAnalytics | null>(null);
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const { settings: userSettings, updateSetting: updateSettingValue, resetSettings: resetSettingsValues, saveSettings } = useSettings();
  const [nutritionPlans, setNutritionPlans] = useState<NutritionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLogProgressModal, setShowLogProgressModal] = useState(false);
  const [trainerInfo, setTrainerInfo] = useState<TrainerInfo | null>(null);

  // Progress form state
  const [progressFormData, setProgressFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    weight: "",
    bodyFat: "",
    muscleMass: "",
    mood: "",
    energy: "",
    sleep: "",
    notes: "",
  });
  const [progressLoading, setProgressLoading] = useState(false);
  const [progressData, setProgressData] = useState<{
    entries: ProgressEntry[];
    analytics: ProgressAnalytics;
    total: number;
  } | null>(null);

  // Appointment states
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState<string | null>(
    null,
  );
  const [showCancelModal, setShowCancelModal] = useState<string | null>(null);
  const [rescheduleFormData, setRescheduleFormData] = useState({
    date: "",
    time: "",
    reason: "",
  });
  const [cancelReason, setCancelReason] = useState("");

  // Food logging states
  const [foodEntries, setFoodEntries] = useState<FoodEntry[]>([]);
  const [showFoodEntryModal, setShowFoodEntryModal] = useState(false);
  const [showEndPlanModal, setShowEndPlanModal] = useState<string | null>(null);
  const [endPlanReason, setEndPlanReason] = useState("");

  // Workout logging states
  const [showWorkoutLogModal, setShowWorkoutLogModal] =
    useState<Workout | null>(null);
  const [workoutLogData, setWorkoutLogData] = useState<{
    [exerciseId: string]: { weight: number; reps: number; sets: number };
  }>({});
  const [workoutLogDate, setWorkoutLogDate] = useState(() => {
    // Default to today's date for workout logging
    const today = new Date();
    const year = today.getFullYear();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  const [foodEntryForm, setFoodEntryForm] = useState({
    foodName: "",
    quantity: "",
    unit: "grams",
    calories: "",
    protein: "",
    carbs: "",
    fat: "",
    mealType: "BREAKFAST",
    notes: "",
  });
  const [selectedDate, setSelectedDate] = useState(() => {
    // Use local date instead of UTC to avoid timezone offset issues
    const today = new Date();
    const year = today.getFullYear();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  });

  // Handler functions
  const handleSignOut = () => {
    signOut({ callbackUrl: "/" });
  };

  const updateSetting = (key: string, value: string | boolean) => {
    if (key === 'theme') {
      const t = value as 'light' | 'dark' | 'auto';
      setTheme(t);
      updateSettingValue('theme', t);
    } else {
      updateSettingValue(key as keyof typeof userSettings, value as never);
    }
  };

  const resetSettings = () => {
    resetSettingsValues();
    setTheme('light');
  };

  const handleGoHome = () => {
    router.push("/");
  };

  const fetchTrainerInfo = async () => {
    try {
      const response = await fetch("/api/profile");
      if (response.ok) {
        const profileData = await response.json();
        setTrainerInfo(profileData.trainer);
      }
    } catch (error) {
      console.error("Client - Error fetching trainer info:", error);
    }
  };

  const handleProgressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProgressLoading(true);

    try {
      const progressData = {
        date: progressFormData.date,
        weight: progressFormData.weight
          ? parseFloat(progressFormData.weight)
          : undefined,
        bodyFat: progressFormData.bodyFat
          ? parseFloat(progressFormData.bodyFat)
          : undefined,
        muscleMass: progressFormData.muscleMass
          ? parseFloat(progressFormData.muscleMass)
          : undefined,
        mood: progressFormData.mood
          ? parseInt(progressFormData.mood)
          : undefined,
        energy: progressFormData.energy
          ? parseInt(progressFormData.energy)
          : undefined,
        sleep: progressFormData.sleep
          ? parseFloat(progressFormData.sleep)
          : undefined,
        notes: progressFormData.notes || undefined,
      };

      const response = await fetch("/api/progress", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(progressData),
      });

      if (response.ok) {
        const newEntry = await response.json();

        // Reset form
        setProgressFormData({
          date: new Date().toISOString().split("T")[0],
          weight: "",
          bodyFat: "",
          muscleMass: "",
          mood: "",
          energy: "",
          sleep: "",
          notes: "",
        });

        // Close modal
        setShowLogProgressModal(false);

        // Refresh progress data
        fetchProgress();

        toast("Progress logged successfully!", "success");
      } else {
        const error = await response.json();
        if (response.status === 409) {
          toast("Something went wrong", "error")
        } else {
          toast(error.message || "Something went wrong", "error");
        }
      }
    } catch (error) {
      console.error("Error logging progress:", error);
      toast("Something went wrong", "error")
    } finally {
      setProgressLoading(false);
    }
  };

  // New progress submit handler for the new modal
  const handleNewProgressSubmit = async (data: {
    date: string;
    weight: string;
    bodyFat: string;
    muscleMass: string;
    mood: string;
    energy: string;
    sleep: string;
    notes: string;
  }) => {
    setProgressLoading(true);

    try {
      const progressData = {
        date: data.date,
        weight: data.weight ? parseFloat(data.weight) : undefined,
        bodyFat: data.bodyFat ? parseFloat(data.bodyFat) : undefined,
        muscleMass: data.muscleMass ? parseFloat(data.muscleMass) : undefined,
        mood: data.mood ? parseInt(data.mood) : undefined,
        energy: data.energy ? parseInt(data.energy) : undefined,
        sleep: data.sleep ? parseFloat(data.sleep) : undefined,
        notes: data.notes || undefined,
      };

      const response = await fetch("/api/progress", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(progressData),
      });

      if (response.ok) {
        const newEntry = await response.json();

        // Close modal
        setShowLogProgressModal(false);

        // Refresh progress data
        fetchProgress();

        toast("Progress logged successfully!", "success");
      } else {
        const error = await response.json();
        if (response.status === 409) {
          toast("Something went wrong", "error")
        } else {
          toast(error.message || "Something went wrong", "error");
        }
      }
    } catch (error) {
      console.error("Error logging progress:", error);
      toast("Something went wrong", "error")
    } finally {
      setProgressLoading(false);
    }
  };

  // Appointment management handlers
  const handleRescheduleAppointment = async (appointmentId: string) => {
    try {
      const rescheduleData = {
        appointmentId,
        newDate: rescheduleFormData.date,
        newTime: rescheduleFormData.time,
        reason: rescheduleFormData.reason,
        action: "RESCHEDULE_REQUEST",
      };

      const response = await fetch("/api/appointments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rescheduleData),
      });

      if (response.ok) {
        toast("Reschedule request sent to your trainer!", "success");
        setShowRescheduleModal(null);
        setRescheduleFormData({ date: "", time: "", reason: "" });
        fetchAppointments(); // Refresh appointments
      } else {
        const error = await response.json();
        toast(error.message || "Something went wrong", "error");
      }
    } catch (error) {
      console.error("Error requesting reschedule:", error);
      toast("Error sending reschedule request", "error");
    }
  };

  const handleCancelAppointment = async (appointmentId: string) => {
    try {
      const cancelData = {
        appointmentId,
        status: "CANCELLED",
        cancelReason,
      };

      const response = await fetch("/api/appointments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cancelData),
      });

      if (response.ok) {
        toast("Appointment cancelled", "success");
        setShowCancelModal(null);
        setCancelReason("");
        fetchAppointments(); // Refresh appointments
      } else {
        const error = await response.json();
        toast(error.message || "Something went wrong", "error");
      }
    } catch (error) {
      console.error("Error cancelling appointment:", error);
      toast("Error cancelling appointment", "error");
    }
  };

  const fetchAppointments = async () => {
    try {
      const response = await fetch("/api/appointments");
      if (response.ok) {
        const data = await response.json();
        setAppointments(data);
      }
    } catch (error) {
      console.error("Error fetching appointments:", error);
    }
  };

  const fetchFoodEntries = useCallback(
    async (date: string = selectedDate) => {
      try {
        const response = await fetch(`/api/food-entries?date=${date}`);
        if (response.ok) {
          const data = await response.json();
          setFoodEntries(data.entries || []);
          // Don't set dailyTotals here - we calculate them from entries in useMemo
        } else {
          console.error("Failed to fetch food entries, status:", response.status);
        }
      } catch (error) {
        console.error("Failed to fetch food entries:", error);
      }
    },
    [selectedDate, session?.user?.email],
  );

  // Calculate selected date's totals directly from food entries
  const selectedDateTotals = useMemo(() => {
    // Filter entries for the selected date
    const selectedDateEntries = foodEntries.filter(entry => {
      const entryDateString = new Date(entry.date).toISOString().split("T")[0];
      const matches = entryDateString === selectedDate;
      return matches;
    });
    
    const totals = selectedDateEntries.reduce((totals, entry) => ({
      calories: totals.calories + entry.calories,
      protein: totals.protein + entry.protein,
      carbs: totals.carbs + entry.carbs,
      fat: totals.fat + entry.fat,
    }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
    
    return totals;
  }, [foodEntries, selectedDate]);

  // Redirect trainers to their dashboard
  useEffect(() => {
    if (session?.user?.role === "TRAINER") {
      router.replace("/trainer/dashboard");
    }
    // Redirect users who need to change their password
    if (session?.user?.passwordChangeRequired) {
      router.replace("/auth/change-password");
    }
  }, [session, router]);

  useEffect(() => {
    if (session?.user) {
      fetchWorkouts();
      fetchWorkoutAnalytics();
      fetchProgress();
      fetchNutritionPlans();
      fetchTrainerInfo();
      fetchAppointments();
      fetchFoodEntries();
      setLoading(false);
    }
  }, [session, fetchFoodEntries]);

  // Update food entries when selected date changes
  useEffect(() => {
    if (session?.user) {
      setFoodEntries([]); // Clear entries immediately when date changes
      fetchFoodEntries(selectedDate);
    }
  }, [selectedDate, session, fetchFoodEntries]);

  // Real-time updates for schedule tab
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (activeTab === "schedule") {
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

  const fetchWorkouts = async () => {
    try {
      const response = await fetch("/api/workouts");
      if (response.ok) {
        const data = await response.json();
        setWorkouts(data);
      }
    } catch (error) {
      console.error("Failed to fetch workouts:", error);
    }
  };

  const fetchWorkoutAnalytics = async () => {
    try {
      const response = await fetch("/api/workout-analytics");
      if (response.ok) {
        const data = await response.json();
        setWorkoutAnalytics(data);
      }
    } catch (error) {
      console.error("Failed to fetch workout analytics:", error);
    }
  };

  const fetchProgress = async () => {
    try {
      const response = await fetch("/api/progress?limit=30");
      if (response.ok) {
        const data = await response.json();
        setProgressData(data);
      } else {
        console.error("Failed to fetch progress data");
      }
    } catch (error) {
      console.error("Failed to fetch progress:", error);
    }
  };

  const fetchNutritionPlans = async () => {
    try {
      const response = await fetch("/api/nutrition");
      if (response.ok) {
        const data = await response.json();
        setNutritionPlans(data);
      }
    } catch (error) {
      console.error("Failed to fetch nutrition plans:", error);
    }
  };

  // Food logging functions
  const handleFoodEntrySubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Validate required fields
      if (!foodEntryForm.foodName || !foodEntryForm.quantity || !foodEntryForm.calories) {
        toast("Please fill in all required fields", "warning");
        return;
      }

      const entryData = {
        foodName: foodEntryForm.foodName,
        quantity: parseFloat(foodEntryForm.quantity),
        unit: foodEntryForm.unit,
        calories: parseInt(foodEntryForm.calories),
        protein: parseFloat(foodEntryForm.protein) || 0,
        carbs: parseFloat(foodEntryForm.carbs) || 0,
        fat: parseFloat(foodEntryForm.fat) || 0,
        mealType: foodEntryForm.mealType,
        date: selectedDate,
        notes: foodEntryForm.notes || undefined,
      };

      const response = await fetch("/api/food-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entryData),
      });

      if (response.ok) {
        // Reset form
        setFoodEntryForm({
          foodName: "",
          quantity: "",
          unit: "grams",
          calories: "",
          protein: "",
          carbs: "",
          fat: "",
          mealType: "BREAKFAST",
          notes: "",
        });

        // Close modal and refresh data
        setShowFoodEntryModal(false);
        fetchFoodEntries(selectedDate);

        toast("Food entry logged!", "success");
      } else {
        const errorText = await response.text();
        console.error("Server error response:", errorText);
        
        try {
          const error = JSON.parse(errorText);
          toast(error.message || "Something went wrong", "error");
        } catch {
          toast('Failed to log food entry', 'error');
        }
      }
    } catch (error) {
      console.error("Error logging food entry:", error);
      toast("Error logging food entry", "error");
    }
  };

  const handleEndPlan = async (planId: string) => {
    try {
      const response = await fetch("/api/nutrition/end", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId,
          reason: endPlanReason || "No reason provided",
        }),
      });

      if (response.ok) {
        // Refresh nutrition plans
        fetchNutritionPlans();
        // Close modal and reset form
        setShowEndPlanModal(null);
        setEndPlanReason("");
        toast("Something went wrong", "error")
      } else {
        const errorData = await response.json();
        toast(errorData.error || "Failed to end plan", "error");
      }
    } catch (error) {
      console.error("Error ending nutrition plan:", error);
      toast("Error ending nutrition plan", "error");
    }
  };

  const startWorkout = async (workoutId: string) => {
    try {
      const response = await fetch("/api/workouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workoutId }),
      });
      if (response.ok) {
        fetchWorkouts(); // Refresh workouts
        toast("Workout started!", "success");
      }
    } catch (error) {
      console.error("Failed to start workout:", error);
    }
  };

  // Calculate dynamic stats from user data
  const stats = useMemo(() => {
    // Calculate workouts - workouts are actually WorkoutSession objects from the API
    const completedWorkouts = workouts.filter((w) => w.completed).length;
    const totalWorkouts = workouts.length;
    
    // Calculate workouts this week
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const workoutsThisWeek = workouts.filter(w => {
      const startTime = w.startTime ? new Date(w.startTime) : null;
      return startTime && startTime >= oneWeekAgo && w.completed;
    }).length;
    
    // Use real analytics data if available
    const weeklyFrequency = workoutAnalytics?.weeklyFrequency?.formatted || "0.0";
    const strongestExercise = workoutAnalytics?.strongestExercise?.formatted || "0lbs";
    const mostImprovedPercentage = workoutAnalytics?.mostImproved?.formatted || "0%";
    const totalWorkoutsCount = workoutAnalytics?.totalWorkouts || completedWorkouts;

    return [
      {
        title: "Total Workouts",
        value: totalWorkoutsCount,
        icon: Dumbbell,
        color: "bg-indigo-500",
        change: totalWorkouts > 0 ? `${Math.round((completedWorkouts / totalWorkouts) * 100)}% complete` : "0% complete",
      },
      {
        title: "Weekly Frequency", 
        value: weeklyFrequency,
        icon: Activity,
        color: "bg-green-500",
        change: workoutsThisWeek > 0 ? `${workoutsThisWeek} this week` : "0 this week",
      },
      {
        title: "Strongest Exercise",
        value: strongestExercise,
        icon: Target,
        color: "bg-purple-500",
        change: workoutAnalytics?.strongestExercise?.name || "No data",
      },
      {
        title: "Most Improved",
        value: mostImprovedPercentage,
        icon: TrendingUp,
        color: "bg-orange-500",
        change: workoutAnalytics?.mostImproved?.exerciseName || "No data",
      },
    ];
  }, [workouts, workoutAnalytics]);

  const menuItems = [
    { id: "overview", label: "Overview", icon: Activity },
    { id: "workouts", label: "Workouts", icon: Dumbbell },
    { id: "nutrition", label: "Nutrition", icon: Apple },
    { id: "progress", label: "Progress", icon: TrendingUp },
    { id: "schedule", label: "Schedule", icon: Calendar },
    { id: "messages", label: "Messages", icon: MessageCircle },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  // Show loading/redirect screen for trainers or users who need password change
  if (
    session?.user?.role === "TRAINER" ||
    session?.user?.passwordChangeRequired
  ) {
    const message =
      session?.user?.role === "TRAINER"
        ? "Redirecting to trainer dashboard..."
        : "Redirecting to password change...";

    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">{message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleGoHome}
                className="p-2 text-gray-400 hover:text-indigo-500 transition-colors duration-200 mr-2"
                title="Go to Homepage"
              >
                <Home className="w-5 h-5" />
              </motion.button>
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center mr-3">
                <Dumbbell className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                {session?.user?.name || "Client"} Dashboard
              </h1>
            </div>

            <div className="flex items-center space-x-2 flex-shrink-0">
              {/* Notification System */}
              <NotificationSystem
                userId={session?.user?.id || ""}
                userRole="CLIENT"
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
          <div className="w-full lg:w-64 flex-shrink-0">
            <div className="bg-white rounded-xl shadow-sm p-6 h-fit">
              <div className="mb-8">
                <div className="w-16 h-16 bg-indigo-600 rounded-full mx-auto mb-4 flex items-center justify-center ring-2 ring-indigo-500/20">
                  {session?.user?.image ? (
                    <img src={session.user.image} alt="" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <span className="text-2xl font-bold text-white">
                      {(session?.user?.name || "C").charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-semibold text-center text-gray-900">
                  {session?.user?.name || "Client"}
                </h3>
                <p className="text-sm text-gray-500 text-center">
                  Fitness Enthusiast
                </p>
              </div>

              <nav className="space-y-2">
                {menuItems.map((item) => (
                  <motion.button
                    key={item.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center px-3 py-2.5 rounded-lg text-left transition-all duration-200 ${
                      activeTab === item.id
                        ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-l-4 border-indigo-600 dark:border-indigo-400"
                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#242938]"
                    }`}
                  >
                    <item.icon className="w-5 h-5 mr-3 flex-shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </motion.button>
                ))}
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {activeTab === "overview" && (
              <OverviewTab
                userName={session?.user?.name}
                trainerInfo={trainerInfo}
                stats={stats}
                workouts={workouts}
                loading={loading}
                onTabChange={setActiveTab}
                onLogProgress={() => setShowLogProgressModal(true)}
                onStartWorkout={startWorkout}
              />
            )}

            {/* Workouts Tab */}
            {activeTab === "workouts" && (
              <WorkoutsTab
                workouts={workouts}
                loading={loading}
                progressData={progressData}
                onLogWorkout={(program) => setShowWorkoutLogModal(program)}
                onViewProgress={() => setActiveTab('progress')}
              />
            )}

            {/* Nutrition Tab */}
            {activeTab === "nutrition" && (
              <NutritionTab
                foodEntries={foodEntries}
                nutritionPlans={nutritionPlans}
                selectedDate={selectedDate}
                onDateChange={setSelectedDate}
                onLogFood={() => setShowFoodEntryModal(true)}
                onEndPlan={(planId) => setShowEndPlanModal(planId)}
              />
            )}


            {/* Progress Tab */}
            {activeTab === "progress" && (
              <ProgressTab onLogProgress={() => setShowLogProgressModal(true)} />
            )}

            {/* Schedule Tab */}
            {activeTab === "schedule" && (
              <ScheduleTab
                appointments={appointments}
                trainerId={trainerInfo?.id || null}
                onBookAppointment={() => setShowBookingModal(true)}
                onReschedule={(id) => setShowRescheduleModal(id)}
                onCancel={(id) => setShowCancelModal(id)}
              />
            )}

            {/* Settings Tab */}
            {/* Messages Tab */}
            {activeTab === "messages" && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Messages</h2>
                <ChatPanel
                  currentUserId={session?.user?.id || ''}
                  trainerId={trainerInfo?.id || null}
                  trainerName={trainerInfo?.name || null}
                />
              </motion.div>
            )}

            {activeTab === "settings" && (
              <SettingsTab
                session={session}
                theme={theme}
                userSettings={userSettings}
                onUpdateSetting={updateSetting}
                onResetSettings={resetSettings}
                onSaveSettings={saveSettings}
              />
            )}

            {/* Other tabs placeholder */}
            {activeTab !== "overview" &&
              activeTab !== "workouts" &&
              activeTab !== "nutrition" &&
              activeTab !== "progress" &&
              activeTab !== "schedule" &&
              activeTab !== "messages" &&
              activeTab !== "settings" && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-xl p-8 shadow-sm text-center"
                >
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">
                    {menuItems.find((item) => item.id === activeTab)?.label}
                  </h2>
                  <p className="text-gray-500">
                    This section is under development. The full implementation
                    would include detailed tracking and management features for
                    your fitness journey.
                  </p>
                </motion.div>
              )}
          </div>
        </div>
      </div>

      {/* Booking Modal */}
      {showBookingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900">
                Book an Appointment
              </h3>
              <button
                onClick={() => setShowBookingModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.target as HTMLFormElement);

                const appointmentData = {
                  trainerId: trainerInfo?.id,
                  title: formData.get("title"),
                  description: formData.get("description"),
                  type: formData.get("type"),
                  startTime: new Date(
                    formData.get("date") + "T" + formData.get("time"),
                  ),
                  endTime: new Date(
                    new Date(
                      formData.get("date") + "T" + formData.get("time"),
                    ).getTime() +
                      parseInt(formData.get("duration") as string) * 60 * 1000,
                  ),
                  duration: parseInt(formData.get("duration") as string),
                  location: formData.get("location"),
                  notes: formData.get("notes"),
                };

                try {
                  const response = await fetch("/api/appointments", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(appointmentData),
                  });

                  if (response.ok) {
                    setShowBookingModal(false);
                    fetchAppointments();
                    toast("Something went wrong", "error")
                  } else {
                    const error = await response.json();
                    toast("Something went wrong", "error")
                  }
                } catch (error) {
                  console.error("Failed to book appointment:", error);
                  toast("Error booking appointment", "error");
                }
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Session Type
                </label>
                <select
                  name="type"
                  required
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 dark:text-white"
                >
                  <option value="TRAINING_SESSION">Personal Training</option>
                  <option value="CHECK_IN">Progress Check-in</option>
                  <option value="NUTRITION_CONSULTATION">
                    Nutrition Consultation
                  </option>
                  <option value="ASSESSMENT">Fitness Assessment</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  name="title"
                  required
                  placeholder="e.g., Weekly Training Session"
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    name="date"
                    required
                    min={new Date().toISOString().split("T")[0]}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Time
                  </label>
                  <input
                    type="time"
                    name="time"
                    required
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Duration (minutes)
                </label>
                <select
                  name="duration"
                  required
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 dark:text-white"
                >
                  <option value="30">30 minutes</option>
                  <option value="45">45 minutes</option>
                  <option value="60">60 minutes</option>
                  <option value="90">90 minutes</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location (optional)
                </label>
                <input
                  type="text"
                  name="location"
                  placeholder="e.g., Main Gym, Studio A"
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  name="description"
                  rows={3}
                  placeholder="What would you like to work on in this session?"
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 dark:text-white"
                ></textarea>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Additional Notes (optional)
                </label>
                <textarea
                  name="notes"
                  rows={2}
                  placeholder="Any special requests or information for your trainer"
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 dark:text-white"
                ></textarea>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowBookingModal(false)}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Request Appointment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Progress Logging Modal */}
      <LogProgressModal
        isOpen={showLogProgressModal}
        onClose={() => setShowLogProgressModal(false)}
        onSubmit={handleNewProgressSubmit}
        initialDate={new Date().toISOString().split('T')[0]}
      />

      {/* OLD MODAL - TO BE REMOVED */}

      {/* Reschedule Modal */}
      {showRescheduleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
              Reschedule Appointment
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Date
                </label>
                <input
                  type="date"
                  value={rescheduleFormData.date}
                  onChange={(e) =>
                    setRescheduleFormData((prev) => ({
                      ...prev,
                      date: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Time
                </label>
                <input
                  type="time"
                  value={rescheduleFormData.time}
                  onChange={(e) =>
                    setRescheduleFormData((prev) => ({
                      ...prev,
                      time: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason for Reschedule
                </label>
                <textarea
                  value={rescheduleFormData.reason}
                  onChange={(e) =>
                    setRescheduleFormData((prev) => ({
                      ...prev,
                      reason: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white"
                  rows={3}
                  placeholder="Please explain why you need to reschedule..."
                />
              </div>
            </div>
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => handleRescheduleAppointment(showRescheduleModal)}
                className="flex-1 bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 transition-colors"
              >
                Send Request
              </button>
              <button
                onClick={() => {
                  setShowRescheduleModal(null);
                  setRescheduleFormData({ date: "", time: "", reason: "" });
                }}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Cancel Appointment</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason for Cancellation
                </label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 text-gray-900 dark:text-white"
                  rows={3}
                  placeholder="Please explain why you need to cancel..."
                />
              </div>
            </div>
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => handleCancelAppointment(showCancelModal)}
                className="flex-1 bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 transition-colors"
              >
                Confirm Cancellation
              </button>
              <button
                onClick={() => {
                  setShowCancelModal(null);
                  setCancelReason("");
                }}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 transition-colors"
              >
                Keep Appointment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Food Entry Modal */}
      {/* Food Entry Modal - Now with searchable food database */}
      <FoodEntryModal
        isOpen={showFoodEntryModal}
        onClose={() => setShowFoodEntryModal(false)}
        onSubmit={async (entry) => {
          try {
            const response = await fetch('/api/food-entries', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                ...entry,
                date: selectedDate,
              }),
            });
            if (response.ok) {
              fetchFoodEntries(selectedDate);
            } else {
              const error = await response.json();
              toast(error.message || "Something went wrong", "error");
            }
          } catch (error) {
            console.error('Error logging food entry:', error);
            toast('Error logging food entry', 'error');
          }
        }}
        selectedDate={selectedDate}
      />

      {/* End Nutrition Plan Modal */}
      {showEndPlanModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold text-gray-900">
                  End Nutrition Plan
                </h3>
                <button
                  onClick={() => setShowEndPlanModal(null)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="mb-6">
                <p className="text-gray-600 mb-4">
                  Are you sure you want to end your current nutrition plan? This
                  action cannot be undone and your trainer will be notified.
                </p>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason for ending (optional)
                  </label>
                  <textarea
                    value={endPlanReason}
                    onChange={(e) => setEndPlanReason(e.target.value)}
                    placeholder="Let your trainer know why you're ending this plan..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none text-gray-900 dark:text-white placeholder-gray-400"
                    rows={3}
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowEndPlanModal(null)}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() =>
                    showEndPlanModal && handleEndPlan(showEndPlanModal)
                  }
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  End Plan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Workout Logging Modal */}
      {showWorkoutLogModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold text-gray-900">
                  Log Workout -{" "}
                  {showWorkoutLogModal.workout?.title || "Workout"}
                </h3>
                <button
                  onClick={() => setShowWorkoutLogModal(null)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Date Selection */}
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Workout Date
                  </label>
                  <input
                    type="date"
                    value={workoutLogDate}
                    onChange={(e) => setWorkoutLogDate(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 dark:text-white bg-white"
                  />
                  <p className="text-xs text-gray-600 mt-1">
                    Select the date when you performed this workout
                  </p>
                </div>

                <div className="bg-indigo-50 dark:bg-indigo-500/10 p-4 rounded-lg">
                  <p className="text-sm text-blue-800">
                    Log your weights and reps for each exercise. This data
                    helps track your progress and allows Brent to see how
                    you&apos;re improving over time!
                  </p>
                </div>

                {showWorkoutLogModal.workout?.exercises?.length ? (
                  showWorkoutLogModal.workout.exercises.map(
                    (exercise, index: number) => (
                      <div
                        key={index}
                        className="border border-gray-200 rounded-lg p-4"
                      >
                        <h4 className="font-semibold text-gray-900 mb-2">
                          {exercise.exercise?.name || exercise.name || `Exercise ${index + 1}`}
                        </h4>
                        <p className="text-sm text-gray-600 mb-4">
                          Target: {exercise.sets} sets × {exercise.reps} reps
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Weight (lbs)
                            </label>
                            <input
                              type="number"
                              step="0.5"
                              min="0"
                              value={
                                workoutLogData[index]?.weight ||
                                ""
                              }
                              onChange={(e) =>
                                setWorkoutLogData((prev) => ({
                                  ...prev,
                                  [index]: {
                                    ...prev[index],
                                    weight: parseFloat(e.target.value) || 0,
                                  },
                                }))
                              }
                              placeholder="e.g., 135"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-400"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Sets Completed
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={
                                workoutLogData[index]?.sets || ""
                              }
                              onChange={(e) =>
                                setWorkoutLogData((prev) => ({
                                  ...prev,
                                  [index]: {
                                    ...prev[index],
                                    sets: parseInt(e.target.value) || 0,
                                  },
                                }))
                              }
                              placeholder={`Target: ${exercise.sets}`}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-400"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Average Reps
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={
                                workoutLogData[index]?.reps || ""
                              }
                              onChange={(e) =>
                                setWorkoutLogData((prev) => ({
                                  ...prev,
                                  [index]: {
                                    ...prev[index],
                                    reps: parseInt(e.target.value) || 0,
                                  },
                                }))
                              }
                              placeholder={`Target: ${exercise.reps}`}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-400"
                            />
                          </div>
                        </div>
                      </div>
                    ),
                  )
                ) : (
                  <div className="text-gray-500 text-center py-8">
                    No exercises found in this workout
                  </div>
                )}

                <div className="flex gap-3 pt-4 border-t">
                  <button
                    onClick={() => setShowWorkoutLogModal(null)}
                    className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        // Create a workout session for the selected date
                        // Parse date in local timezone to avoid UTC conversion issues
                        const [year, month, day] = workoutLogDate.split('-').map(Number);
                        const localDate = new Date(year, month - 1, day);
                        
                        const sessionResponse = await fetch("/api/workout-sessions", {
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json",
                          },
                          body: JSON.stringify({
                            workoutId: showWorkoutLogModal.workout?.id,
                            date: localDate.toISOString(),
                          }),
                        });

                        if (!sessionResponse.ok) {
                          throw new Error("Failed to create workout session");
                        }

                        const session = await sessionResponse.json();

                        // Prepare exercise data for submission
                        const exercises = showWorkoutLogModal.workout?.exercises?.map(
                          (exercise, index) => {
                            const logData = workoutLogData[index];
                            if (!logData || (logData.weight === 0 && logData.sets === 0 && logData.reps === 0)) {
                              return null;
                            }
                            return {
                              exerciseId: exercise.exercise?.id || exercise.id || `temp_${index}`,
                              exerciseName: exercise.exercise?.name || exercise.name || `Exercise ${index + 1}`,
                              weight: logData.weight || 0,
                              sets: logData.sets || 0,
                              reps: logData.reps || 0,
                            };
                          }
                        ).filter(ex => ex !== null);

                        if (!exercises || exercises.length === 0) {
                          toast("Something went wrong", "error")
                          return;
                        }

                        const response = await fetch("/api/workout-progress", {
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json",
                          },
                          body: JSON.stringify({
                            workoutSessionId: session.id,
                            exercises,
                            date: workoutLogDate,
                          }),
                        });

                        if (response.ok) {
                          toast("Something went wrong", "error")
                          setShowWorkoutLogModal(null);
                          setWorkoutLogData({});
                        } else {
                          const error = await response.json();
                          toast("Something went wrong", "error")
                        }
                      } catch (error) {
                        console.error("Error saving workout progress:", error);
                        toast("Something went wrong", "error")
                      }
                    }}
                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    Log Workout
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientDashboard;
/* Force refresh Mon Sep 22 12:29:02 PDT 2025 */
