export interface User {
  id: string
  email: string
  name: string
  role: 'CLIENT' | 'TRAINER'
  avatar?: string
  createdAt: Date
  updatedAt: Date
}

export interface Client extends User {
  role: 'CLIENT'
  trainerId?: string
  profile?: ClientProfile
}

export interface Trainer extends User {
  role: 'TRAINER'
  specializations: string[]
  experience: number
  certification: string[]
  clients: Client[]
}

export interface ClientProfile {
  id: string
  clientId: string
  age: number
  height: number // in cm
  weight: number // in kg
  fitnessGoals: string[]
  fitnessLevel: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'
  medicalConditions: string[]
  preferences: string[]
  createdAt: Date
  updatedAt: Date
}

export interface Workout {
  id: string
  title: string
  description: string
  duration: number // in minutes
  difficulty: 'EASY' | 'MODERATE' | 'HARD'
  exercises: Exercise[]
  assignedTo?: string[] // client IDs
  createdBy: string // trainer ID
  createdAt: Date
  updatedAt: Date
}

export interface Exercise {
  id: string
  name: string
  description: string
  sets: number
  reps: number
  weight?: number
  duration?: number // for time-based exercises
  restTime: number // in seconds
  muscleGroups: string[]
  equipment: string[]
  instructions: string[]
  videoUrl?: string
  imageUrl?: string
}

export interface MealPlan {
  id: string
  title: string
  description: string
  meals: Meal[]
  assignedTo?: string[] // client IDs
  createdBy: string // trainer ID
  totalCalories: number
  macros: {
    protein: number
    carbs: number
    fats: number
  }
  createdAt: Date
  updatedAt: Date
}

export interface Meal {
  id: string
  name: string
  type: 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK'
  foods: Food[]
  calories: number
  macros: {
    protein: number
    carbs: number
    fats: number
  }
  instructions: string[]
}

export interface Food {
  id: string
  name: string
  quantity: number
  unit: string
  calories: number
  macros: {
    protein: number
    carbs: number
    fats: number
  }
}

export interface ProgressEntry {
  id: string
  clientId: string
  date: Date
  weight?: number
  bodyFat?: number
  measurements?: {
    chest?: number
    waist?: number
    hips?: number
    arms?: number
    thighs?: number
  }
  photos?: string[] // URLs to progress photos
  notes?: string
  workoutCompleted?: boolean
  workoutId?: string
  moodRating?: number // 1-10
  energyLevel?: number // 1-10
  createdAt: Date
}

export interface Message {
  id: string
  senderId: string
  receiverId: string
  content: string
  type: 'TEXT' | 'IMAGE' | 'FILE'
  attachments?: string[]
  read: boolean
  createdAt: Date
}

export interface Notification {
  id: string
  userId: string
  title: string
  message: string
  type: 'WORKOUT_ASSIGNED' | 'MEAL_PLAN_ASSIGNED' | 'MESSAGE_RECEIVED' | 'PROGRESS_REMINDER' | 'GENERAL'
  read: boolean
  actionUrl?: string
  createdAt: Date
}

export interface WorkoutSession {
  id: string
  workoutId: string
  clientId: string
  startTime: Date
  endTime?: Date
  completed: boolean
  exerciseProgress: ExerciseProgress[]
  notes?: string
  rating?: number // 1-5 stars
}

export interface ExerciseProgress {
  exerciseId: string
  setsCompleted: number
  repsPerSet: number[]
  weightsUsed: number[]
  restTimes: number[]
  notes?: string
}

export interface Appointment {
  id: string
  clientId: string
  trainerId: string
  title: string
  description?: string
  type: 'TRAINING_SESSION' | 'CHECK_IN' | 'NUTRITION_CONSULTATION' | 'ASSESSMENT' | 'FOLLOW_UP'
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW'
  startTime: Date
  endTime: Date
  duration: number // in minutes
  location?: string
  notes?: string
  cancelReason?: string
  createdAt: Date
  updatedAt: Date
  client?: {
    id: string
    name: string
    email: string
  }
  trainer?: {
    id: string
    name: string
    email: string
  }
}

export interface ContactSubmission {
  id: string
  name: string
  email: string
  phone?: string
  message: string
  age?: string
  fitnessLevel?: string
  fitnessGoals?: string
  currentActivity?: string
  injuries?: string
  availability?: string
  status: 'NEW' | 'IN_PROGRESS' | 'CONTACTED' | 'INVITED' | 'COMPLETED'
  createdAt: Date
  updatedAt: Date
}