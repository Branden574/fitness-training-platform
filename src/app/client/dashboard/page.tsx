"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
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
  ChevronRight,
  Home,
  X,
} from "lucide-react";
import NotificationSystem from "@/components/NotificationSystem";
import OptimizedImage from "@/components/OptimizedImage";
import LogProgressModal from "@/components/LogProgressModal";
import { imagePlaceholders } from "@/lib/imagePlaceholders";
import { Appointment } from "@/types";
import ProgressCharts from "@/components/ProgressCharts";
import DailyProgressView from "@/components/DailyProgressView";

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
  const [progressView, setProgressView] = useState<'charts' | 'daily'>('charts');
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [workoutAnalytics, setWorkoutAnalytics] = useState<WorkoutAnalytics | null>(null);
  const [currentWorkoutPage, setCurrentWorkoutPage] = useState(1);
  const workoutsPerPage = 20;
  const [userSettings, setUserSettings] = useState({
    notifications: true,
    emailUpdates: true,
    theme: 'light',
    units: 'imperial', // imperial or metric
    privacy: 'private'
  });
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
    setUserSettings(prev => ({ ...prev, [key]: value }));
    // Here you could also make an API call to save settings
  };

  const resetSettings = () => {
    setUserSettings({
      notifications: true,
      emailUpdates: true,
      theme: 'light',
      units: 'imperial',
      privacy: 'private'
    });
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
      console.error("❌ Client - Error fetching trainer info:", error);
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

        alert("Progress logged successfully! 🎉");
      } else {
        const error = await response.json();
        if (response.status === 409) {
          alert(
            "You already have a progress entry for this date. Try selecting a different date or update your existing entry.",
          );
        } else {
          alert(error.message || "Failed to log progress. Please try again.");
        }
      }
    } catch (error) {
      console.error("❌ Error logging progress:", error);
      alert(
        "Error logging progress. Please check your connection and try again.",
      );
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

        alert("Progress logged successfully! 🎉");
      } else {
        const error = await response.json();
        if (response.status === 409) {
          alert(
            "You already have a progress entry for this date. Try selecting a different date or update your existing entry.",
          );
        } else {
          alert(error.message || "Failed to log progress. Please try again.");
        }
      }
    } catch (error) {
      console.error("❌ Error logging progress:", error);
      alert(
        "Error logging progress. Please check your connection and try again.",
      );
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
        alert("Reschedule request sent to your trainer! 📅");
        setShowRescheduleModal(null);
        setRescheduleFormData({ date: "", time: "", reason: "" });
        fetchAppointments(); // Refresh appointments
      } else {
        const error = await response.json();
        alert(error.message || "Failed to send reschedule request");
      }
    } catch (error) {
      console.error("Error requesting reschedule:", error);
      alert("Error sending reschedule request. Please try again.");
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
        alert("Appointment cancelled successfully! ❌");
        setShowCancelModal(null);
        setCancelReason("");
        fetchAppointments(); // Refresh appointments
      } else {
        const error = await response.json();
        alert(error.message || "Failed to cancel appointment");
      }
    } catch (error) {
      console.error("Error cancelling appointment:", error);
      alert("Error cancelling appointment. Please try again.");
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
          console.error("❌ Failed to fetch food entries, status:", response.status);
        }
      } catch (error) {
        console.error("❌ Failed to fetch food entries:", error);
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
        console.error("❌ Failed to fetch progress data");
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
        alert("Please fill in all required fields (Food Name, Quantity, Calories)");
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

        alert("Food entry logged successfully! 🍎");
      } else {
        const errorText = await response.text();
        console.error("❌ Server error response:", errorText);
        
        try {
          const error = JSON.parse(errorText);
          alert(error.message || "Failed to log food entry");
        } catch {
          alert(`Failed to log food entry: ${response.status} ${response.statusText}`);
        }
      }
    } catch (error) {
      console.error("❌ Error logging food entry:", error);
      alert("Error logging food entry. Please try again.");
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
        alert(
          "Nutrition plan ended successfully. Your trainer has been notified.",
        );
      } else {
        const errorData = await response.json();
        alert(errorData.error || "Failed to end nutrition plan");
      }
    } catch (error) {
      console.error("Error ending nutrition plan:", error);
      alert("Error ending nutrition plan. Please try again.");
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
        alert("Workout started! Track your progress as you go.");
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
        color: "bg-blue-500",
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
                className="p-2 text-gray-400 hover:text-blue-600 transition-colors duration-200 mr-2"
                title="Go to Homepage"
              >
                <Home className="w-5 h-5" />
              </motion.button>
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center mr-3">
                <Dumbbell className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
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
                <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full mx-auto mb-4"></div>
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
                    className={`w-full flex items-center px-3 py-2 rounded-lg text-left transition-all duration-200 ${
                      activeTab === item.id
                        ? "bg-blue-50 text-blue-600 border-l-4 border-blue-600"
                        : "text-gray-700 hover:bg-gray-50"
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
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                {/* Welcome Section */}
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-8 text-white mb-8">
                  <h2 className="text-3xl font-bold mb-2">
                    Good morning,{" "}
                    {session?.user?.name?.split(" ")[0] || "there"}! 👋
                  </h2>
                  <p className="text-blue-100">
                    Ready to crush your fitness goals today?
                  </p>
                  {trainerInfo && (
                    <div className="mt-4 p-4 bg-white/10 rounded-lg flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <OptimizedImage
                          src={imagePlaceholders.portrait}
                          alt="Brent Martinez - Personal Trainer"
                          width={60}
                          height={60}
                          className="w-15 h-15 rounded-full ring-2 ring-white/20"
                        />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">Your Trainer:</p>
                        <p className="text-lg font-semibold">
                          {trainerInfo.name}
                        </p>
                        <p className="text-blue-100 text-sm">
                          {trainerInfo.email}
                        </p>
                      </div>
                    </div>
                  )}
                  {!trainerInfo && (
                    <div className="mt-4 p-3 bg-red-500/20 rounded-lg">
                      <p className="text-sm font-medium">
                        ⚠️ No trainer assigned
                      </p>
                      <p className="text-blue-100 text-sm">
                        Please contact support for trainer assignment.
                      </p>
                    </div>
                  )}
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                  {stats.map((stat, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      whileHover={{ scale: 1.05 }}
                      className="bg-white rounded-xl p-6 shadow-sm"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div
                          className={`w-12 h-12 ${stat.color} rounded-lg flex items-center justify-center`}
                        >
                          <stat.icon className="w-6 h-6 text-white" />
                        </div>
                        <span className="text-sm font-medium text-green-600">
                          {stat.change}
                        </span>
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-1">
                        {stat.value}
                      </h3>
                      <p className="text-sm text-gray-500">{stat.title}</p>
                    </motion.div>
                  ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Upcoming Workouts */}
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 }}
                    className="bg-white rounded-xl p-6 shadow-sm"
                  >
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-lg font-semibold text-gray-900">
                        Assigned Workouts
                      </h3>
                      <button
                        onClick={() => setActiveTab("workouts")}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="space-y-4">
                      {loading ? (
                        <div className="flex justify-center py-4">
                          <LoadingSpinner />
                        </div>
                      ) : workouts.length > 0 ? (
                        workouts.slice(0, 3).map((session) => (
                          <div
                            key={session.id}
                            className="flex items-center p-4 bg-gray-50 rounded-lg"
                          >
                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                              <Dumbbell className="w-5 h-5 text-blue-600" />
                            </div>
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900">
                                {session.workout?.title || "Workout"}
                              </h4>
                              <p className="text-sm text-gray-500">
                                {session.workout?.duration || 0} min •{" "}
                                {session.workout?.difficulty || "Normal"}
                              </p>
                            </div>
                            <span
                              className={`text-xs px-2 py-1 rounded-full ${
                                session.completed
                                  ? "bg-green-100 text-green-700"
                                  : "bg-yellow-100 text-yellow-700"
                              }`}
                            >
                              {session.completed ? "Completed" : "Assigned"}
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-4 text-gray-500">
                          No workouts assigned yet
                        </div>
                      )}
                    </div>
                  </motion.div>

                  {/* Quick Actions */}
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 }}
                    className="bg-white rounded-xl p-6 shadow-sm"
                  >
                    <h3 className="text-lg font-semibold text-gray-900 mb-6">
                      Quick Actions
                    </h3>

                    <div className="grid grid-cols-2 gap-4">
                      {[
                        {
                          title: "Start Workout",
                          icon: Activity,
                          color: "bg-green-500",
                          onClick: () => {
                            if (workouts.length > 0) {
                              const nextWorkout = workouts.find(
                                (w) => !w.completed,
                              );
                              if (nextWorkout?.workout?.id) {
                                startWorkout(nextWorkout.workout.id);
                              } else {
                                alert("All workouts completed! Great job!");
                              }
                            } else {
                              alert(
                                "No workouts assigned yet. Contact your trainer to get started!",
                              );
                            }
                          },
                        },
                        {
                          title: "Log Progress",
                          icon: TrendingUp,
                          color: "bg-blue-500",
                          onClick: () => setShowLogProgressModal(true),
                        },
                        {
                          title: "View Schedule",
                          icon: Calendar,
                          color: "bg-purple-500",
                          onClick: () => setActiveTab("schedule"),
                        },
                        {
                          title: "View Goals",
                          icon: Target,
                          color: "bg-orange-500",
                          onClick: () => setActiveTab("progress"),
                        },
                      ].map((action, index) => (
                        <motion.button
                          key={index}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={action.onClick}
                          className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200"
                        >
                          <div
                            className={`w-8 h-8 ${action.color} rounded-lg flex items-center justify-center mx-auto mb-2`}
                          >
                            <action.icon className="w-4 h-4 text-white" />
                          </div>
                          <p className="text-sm font-medium text-gray-700">
                            {action.title}
                          </p>
                        </motion.button>
                      ))}
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            )}

            {/* Workouts Tab */}
            {activeTab === "workouts" && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="bg-white rounded-xl p-6 shadow-sm">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">
                    Assigned Workout Programs
                  </h2>

                  {loading ? (
                    <div className="flex justify-center py-8">
                      <LoadingSpinner size="lg" />
                    </div>
                  ) : workouts.length > 0 ? (
                    <div className="space-y-4">
                      {/* Pagination Info */}
                      <div className="flex justify-between items-center mb-4">
                        <div className="text-sm text-black font-medium">
                          Showing {((currentWorkoutPage - 1) * workoutsPerPage) + 1} to {Math.min(currentWorkoutPage * workoutsPerPage, workouts.length)} of {workouts.length} workouts
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => setCurrentWorkoutPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentWorkoutPage === 1}
                            className="px-3 py-1 text-sm text-black border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Previous
                          </button>
                          <span className="px-3 py-1 text-sm text-black font-medium">
                            Page {currentWorkoutPage} of {Math.ceil(workouts.length / workoutsPerPage)}
                          </span>
                          <button
                            onClick={() => setCurrentWorkoutPage(prev => Math.min(prev + 1, Math.ceil(workouts.length / workoutsPerPage)))}
                            disabled={currentWorkoutPage >= Math.ceil(workouts.length / workoutsPerPage)}
                            className="px-3 py-1 text-sm text-black border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Next
                          </button>
                        </div>
                      </div>
                      {workouts.slice((currentWorkoutPage - 1) * workoutsPerPage, currentWorkoutPage * workoutsPerPage).map((program) => (
                        <div
                          key={program.id}
                          className="border border-gray-200 rounded-lg p-6"
                        >
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <h3 className="text-xl font-semibold text-gray-900">
                                {program.workout?.title || "Workout Program"}
                              </h3>
                              <p className="text-gray-600 mt-1">
                                {program.workout?.description || ""}
                              </p>
                              <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                                <span>
                                  Duration: {program.workout?.duration || 30}{" "}
                                  minutes
                                </span>
                                <span>
                                  Difficulty:{" "}
                                  {program.workout?.difficulty || "BEGINNER"}
                                </span>
                                <span>
                                  Exercises:{" "}
                                  {program.workout?.exercises?.length || 0}
                                </span>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800">
                                Active Program
                              </span>
                            </div>
                          </div>

                          {/* Exercise List */}
                          {program.workout?.exercises &&
                            program.workout.exercises.length > 0 && (
                              <div className="mt-4">
                                <h4 className="font-medium text-gray-900 mb-3">
                                  Exercises:
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  {program.workout.exercises.map(
                                    (workoutExercise, idx) => (
                                      <div
                                        key={idx}
                                        className="bg-gray-50 rounded-lg p-3"
                                      >
                                        <div className="font-medium text-gray-900">
                                          {workoutExercise.exercise?.name || workoutExercise.name || "Exercise"}
                                        </div>
                                        <div className="text-sm text-gray-600 mt-1">
                                          {workoutExercise.sets} sets ×{" "}
                                          {workoutExercise.reps} reps
                                          {workoutExercise.weight &&
                                            ` @ ${workoutExercise.weight}lbs`}
                                        </div>
                                      </div>
                                    ),
                                  )}
                                </div>
                              </div>
                            )}

                          {/* Action Buttons */}
                          <div className="flex space-x-3 mt-6">
                            <button
                              onClick={() => setShowWorkoutLogModal(program)}
                              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                            >
                              Log Workout
                            </button>
                            <button
                              onClick={() => {
                                // Navigate to progress view for this workout
                                setActiveTab('progress');
                                // Check if there's any progress data
                                if (!progressData || progressData.entries.length === 0) {
                                  alert("No progress data found yet. Complete some workouts to see your progress!");
                                } else {
                                  // Filter will happen in the progress tab based on workout
                                  alert(`Viewing progress tab. Total progress entries: ${progressData.entries.length}`);
                                }
                              }}
                              className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors"
                            >
                              View Progress
                            </button>
                          </div>
                        </div>
                      ))}
                      
                      {/* Bottom Pagination Controls */}
                      {Math.ceil(workouts.length / workoutsPerPage) > 1 && (
                        <div className="flex justify-center items-center space-x-2 mt-6 pt-4 border-t">
                          <button
                            onClick={() => setCurrentWorkoutPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentWorkoutPage === 1}
                            className="px-4 py-2 text-sm text-black border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Previous
                          </button>
                          <div className="flex space-x-1">
                            {[...Array(Math.ceil(workouts.length / workoutsPerPage))].map((_, index) => {
                              const pageNumber = index + 1;
                              const isCurrentPage = pageNumber === currentWorkoutPage;
                              return (
                                <button
                                  key={pageNumber}
                                  onClick={() => setCurrentWorkoutPage(pageNumber)}
                                  className={`px-3 py-2 text-sm rounded ${
                                    isCurrentPage
                                      ? 'bg-blue-600 text-white'
                                      : 'border border-gray-300 hover:bg-gray-50 text-black'
                                  }`}
                                >
                                  {pageNumber}
                                </button>
                              );
                            })}
                          </div>
                          <button
                            onClick={() => setCurrentWorkoutPage(prev => Math.min(prev + 1, Math.ceil(workouts.length / workoutsPerPage)))}
                            disabled={currentWorkoutPage >= Math.ceil(workouts.length / workoutsPerPage)}
                            className="px-4 py-2 text-sm text-black border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Next
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Dumbbell className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        No workouts assigned yet
                      </h3>
                      <p className="text-gray-500">
                        Contact your trainer to get your first workout!
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Nutrition Tab */}
            {activeTab === "nutrition" && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="bg-white rounded-xl p-6 shadow-sm">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">
                      Nutrition Tracking
                    </h2>
                    <div className="flex items-center gap-4">
                      <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                      />
                      <button
                        onClick={() => setShowFoodEntryModal(true)}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                      >
                        <Apple className="h-4 w-4" />
                        Log Food
                      </button>
                    </div>
                  </div>

                  {/* Daily Nutrition Summary */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-blue-50 rounded-lg p-4">
                      <h3 className="text-sm font-medium text-blue-800">
                        Calories
                      </h3>
                      <p className="text-2xl font-bold text-blue-900">
                        {selectedDateTotals.calories} /{" "}
                        {nutritionPlans[0]?.dailyCalorieTarget || 2000}
                      </p>
                      <div className="w-full bg-blue-200 rounded-full h-2 mt-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{
                            width: `${Math.min(100, (selectedDateTotals.calories / (nutritionPlans[0]?.dailyCalorieTarget || 2000)) * 100)}%`,
                          }}
                        ></div>
                      </div>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4">
                      <h3 className="text-sm font-medium text-green-800">
                        Protein
                      </h3>
                      <p className="text-2xl font-bold text-green-900">
                        {selectedDateTotals.protein.toFixed(1)}g /{" "}
                        {nutritionPlans[0]?.dailyProteinTarget || 150}g
                      </p>
                      <div className="w-full bg-green-200 rounded-full h-2 mt-2">
                        <div
                          className="bg-green-600 h-2 rounded-full transition-all duration-300"
                          style={{
                            width: `${Math.min(100, (selectedDateTotals.protein / (nutritionPlans[0]?.dailyProteinTarget || 150)) * 100)}%`,
                          }}
                        ></div>
                      </div>
                    </div>
                    <div className="bg-yellow-50 rounded-lg p-4">
                      <h3 className="text-sm font-medium text-yellow-800">
                        Carbs
                      </h3>
                      <p className="text-2xl font-bold text-yellow-900">
                        {selectedDateTotals.carbs.toFixed(1)}g /{" "}
                        {nutritionPlans[0]?.dailyCarbTarget || 200}g
                      </p>
                      <div className="w-full bg-yellow-200 rounded-full h-2 mt-2">
                        <div
                          className="bg-yellow-600 h-2 rounded-full transition-all duration-300"
                          style={{
                            width: `${Math.min(100, (selectedDateTotals.carbs / (nutritionPlans[0]?.dailyCarbTarget || 200)) * 100)}%`,
                          }}
                        ></div>
                      </div>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-4">
                      <h3 className="text-sm font-medium text-purple-800">
                        Fat
                      </h3>
                      <p className="text-2xl font-bold text-purple-900">
                        {selectedDateTotals.fat.toFixed(1)}g /{" "}
                        {nutritionPlans[0]?.dailyFatTarget || 70}g
                      </p>
                      <div className="w-full bg-purple-200 rounded-full h-2 mt-2">
                        <div
                          className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                          style={{
                            width: `${Math.min(100, (selectedDateTotals.fat / (nutritionPlans[0]?.dailyFatTarget || 70)) * 100)}%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  {/* Food Entries for Selected Date */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Food Entries -{" "}
                      <span className="text-black">
                        {(() => {
                          // Format date without timezone conversion
                          const [year, month, day] = selectedDate.split('-');
                          return `${month}/${day}/${year}`;
                        })()}
                      </span>
                    </h3>

                    {(() => {
                      const selectedDateEntries = foodEntries.filter((entry) => {
                        // Parse the selected date to get the date range in local timezone
                        const [year, month, day] = selectedDate.split('-').map(Number);
                        const startOfDay = new Date(year, month - 1, day);
                        const endOfDay = new Date(year, month - 1, day + 1);
                        
                        // Compare entry date against the local date range
                        const entryDate = new Date(entry.date);
                        const matches = entryDate >= startOfDay && entryDate < endOfDay;
                        
                        return matches;
                      });
                      
                      return selectedDateEntries.length === 0 ? (
                        <div className="bg-gray-50 rounded-lg p-8 text-center">
                          <Apple className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                          <p className="text-gray-500">
                            No food entries for this date.
                          </p>
                          <p className="text-sm text-gray-400 mt-2">
                            Start tracking your nutrition by logging your first
                            meal!
                          </p>
                          <button
                            onClick={() => setShowFoodEntryModal(true)}
                            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            Log Your First Meal
                          </button>
                        </div>
                      ) : (
                        <>
                          {/* Group entries by meal type */}
                          {["BREAKFAST", "LUNCH", "DINNER", "SNACK"].map(
                            (mealType) => {
                              // Filter entries by selected date AND meal type
                              const mealEntries = selectedDateEntries.filter(
                                (entry) => entry.mealType === mealType,
                              );
                            if (mealEntries.length === 0) return null;

                            const mealTotals = mealEntries.reduce(
                              (totals, entry) => ({
                                calories: totals.calories + entry.calories,
                                protein: totals.protein + entry.protein,
                                carbs: totals.carbs + entry.carbs,
                                fat: totals.fat + entry.fat,
                              }),
                              { calories: 0, protein: 0, carbs: 0, fat: 0 },
                            );

                            return (
                              <div
                                key={mealType}
                                className="bg-white border border-gray-200 rounded-lg p-4"
                              >
                                <div className="flex justify-between items-center mb-3">
                                  <h4 className="text-lg font-semibold text-gray-900 capitalize">
                                    {mealType.toLowerCase()}
                                  </h4>
                                  <div className="text-sm text-gray-600">
                                    {mealTotals.calories} cal •{" "}
                                    {mealTotals.protein.toFixed(1)}g protein
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  {mealEntries.map((entry) => (
                                    <div
                                      key={entry.id}
                                      className="flex justify-between items-center bg-gray-50 p-3 rounded"
                                    >
                                      <div className="flex-1">
                                        <h5 className="font-medium text-gray-900">
                                          {entry.foodName}
                                        </h5>
                                        <p className="text-sm text-gray-600">
                                          {entry.quantity} {entry.unit}
                                        </p>
                                        {entry.notes && (
                                          <p className="text-xs text-gray-500 italic mt-1">
                                            {entry.notes}
                                          </p>
                                        )}
                                      </div>
                                      <div className="text-right">
                                        <p className="font-medium text-gray-900">
                                          {entry.calories} cal
                                        </p>
                                        <p className="text-xs text-gray-600">
                                          P: {entry.protein}g • C: {entry.carbs}
                                          g • F: {entry.fat}g
                                        </p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          },
                        )}
                      </>
                    );
                  })()}
                  </div>

                  {/* Current Nutrition Plans */}
                  {nutritionPlans.length > 0 && (
                    <div className="mt-8 space-y-4">
                      <h3 className="text-lg font-semibold text-gray-900">
                        Your Nutrition Plans
                      </h3>
                      {nutritionPlans.map((plan, index) => {
                        const isActive =
                          new Date(plan.endDate || "") > new Date();
                        return (
                          <div
                            key={index}
                            className="bg-white border border-gray-200 rounded-lg p-6"
                          >
                            <div className="flex justify-between items-start mb-4">
                              <div>
                                <h4 className="text-xl font-semibold text-gray-900">
                                  {plan.name}
                                </h4>
                                {plan.description && (
                                  <p className="text-gray-900 mt-1">
                                    {plan.description}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <span
                                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                                    isActive
                                      ? "bg-green-100 text-green-800"
                                      : "bg-gray-100 text-gray-800"
                                  }`}
                                >
                                  {isActive ? "Active" : "Ended"}
                                </span>
                                {isActive && (
                                  <button
                                    onClick={() => setShowEndPlanModal(plan.id)}
                                    className="text-red-600 hover:text-red-700 text-sm font-medium px-2 py-1 rounded hover:bg-red-50 transition-colors"
                                  >
                                    End Plan
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Macro Targets */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                              <div className="bg-blue-50 rounded-lg p-3">
                                <h5 className="text-sm font-medium text-blue-800">
                                  Daily Calories
                                </h5>
                                <p className="text-lg font-bold text-blue-900">
                                  {plan.dailyCalorieTarget}
                                </p>
                              </div>
                              <div className="bg-green-50 rounded-lg p-3">
                                <h5 className="text-sm font-medium text-green-800">
                                  Protein
                                </h5>
                                <p className="text-lg font-bold text-green-900">
                                  {plan.dailyProteinTarget}g
                                </p>
                              </div>
                              <div className="bg-yellow-50 rounded-lg p-3">
                                <h5 className="text-sm font-medium text-yellow-800">
                                  Carbs
                                </h5>
                                <p className="text-lg font-bold text-yellow-900">
                                  {plan.dailyCarbTarget}g
                                </p>
                              </div>
                              <div className="bg-purple-50 rounded-lg p-3">
                                <h5 className="text-sm font-medium text-purple-800">
                                  Fat
                                </h5>
                                <p className="text-lg font-bold text-purple-900">
                                  {plan.dailyFatTarget}g
                                </p>
                              </div>
                            </div>

                            {/* Plan Duration */}
                            <div className="text-sm text-gray-600">
                              <p>
                                <strong>Duration:</strong>{" "}
                                {plan.startDate
                                  ? new Date(
                                      plan.startDate,
                                    ).toLocaleDateString()
                                  : "Not set"}{" "}
                                -{" "}
                                {plan.endDate
                                  ? new Date(plan.endDate).toLocaleDateString()
                                  : "Not set"}
                              </p>
                              <p className="mt-1">
                                <strong>Created by:</strong> Your trainer
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Progress Tab */}
            {activeTab === "progress" && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <h2 className="text-2xl font-bold text-black">Your Progress</h2>
                  
                  <div className="flex items-center gap-3">
                    {/* Progress View Toggle */}
                    <div className="flex bg-gray-100 rounded-lg p-1">
                      <button
                        onClick={() => setProgressView('charts')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                          progressView === 'charts'
                            ? 'bg-white text-blue-600 shadow-sm'
                            : 'text-black hover:text-blue-600'
                        }`}
                      >
                        📊 Analytics
                      </button>
                      <button
                        onClick={() => setProgressView('daily')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                          progressView === 'daily'
                            ? 'bg-white text-blue-600 shadow-sm'
                            : 'text-black hover:text-blue-600'
                        }`}
                      >
                        📅 Daily Log
                      </button>
                    </div>
                    
                    {/* Log Progress Button */}
                    <button
                      onClick={() => setShowLogProgressModal(true)}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2"
                    >
                      <TrendingUp className="h-4 w-4" />
                      Log Progress
                    </button>
                  </div>
                </div>
                
                {/* Content based on selected view */}
                {progressView === 'charts' ? (
                  <ProgressCharts />
                ) : (
                  <DailyProgressView />
                )}
              </motion.div>
            )}

            {/* Schedule Tab */}
            {activeTab === "schedule" && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="bg-white rounded-xl p-6 shadow-sm">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">
                    Your Schedule
                  </h2>

                  {/* Upcoming Sessions */}
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Upcoming Sessions
                    </h3>
                    <div className="space-y-4">
                      {appointments
                        .filter((apt) => new Date(apt.startTime) > new Date())
                        .slice(0, 5)
                        .map((appointment) => (
                          <div
                            key={appointment.id}
                            className="border border-gray-200 rounded-lg p-4"
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-semibold text-gray-900">
                                  {appointment.title}
                                </h4>
                                <p className="text-gray-900">
                                  with {appointment.trainer?.name}
                                </p>
                                <p className="text-sm text-gray-500 mt-1">
                                  {new Date(
                                    appointment.startTime,
                                  ).toLocaleDateString()}{" "}
                                  •{" "}
                                  {new Date(
                                    appointment.startTime,
                                  ).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}{" "}
                                  -{" "}
                                  {new Date(
                                    appointment.endTime,
                                  ).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </p>
                                <span
                                  className={`inline-block px-2 py-1 text-xs rounded-full mt-2 ${
                                    appointment.status === "PENDING"
                                      ? "bg-yellow-100 text-yellow-800"
                                      : appointment.status === "APPROVED"
                                        ? "bg-green-100 text-green-800"
                                        : "bg-gray-100 text-gray-800"
                                  }`}
                                >
                                  {appointment.status}
                                </span>
                              </div>
                              <div className="flex space-x-2">
                                {appointment.status === "APPROVED" && (
                                  <button
                                    className="text-blue-600 hover:text-blue-800 text-sm"
                                    onClick={() =>
                                      setShowRescheduleModal(appointment.id)
                                    }
                                  >
                                    Reschedule
                                  </button>
                                )}
                                <button
                                  className="text-red-600 hover:text-red-800 text-sm"
                                  onClick={() =>
                                    setShowCancelModal(appointment.id)
                                  }
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      {appointments.filter(
                        (apt) => new Date(apt.startTime) > new Date(),
                      ).length === 0 && (
                        <p className="text-gray-500 text-center py-8">
                          No upcoming appointments. Book a session with your
                          trainer!
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Quick Schedule Actions */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Quick Actions
                    </h3>
                    <div className="grid grid-cols-1 gap-4">
                      <button
                        onClick={() => setShowBookingModal(true)}
                        className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
                      >
                        <Calendar className="w-6 h-6 text-blue-600 mb-2" />
                        <h4 className="font-medium text-gray-900">
                          Request Session
                        </h4>
                        <p className="text-sm text-gray-500">
                          Book a new training session
                        </p>
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Settings Tab */}
            {activeTab === "settings" && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="bg-white rounded-xl p-6 shadow-sm">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">
                    Settings
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
                            Display Name
                          </label>
                          <input
                            type="text"
                            value={session?.user?.name || ''}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                            readOnly
                          />
                          <p className="text-sm text-gray-500 mt-1">Contact your trainer to change your display name</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-black mb-2">
                            Email Address
                          </label>
                          <input
                            type="email"
                            value={session?.user?.email || ''}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                            readOnly
                          />
                          <p className="text-sm text-gray-500 mt-1">Contact support to change your email address</p>
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
                              Push Notifications
                            </label>
                            <p className="text-sm text-gray-500">Receive notifications for workout reminders and updates</p>
                          </div>
                          <button
                            onClick={() => updateSetting('notifications', !userSettings.notifications)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                              userSettings.notifications ? 'bg-blue-600' : 'bg-gray-300'
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
                            <p className="text-sm text-gray-500">Receive weekly progress reports and tips</p>
                          </div>
                          <button
                            onClick={() => updateSetting('emailUpdates', !userSettings.emailUpdates)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                              userSettings.emailUpdates ? 'bg-blue-600' : 'bg-gray-300'
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                userSettings.emailUpdates ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Units & Display */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        Units & Display
                      </h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-black mb-2">
                            Measurement Units
                          </label>
                          <select
                            value={userSettings.units}
                            onChange={(e) => updateSetting('units', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
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
                            onChange={(e) => updateSetting('theme', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                          >
                            <option value="light">Light</option>
                            <option value="dark">Dark</option>
                            <option value="auto">Auto</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Privacy Settings */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        Privacy
                      </h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-black mb-2">
                            Profile Visibility
                          </label>
                          <select
                            value={userSettings.privacy}
                            onChange={(e) => updateSetting('privacy', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                          >
                            <option value="private">Private - Only visible to your trainer</option>
                            <option value="public">Public - Visible to other users</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex space-x-4 pt-6 border-t">
                      <button
                        onClick={resetSettings}
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        Reset to Defaults
                      </button>
                      <button
                        onClick={() => {
                          // Here you would typically save to API
                          alert('Settings saved successfully!');
                        }}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Save Changes
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Other tabs placeholder */}
            {activeTab !== "overview" &&
              activeTab !== "workouts" &&
              activeTab !== "nutrition" &&
              activeTab !== "progress" &&
              activeTab !== "schedule" &&
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
                    alert(
                      "Appointment request sent! Your trainer will review and approve it.",
                    );
                  } else {
                    const error = await response.json();
                    alert(
                      error.message ||
                        "Failed to book appointment. Please try again.",
                    );
                  }
                } catch (error) {
                  console.error("Failed to book appointment:", error);
                  alert("Error booking appointment. Please try again.");
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
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
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
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
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
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
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
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
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
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
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
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
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
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
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
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
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
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
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
      {false && showLogProgressModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div 
            className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            style={{ color: 'rgb(0, 0, 0) !important' }}
          >
            <div className="p-6" style={{ color: 'rgb(0, 0, 0) !important' }}>
              <div className="flex justify-between items-center mb-6">
                <h3 
                  className="text-xl font-semibold"
                  style={{ 
                    color: 'rgb(0, 0, 0) !important',
                    fontWeight: 'bold !important',
                    opacity: '1 !important'
                  }}
                >
                  Log Daily Progress
                </h3>
                <button
                  onClick={() => setShowLogProgressModal(false)}
                  className="text-gray-600 hover:text-gray-800 transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <form 
                onSubmit={handleProgressSubmit} 
                className="space-y-6"
                style={{ 
                  color: 'rgb(0, 0, 0) !important'
                } as React.CSSProperties}
              >
                {/* Date Selection */}
                <div>
                  <label 
                    className="block text-sm font-medium mb-2"
                    style={{ 
                      color: 'rgb(0, 0, 0) !important',
                      fontWeight: 'bold !important',
                      opacity: '1 !important'
                    }}
                  >
                    Date
                  </label>
                  <input
                    type="date"
                    value={progressFormData.date}
                    onChange={(e) =>
                      setProgressFormData({
                        ...progressFormData,
                        date: e.target.value,
                      })
                    }
                    max={new Date().toISOString().split("T")[0]}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                {/* Weight Section */}
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 
                    className="font-medium mb-3 flex items-center"
                    style={{ 
                      color: 'rgb(0, 0, 0) !important',
                      fontWeight: 'bold !important',
                      opacity: '1 !important'
                    }}
                  >
                    <Activity className="h-5 w-5 mr-2 text-blue-600" />
                    Body Measurements
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label 
                        className="block text-sm font-medium mb-1"
                        style={{ color: 'rgb(0, 0, 0) !important' }}
                      >
                        Weight (lbs)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={progressFormData.weight}
                        onChange={(e) =>
                          setProgressFormData({
                            ...progressFormData,
                            weight: e.target.value,
                          })
                        }
                        placeholder="e.g., 150.5"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label 
                        className="block text-sm font-medium mb-1"
                        style={{ color: 'rgb(0, 0, 0) !important' }}
                      >
                        Body Fat %
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        value={progressFormData.bodyFat}
                        onChange={(e) =>
                          setProgressFormData({
                            ...progressFormData,
                            bodyFat: e.target.value,
                          })
                        }
                        placeholder="e.g., 18.5"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label 
                        className="block text-sm font-medium mb-1"
                        style={{ color: 'rgb(0, 0, 0) !important' }}
                      >
                        Muscle Mass (lbs)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={progressFormData.muscleMass}
                        onChange={(e) =>
                          setProgressFormData({
                            ...progressFormData,
                            muscleMass: e.target.value,
                          })
                        }
                        placeholder="e.g., 125.2"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>

                {/* Wellness Section */}
                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 
                    className="font-medium mb-3 flex items-center"
                    style={{ 
                      color: 'rgb(0, 0, 0) !important',
                      fontWeight: 'bold !important',
                      opacity: '1 !important'
                    }}
                  >
                    <TrendingUp className="h-5 w-5 mr-2 text-green-600" />
                    Daily Wellness
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label 
                        className="block text-sm font-medium mb-1"
                        style={{ color: 'rgb(0, 0, 0) !important' }}
                      >
                        Mood (1-10)
                      </label>
                      <select
                        value={progressFormData.mood}
                        onChange={(e) =>
                          setProgressFormData({
                            ...progressFormData,
                            mood: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Select mood</option>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                          <option key={num} value={num}>
                            {num} {num <= 3 ? "😞" : num <= 6 ? "😐" : "😊"}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label 
                        className="block text-sm font-medium mb-1"
                        style={{ color: 'rgb(0, 0, 0) !important' }}
                      >
                        Energy Level (1-10)
                      </label>
                      <select
                        value={progressFormData.energy}
                        onChange={(e) =>
                          setProgressFormData({
                            ...progressFormData,
                            energy: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Select energy</option>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                          <option key={num} value={num}>
                            {num} {num <= 3 ? "💤" : num <= 6 ? "⚡" : "🔥"}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label 
                        className="block text-sm font-medium mb-1"
                        style={{ color: 'rgb(0, 0, 0) !important' }}
                      >
                        Sleep (hours)
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        max="24"
                        value={progressFormData.sleep}
                        onChange={(e) =>
                          setProgressFormData({
                            ...progressFormData,
                            sleep: e.target.value,
                          })
                        }
                        placeholder="e.g., 7.5"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>

                {/* Notes Section */}
                <div>
                  <label 
                    className="block text-sm font-medium mb-2"
                    style={{ color: 'rgb(0, 0, 0) !important' }}
                  >
                    Notes & Reflections
                  </label>
                  <textarea
                    value={progressFormData.notes}
                    onChange={(e) =>
                      setProgressFormData({
                        ...progressFormData,
                        notes: e.target.value,
                      })
                    }
                    placeholder="How are you feeling today? Any observations about your fitness journey?"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  />
                </div>

                {/* Submit Actions */}
                <div className="flex gap-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => setShowLogProgressModal(false)}
                    className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={progressLoading}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {progressLoading ? "Saving..." : "Save Progress"}
                  </button>
                </div>
              </form>

              {/* Progress Tips */}
              <div 
                className="mt-6 p-4 bg-gray-50 rounded-lg"
                style={{ 
                  color: 'rgb(0, 0, 0)',
                  backgroundColor: '#f9fafb'
                }}
              >
                <div>
                  <h5 
                    style={{ 
                      color: 'rgb(0, 0, 0) !important',
                      fontWeight: '600',
                      marginBottom: '8px',
                      fontSize: '16px'
                    }}
                  >
                    💡 Progress Tracking Tips
                  </h5>
                  <div 
                    style={{ 
                      color: 'rgb(0, 0, 0) !important',
                      fontSize: '14px',
                      lineHeight: '1.6'
                    }}
                  >
                    <div style={{ color: 'rgb(0, 0, 0) !important', marginBottom: '6px' }}>
                      • Weigh yourself at the same time each day (preferably morning)
                    </div>
                    <div style={{ color: 'rgb(0, 0, 0) !important', marginBottom: '6px' }}>
                      • Track consistently for better trend analysis
                    </div>
                    <div style={{ color: 'rgb(0, 0, 0) !important', marginBottom: '6px' }}>
                      • Focus on overall trends rather than daily fluctuations
                    </div>
                    <div style={{ color: 'rgb(0, 0, 0) !important' }}>
                      • Use notes to track how you feel and what affects your progress
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      {showRescheduleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4 text-black">
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                  rows={3}
                  placeholder="Please explain why you need to reschedule..."
                />
              </div>
            </div>
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => handleRescheduleAppointment(showRescheduleModal)}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
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
            <h3 className="text-lg font-semibold mb-4 text-black">Cancel Appointment</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason for Cancellation
                </label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 text-black"
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
      {showFoodEntryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold text-gray-900">
                  Log Food Entry
                </h3>
                <button
                  onClick={() => setShowFoodEntryModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleFoodEntrySubmit} className="space-y-6">
                {/* Meal Type & Date */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Meal Type
                    </label>
                    <select
                      value={foodEntryForm.mealType}
                      onChange={(e) =>
                        setFoodEntryForm({
                          ...foodEntryForm,
                          mealType: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                      required
                    >
                      <option value="BREAKFAST">Breakfast</option>
                      <option value="LUNCH">Lunch</option>
                      <option value="DINNER">Dinner</option>
                      <option value="SNACK">Snack</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Date
                    </label>
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      max={new Date().toISOString().split("T")[0]}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                      required
                    />
                  </div>
                </div>

                {/* Food Details */}
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                    <Apple className="h-5 w-5 mr-2 text-blue-600" />
                    Food Details
                  </h4>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Food Name
                      </label>
                      <input
                        type="text"
                        value={foodEntryForm.foodName}
                        onChange={(e) =>
                          setFoodEntryForm({
                            ...foodEntryForm,
                            foodName: e.target.value,
                          })
                        }
                        placeholder="e.g., Grilled Chicken Breast, Oatmeal, Apple"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Quantity
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          value={foodEntryForm.quantity}
                          onChange={(e) =>
                            setFoodEntryForm({
                              ...foodEntryForm,
                              quantity: e.target.value,
                            })
                          }
                          placeholder="e.g., 150"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Unit
                        </label>
                        <select
                          value={foodEntryForm.unit}
                          onChange={(e) =>
                            setFoodEntryForm({
                              ...foodEntryForm,
                              unit: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                          required
                        >
                          <option value="grams">grams</option>
                          <option value="oz">oz</option>
                          <option value="cups">cups</option>
                          <option value="pieces">pieces</option>
                          <option value="slices">slices</option>
                          <option value="tbsp">tbsp</option>
                          <option value="tsp">tsp</option>
                          <option value="ml">ml</option>
                          <option value="fl oz">fl oz</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Nutrition Information */}
                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                    <TrendingUp className="h-5 w-5 mr-2 text-green-600" />
                    Nutrition Information
                  </h4>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Calories
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={foodEntryForm.calories}
                        onChange={(e) =>
                          setFoodEntryForm({
                            ...foodEntryForm,
                            calories: e.target.value,
                          })
                        }
                        placeholder="e.g., 350"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Protein (g)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={foodEntryForm.protein}
                        onChange={(e) =>
                          setFoodEntryForm({
                            ...foodEntryForm,
                            protein: e.target.value,
                          })
                        }
                        placeholder="e.g., 25.5"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Carbs (g)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={foodEntryForm.carbs}
                        onChange={(e) =>
                          setFoodEntryForm({
                            ...foodEntryForm,
                            carbs: e.target.value,
                          })
                        }
                        placeholder="e.g., 45.2"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Fat (g)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={foodEntryForm.fat}
                        onChange={(e) =>
                          setFoodEntryForm({
                            ...foodEntryForm,
                            fat: e.target.value,
                          })
                        }
                        placeholder="e.g., 8.3"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Notes Section */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes (Optional)
                  </label>
                  <textarea
                    value={foodEntryForm.notes}
                    onChange={(e) =>
                      setFoodEntryForm({
                        ...foodEntryForm,
                        notes: e.target.value,
                      })
                    }
                    placeholder="Any additional notes about this food (preparation method, brand, etc.)"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-black"
                  />
                </div>

                {/* Submit Actions */}
                <div className="flex gap-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => setShowFoodEntryModal(false)}
                    className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Log Food Entry
                  </button>
                </div>
              </form>

              {/* Food Logging Tips */}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h5 className="font-medium text-gray-900 mb-2">
                  🍎 Food Logging Tips
                </h5>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Use a food scale for more accurate portion sizes</li>
                  <li>
                    • Check nutrition labels or use a nutrition database for
                    accurate values
                  </li>
                  <li>
                    • Log meals as soon as possible while details are fresh
                  </li>
                  <li>
                    • Include cooking methods and ingredients for complete
                    tracking
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-black placeholder-gray-400"
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
                    📅 Workout Date
                  </label>
                  <input
                    type="date"
                    value={workoutLogDate}
                    onChange={(e) => setWorkoutLogDate(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black bg-white"
                  />
                  <p className="text-xs text-gray-600 mt-1">
                    Select the date when you performed this workout
                  </p>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-blue-800">
                    📈 Log your weights and reps for each exercise. This data
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
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black placeholder-gray-400"
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
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black placeholder-gray-400"
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
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black placeholder-gray-400"
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
                          alert(
                            "Please log at least one exercise before submitting.",
                          );
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
                          alert(
                            "Workout progress saved successfully! Your trainer can now see your improvements.",
                          );
                          setShowWorkoutLogModal(null);
                          setWorkoutLogData({});
                        } else {
                          const error = await response.json();
                          alert(
                            error.error ||
                              "Failed to save workout progress. Please try again.",
                          );
                        }
                      } catch (error) {
                        console.error("Error saving workout progress:", error);
                        alert(
                          "Error saving workout progress. Please try again.",
                        );
                      }
                    }}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
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
