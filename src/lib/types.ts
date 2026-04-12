export type TaskType = "daily" | "one_time";
export type TaskPriority = "low" | "medium" | "high";

export interface Task {
  id: string;
  title: string;
  type: TaskType;
  priority: TaskPriority | null;
  due_date: string | null; // ISO date string, only for one_time tasks
  is_completed: boolean; // only meaningful for one_time tasks
  completed_at: string | null; // ISO timestamp, only meaningful for one_time tasks
  created_at: string;
  updated_at: string;
  target_value: number | null; // only for quantitative tasks
  unit: string | null; // only for quantitative tasks (e.g. 'ml', 'steps')
}

export interface TaskCompletion {
  id: string;
  task_id: string;
  date: string; // ISO date string
  completed_at: string; // ISO timestamp
  created_at: string;
  value: number | null; // only for quantitative tasks (amount logged per entry)
}

export interface DayTasks {
  date: string;
  dayName: string;
  dayNumber: number;
  isToday: boolean;
  isPast: boolean;
  isFuture: boolean;
  tasks: TaskWithStatus[];
}

export interface TaskWithStatus extends Task {
  isCompleted: boolean;
  isOverdue: boolean;
  isDueToday: boolean;
  currentValue: number; // 0 for daily/one_time; running sum of logs for quantitative
}

// Gym/Workout Types
export interface Exercise {
  id: string;
  name: string;
  name_lower: string;
  created_at: string;
  updated_at: string;
}

export interface Workout {
  id: string;
  name: string | null;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  total_sets: number;
  total_volume_kg: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkoutExercise {
  id: string;
  workout_id: string;
  exercise_id: string;
  exercise_order: number;
  created_at: string;
  exercise?: Exercise;
  sets?: ExerciseSet[];
}

export interface ExerciseSet {
  id: string;
  workout_exercise_id: string;
  set_order: number;
  reps: number;
  weight_kg: number;
  created_at: string;
}

export interface WorkoutWithExercises extends Workout {
  workout_exercises: (WorkoutExercise & {
    exercise: Exercise;
    sets: ExerciseSet[];
  })[];
}

export interface LastExercisePerformance {
  workout_date: string;
  sets: {
    set_order: number;
    reps: number;
    weight_kg: number;
  }[];
}

export interface PlannerBlock {
  id: string;
  date: string;               // ISO date "YYYY-MM-DD"
  start_minutes: number;      // minutes from midnight (e.g. 480 = 8:00 AM)
  duration_minutes: number;
  title: string;
  task_id: string | null;
  task_type: string | null;   // cached 'daily' | 'one_time'
  is_completed: boolean;
  created_at: string;
}
