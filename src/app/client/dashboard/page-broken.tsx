"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { motion } from "framer-motion";
import {
  Activity,
  Calendar,
  TrendingUp,
  Dumbbell,
  Target,
  ChevronRight,
  Plus,
  Trash2,
  User,
  Bell,
  LogOut,
  Menu,
  X,
  Apple,
  Award,
} from "lucide-react";

// Types
interface WorkoutSet {
  reps: number;
  weight?: number;
  duration?: number;
  distance?: number;
}

interface Exercise {
  id: string;
  name: string;
  type: string;
  sets: WorkoutSet[];
  restTime?: number;
  notes?: string;
}

interface Workout {
  id: string;
  name: string;
  date: string;
  exercises: Exercise[];
  completed: boolean;
  duration?: number;
  notes?: string;
}

interface WorkoutSession {
  id: string;
  workout: Workout;
  completed: boolean;
  startTime: string;
  notes?: string;
}

interface FoodEntry {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  date: string;
  createdAt: string;
}

interface DailyTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface Notification {
  id: string;
  message: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
  createdAt: string;
  read: boolean;
}

export default function ClientDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("overview");
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [foodEntries, setFoodEntries] = useState<FoodEntry[]>([]);
  const [dailyTotals, setDailyTotals] = useState<DailyTotals>({
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
  });
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [newFoodEntry, setNewFoodEntry] = useState({
    name: "",
    calories: "",
    protein: "",
    carbs: "",
    fat: "",
  });
  const [isLoadingNutrition, setIsLoadingNutrition] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.push("/auth/signin");
      return;
    }
    if (session.user.role !== "CLIENT") {
      router.push("/auth/signin");
      return;
    }
  }, [session, status, router]);

  // Fetch data
  const fetchWorkouts = useCallback(async () => {
    try {
      const response = await fetch("/api/workouts");
      if (response.ok) {
        const data = await response.json();
        // Transform workout sessions to workouts for client dashboard
        // The API returns workoutSessions for clients, extract the workout data
        const transformedWorkouts = data.map((session: WorkoutSession) => ({
          ...session.workout,
          // Preserve session-specific properties
          completed: session.completed || false,
          sessionId: session.id,
          scheduledDate: session.startTime,
          notes: session.notes || session.workout?.notes,
          // Ensure exercises is always an array
          exercises: session.workout?.exercises || []
        }));
        setWorkouts(transformedWorkouts);
      }
    } catch (error) {
      console.error("Error fetching workouts:", error);
    }
  }, []);

  const fetchFoodEntries = useCallback(async () => {
    try {
      console.log("🍎 Fetching food entries for today...");
      const today = new Date().toISOString().split("T")[0];
      const response = await fetch(`/api/food-entries?date=${today}`);
      if (response.ok) {
        const data = await response.json();
        console.log("🍎 Food entries response:", data);
        setFoodEntries(data.entries || []);
        setDailyTotals(data.dailyTotals || { calories: 0, protein: 0, carbs: 0, fat: 0 });
      }
    } catch (error) {
      console.error("Error fetching food entries:", error);
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      const response = await fetch("/api/notifications");
      if (response.ok) {
        const data = await response.json();
        setNotifications(data);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  }, []);

  useEffect(() => {
    if (session) {
      fetchWorkouts();
      fetchFoodEntries();
      fetchNotifications();
    }
  }, [session, fetchWorkouts, fetchFoodEntries, fetchNotifications]);

  // Add food entry
  const handleAddFoodEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFoodEntry.name || !newFoodEntry.calories) return;

    setIsLoadingNutrition(true);
    try {
      console.log("🍎 Adding food entry:", newFoodEntry);
      const response = await fetch("/api/food-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newFoodEntry.name,
          calories: parseFloat(newFoodEntry.calories),
          protein: parseFloat(newFoodEntry.protein) || 0,
          carbs: parseFloat(newFoodEntry.carbs) || 0,
          fat: parseFloat(newFoodEntry.fat) || 0,
        }),
      });

      if (response.ok) {
        console.log("🍎 Food entry added successfully");
        setNewFoodEntry({ name: "", calories: "", protein: "", carbs: "", fat: "" });
        await fetchFoodEntries(); // Refresh the data
      } else {
        console.error("Failed to add food entry");
      }
    } catch (error) {
      console.error("Error adding food entry:", error);
    } finally {
      setIsLoadingNutrition(false);
    }
  };

  // Delete food entry
  const handleDeleteFoodEntry = async (id: string) => {
    try {
      const response = await fetch(`/api/food-entries?id=${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        await fetchFoodEntries(); // Refresh the data
      } else {
        console.error("Failed to delete food entry");
      }
    } catch (error) {
      console.error("Error deleting food entry:", error);
    }
  };

  const quickActionItems = [
    {
      title: "Start Workout",
      description: "Begin your next assigned workout",
      icon: Dumbbell,
      color: "bg-blue-500",
      onClick: () => {
        if (workouts.length > 0) {
          const nextWorkout = workouts.find((w) => !w.completed);
          if (nextWorkout) {
            setActiveTab("workouts");
          } else {
            alert("All workouts completed! Great job!");
          }
        } else {
          alert("No workouts assigned yet. Contact your trainer to get started!");
        }
      },
    },
    {
      title: "Log Meal",
      description: "Track your nutrition",
      icon: Apple,
      color: "bg-green-500",
      onClick: () => setActiveTab("nutrition"),
    },
    {
      title: "View Progress",
      description: "Check your fitness journey",
      icon: TrendingUp,
      color: "bg-purple-500",
      onClick: () => setActiveTab("progress"),
    },
    {
      title: "Schedule Session",
      description: "Book training with coach",
      icon: Calendar,
      color: "bg-orange-500",
      onClick: () => setActiveTab("schedule"),
    },
  ];

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0`}>
        <div className="flex items-center justify-between h-16 px-6 border-b">
          <h1 className="text-xl font-bold text-gray-900">FitTrack</h1>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="mt-8">
          <div className="px-6 mb-6">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-white" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">
                  {session.user.name || session.user.email}
                </p>
                <p className="text-xs text-gray-500">Client</p>
              </div>
            </div>
          </div>

          <div className="space-y-1 px-3">
            {[
              { id: "overview", label: "Overview", icon: Activity },
              { id: "workouts", label: "Workouts", icon: Dumbbell },
              { id: "nutrition", label: "Nutrition", icon: Apple },
              { id: "progress", label: "Progress", icon: TrendingUp },
              { id: "schedule", label: "Schedule", icon: Calendar },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === item.id
                    ? "bg-blue-100 text-blue-700"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                <item.icon className="w-5 h-5 mr-3" />
                {item.label}
              </button>
            ))}
          </div>

          <div className="absolute bottom-4 left-4 right-4">
            <button
              onClick={() => signOut()}
              className="w-full flex items-center px-3 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
            >
              <LogOut className="w-5 h-5 mr-3" />
              Sign Out
            </button>
          </div>
        </nav>
      </div>

      {/* Main Content */}
      <div className="lg:pl-64">
        {/* Header */}
        <header className="bg-white border-b border-gray-200">
          <div className="flex items-center justify-between h-16 px-6">
            <div className="flex items-center">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden mr-4"
              >
                <Menu className="w-6 h-6" />
              </button>
              <h2 className="text-xl font-semibold text-gray-900 capitalize">
                {activeTab}
              </h2>
            </div>

            <div className="flex items-center space-x-4">
              <button className="relative">
                <Bell className="w-6 h-6 text-gray-500" />
                {notifications.filter(n => !n.read).length > 0 && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
                )}
              </button>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="p-6">
          {activeTab === "overview" && (
            <div className="space-y-8">
              {/* Welcome Section */}
              <motion.div 
                className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl p-8 text-white"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <h1 className="text-3xl font-bold mb-2">
                  Welcome back, {session.user.name?.split(" ")[0] || "Champion"}!
                </h1>
                <p className="text-blue-100">
                  Ready to crush your fitness goals today?
                </p>
              </motion.div>

              {/* Quick Actions */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {quickActionItems.map((item, index) => (
                    <motion.div
                      key={item.title}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <button
                        onClick={item.onClick}
                        className="w-full bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow text-left group"
                      >
                        <div className={`w-12 h-12 ${item.color} rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                          <item.icon className="w-6 h-6 text-white" />
                        </div>
                        <h4 className="font-semibold text-gray-900 mb-1">{item.title}</h4>
                        <p className="text-sm text-gray-600">{item.description}</p>
                      </button>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Today's Summary */}
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

                  {workouts.length > 0 ? (
                    <div className="space-y-3">
                      {workouts.slice(0, 3).map((workout) => (
                        <div
                          key={workout.id}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                        >
                          <div>
                            <h4 className="font-medium text-gray-900">{workout.name}</h4>
                            <p className="text-sm text-gray-600">
                              {workout.exercises?.length || 0} exercises
                            </p>
                          </div>
                          <div className={`w-3 h-3 rounded-full ${workout.completed ? "bg-green-500" : "bg-yellow-500"}`}></div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Dumbbell className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">No workouts assigned yet</p>
                      <p className="text-sm text-gray-500 mt-1">
                        Contact your trainer to get started!
                      </p>
                    </div>
                  )}
                </motion.div>

                {/* Nutrition Summary */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 }}
                  className="bg-white rounded-xl p-6 shadow-sm"
                >
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Today&apos;s Nutrition
                    </h3>
                    <button
                      onClick={() => setActiveTab("nutrition")}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Calories</span>
                      <span className="font-semibold">{dailyTotals.calories}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Protein</span>
                      <span className="font-semibold">{dailyTotals.protein}g</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Carbs</span>
                      <span className="font-semibold">{dailyTotals.carbs}g</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Fat</span>
                      <span className="font-semibold">{dailyTotals.fat}g</span>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          )}

          {activeTab === "workouts" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900">Your Workouts</h1>
              </div>

              {workouts.length > 0 ? (
                <div className="grid grid-cols-1 gap-6">
                  {workouts.map((workout) => (
                    <motion.div
                      key={workout.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white rounded-xl p-6 shadow-sm"
                      transition={{ duration: 0.3 }}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            {workout.name}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {workout.exercises?.length || 0} exercises
                            {workout.duration && ` • ${workout.duration} min`}
                          </p>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                          workout.completed
                            ? "bg-green-100 text-green-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}>
                          {workout.completed ? "Completed" : "Pending"}
                        </div>
                      </div>

                      <div className="space-y-3">
                        {workout.exercises?.map((exercise) => (
                          <div
                            key={exercise.id}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                          >
                            <div>
                              <h4 className="font-medium text-gray-900">
                                {exercise.name}
                              </h4>
                              <p className="text-sm text-gray-600">
                                {exercise.sets?.length || 0} sets
                              </p>
                            </div>
                            <Target className="w-5 h-5 text-gray-400" />
                          </div>
                        )) || <p className="text-gray-500 text-sm">No exercises available</p>}
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Dumbbell className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No workouts assigned
                  </h3>
                  <p className="text-gray-600">
                    Your trainer will assign workouts for you soon!
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === "nutrition" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900">Nutrition Tracking</h1>
              </div>

              {/* Add Food Entry Form */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="bg-white rounded-xl p-6 shadow-sm"
              >
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Add Food Entry
                </h3>
                <form onSubmit={handleAddFoodEntry} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    <input
                      type="text"
                      placeholder="Food name"
                      value={newFoodEntry.name}
                      onChange={(e) =>
                        setNewFoodEntry({ ...newFoodEntry, name: e.target.value })
                      }
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                    <input
                      type="number"
                      placeholder="Calories"
                      value={newFoodEntry.calories}
                      onChange={(e) =>
                        setNewFoodEntry({ ...newFoodEntry, calories: e.target.value })
                      }
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                    <input
                      type="number"
                      step="0.1"
                      placeholder="Protein (g)"
                      value={newFoodEntry.protein}
                      onChange={(e) =>
                        setNewFoodEntry({ ...newFoodEntry, protein: e.target.value })
                      }
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="number"
                      step="0.1"
                      placeholder="Carbs (g)"
                      value={newFoodEntry.carbs}
                      onChange={(e) =>
                        setNewFoodEntry({ ...newFoodEntry, carbs: e.target.value })
                      }
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="number"
                      step="0.1"
                      placeholder="Fat (g)"
                      value={newFoodEntry.fat}
                      onChange={(e) =>
                        setNewFoodEntry({ ...newFoodEntry, fat: e.target.value })
                      }
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isLoadingNutrition}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    {isLoadingNutrition ? "Adding..." : "Add Food"}
                  </button>
                </form>
              </motion.div>

              {/* Daily Totals */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
                className="bg-white rounded-xl p-6 shadow-sm"
              >
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Today&apos;s Totals
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {dailyTotals.calories}
                    </div>
                    <div className="text-sm text-gray-600">Calories</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {dailyTotals.protein}g
                    </div>
                    <div className="text-sm text-gray-600">Protein</div>
                  </div>
                  <div className="text-center p-4 bg-orange-50 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">
                      {dailyTotals.carbs}g
                    </div>
                    <div className="text-sm text-gray-600">Carbs</div>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">
                      {dailyTotals.fat}g
                    </div>
                    <div className="text-sm text-gray-600">Fat</div>
                  </div>
                </div>
              </motion.div>

              {/* Food Entries List */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white rounded-xl p-6 shadow-sm"
              >
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Today&apos;s Food Entries
                </h3>
                {foodEntries.length > 0 ? (
                  <div className="space-y-3">
                    {foodEntries.map((entry) => (
                      <div
                        key={entry.id}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                      >
                        <div>
                          <h4 className="font-medium text-gray-900">{entry.name}</h4>
                          <p className="text-sm text-gray-600">
                            {entry.calories} cal • {entry.protein}g protein • {entry.carbs}g carbs • {entry.fat}g fat
                          </p>
                        </div>
                        <button
                          onClick={() => handleDeleteFoodEntry(entry.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Apple className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No food entries yet today</p>
                    <p className="text-sm text-gray-500 mt-1">
                      Add your first meal above to start tracking!
                    </p>
                  </div>
                )}
              </motion.div>
            </div>
          )}

          {activeTab === "progress" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900">Your Progress</h1>
              </div>

              <div className="text-center py-12">
                <Award className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Progress tracking coming soon
                </h3>
                <p className="text-gray-600">
                  We&apos;re working on detailed progress tracking features!
                </p>
              </div>
            </div>
          )}

          {activeTab === "schedule" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900">Schedule</h1>
              </div>

              <div className="text-center py-12">
                <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Scheduling coming soon
                </h3>
                <p className="text-gray-600">
                  Book sessions with your trainer directly from here!
                </p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}