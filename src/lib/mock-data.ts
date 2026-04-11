import { ExerciseSet, Task, Workout, WorkoutWithExercises } from "./types";

const getDateOffset = (days: number): string => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().split("T")[0];
};

const today = getDateOffset(0);
const yesterday = getDateOffset(-1);
const twoDaysAgo = getDateOffset(-2);
const threeDaysAgo = getDateOffset(-3);
const fourDaysAgo = getDateOffset(-4);
const fiveDaysAgo = getDateOffset(-5);
const tomorrow = getDateOffset(1);
const inTwoDays = getDateOffset(2);
const inFourDays = getDateOffset(4);

export const mockTasks: Task[] = [
  // ── DAILY RECURRING TASKS ──────────────────────────────────────────────────
  {
    id: "mock-1",
    title: "Morning meditation",
    type: "daily",
    priority: null,
    due_date: null,
    is_completed: false,
    completed_at: null,
    target_value: null,
    unit: null,
    created_at: fiveDaysAgo,
    updated_at: today,
  },
  {
    id: "mock-2",
    title: "Exercise",
    type: "daily",
    priority: "high",
    due_date: null,
    is_completed: false,
    completed_at: null,
    target_value: null,
    unit: null,
    created_at: fiveDaysAgo,
    updated_at: today,
  },
  {
    id: "mock-3",
    title: "Read for 30 minutes",
    type: "daily",
    priority: null,
    due_date: null,
    is_completed: false,
    completed_at: null,
    target_value: null,
    unit: null,
    created_at: fiveDaysAgo,
    updated_at: today,
  },
  {
    id: "mock-4",
    title: "Review daily goals",
    type: "daily",
    priority: "medium",
    due_date: null,
    is_completed: false,
    completed_at: null,
    target_value: null,
    unit: null,
    created_at: fiveDaysAgo,
    updated_at: today,
  },
  {
    id: "mock-6",
    title: "Evening journal",
    type: "daily",
    priority: null,
    due_date: null,
    is_completed: false,
    completed_at: null,
    target_value: null,
    unit: null,
    created_at: fiveDaysAgo,
    updated_at: today,
  },

  // ── TRACKED DAILY TASKS (with amount targets) ──────────────────────────────
  {
    id: "mock-q1",
    title: "Drink water",
    type: "daily",
    priority: null,
    due_date: null,
    is_completed: false,
    completed_at: null,
    target_value: 2000,
    unit: "ml",
    created_at: fiveDaysAgo,
    updated_at: today,
  },
  {
    id: "mock-q2",
    title: "Walk",
    type: "daily",
    priority: "low",
    due_date: null,
    is_completed: false,
    completed_at: null,
    target_value: 8000,
    unit: "steps",
    created_at: fiveDaysAgo,
    updated_at: today,
  },

  // ── ONE-TIME TASKS ─────────────────────────────────────────────────────────
  {
    id: "mock-7",
    title: "Send weekly status report",
    type: "one_time",
    priority: "medium",
    due_date: fiveDaysAgo,
    is_completed: true,
    completed_at: fiveDaysAgo + "T09:00:00Z",
    target_value: null,
    unit: null,
    created_at: fiveDaysAgo,
    updated_at: fiveDaysAgo,
  },
  {
    id: "mock-8",
    title: "Submit expense report",
    type: "one_time",
    priority: "high",
    due_date: fourDaysAgo,
    is_completed: false,
    completed_at: null,
    target_value: null,
    unit: null,
    created_at: fiveDaysAgo,
    updated_at: fourDaysAgo,
  },
  {
    id: "mock-9",
    title: "Prepare team meeting agenda",
    type: "one_time",
    priority: null,
    due_date: threeDaysAgo,
    is_completed: true,
    completed_at: threeDaysAgo + "T10:00:00Z",
    target_value: null,
    unit: null,
    created_at: fiveDaysAgo,
    updated_at: threeDaysAgo,
  },
  {
    id: "mock-10",
    title: "Schedule dentist appointment",
    type: "one_time",
    priority: "low",
    due_date: twoDaysAgo,
    is_completed: false,
    completed_at: null,
    target_value: null,
    unit: null,
    created_at: fiveDaysAgo,
    updated_at: twoDaysAgo,
  },
  {
    id: "mock-11",
    title: "Reply to client proposal email",
    type: "one_time",
    priority: "high",
    due_date: yesterday,
    is_completed: false,
    completed_at: null,
    target_value: null,
    unit: null,
    created_at: fiveDaysAgo,
    updated_at: yesterday,
  },
  {
    id: "mock-12",
    title: "Review pull requests",
    type: "one_time",
    priority: "medium",
    due_date: today,
    is_completed: false,
    completed_at: null,
    target_value: null,
    unit: null,
    created_at: yesterday,
    updated_at: today,
  },
  {
    id: "mock-13",
    title: "Call insurance provider",
    type: "one_time",
    priority: null,
    due_date: tomorrow,
    is_completed: false,
    completed_at: null,
    target_value: null,
    unit: null,
    created_at: today,
    updated_at: today,
  },
  {
    id: "mock-14",
    title: "Buy groceries for dinner party",
    type: "one_time",
    priority: "low",
    due_date: inTwoDays,
    is_completed: false,
    completed_at: null,
    target_value: null,
    unit: null,
    created_at: today,
    updated_at: today,
  },
  {
    id: "mock-15",
    title: "Finalize Q2 project spec",
    type: "one_time",
    priority: "high",
    due_date: inFourDays,
    is_completed: false,
    completed_at: null,
    target_value: null,
    unit: null,
    created_at: today,
    updated_at: today,
  },
];

type MockTaskCompletion = {
  task_id: string;
  date: string;
  value: number | null;
};

const buildDailyCompletionEntries = (
  taskId: string,
  dayOffsets: number[]
): MockTaskCompletion[] => {
  return dayOffsets.map((offset) => ({
    task_id: taskId,
    date: getDateOffset(offset),
    value: null,
  }));
};

const buildTrackedEntries = (
  taskId: string,
  dailyValues: Array<{ offset: number; value: number }>
): MockTaskCompletion[] => {
  return dailyValues.map(({ offset, value }) => ({
    task_id: taskId,
    date: getDateOffset(offset),
    value,
  }));
};

export const mockTaskCompletions: MockTaskCompletion[] = [
  ...buildDailyCompletionEntries("mock-1", [-34, -33, -31, -29, -26, -24, -21, -17, -13, -8, -6, -3, -2, -1]),
  ...buildDailyCompletionEntries("mock-2", [-34, -32, -30, -28, -27, -25, -22, -20, -18, -16, -14, -11, -9, -7, -5, -4, -2]),
  ...buildDailyCompletionEntries("mock-3", [-35, -34, -33, -29, -28, -24, -23, -21, -17, -16, -15, -10, -8, -7, -3]),
  ...buildDailyCompletionEntries("mock-4", [-33, -30, -27, -24, -21, -19, -15, -12, -9, -6, -3, -1]),
  ...buildDailyCompletionEntries("mock-6", [-35, -31, -30, -26, -22, -21, -18, -14, -13, -12, -9, -8, -5, -4, -2]),
  ...buildTrackedEntries("mock-q1", [
    { offset: -13, value: 1800 },
    { offset: -12, value: 2200 },
    { offset: -11, value: 1600 },
    { offset: -10, value: 2100 },
    { offset: -9, value: 1900 },
    { offset: -8, value: 2500 },
    { offset: -7, value: 2000 },
    { offset: -6, value: 1700 },
    { offset: -5, value: 2300 },
    { offset: -4, value: 2100 },
    { offset: -3, value: 1950 },
    { offset: -2, value: 2400 },
    { offset: -1, value: 2050 },
    { offset: 0, value: 1850 },
  ]),
  ...buildTrackedEntries("mock-q2", [
    { offset: -13, value: 6400 },
    { offset: -12, value: 8200 },
    { offset: -11, value: 7700 },
    { offset: -10, value: 9100 },
    { offset: -9, value: 6800 },
    { offset: -8, value: 10300 },
    { offset: -7, value: 8900 },
    { offset: -6, value: 7200 },
    { offset: -5, value: 8600 },
    { offset: -4, value: 9400 },
    { offset: -3, value: 8100 },
    { offset: -2, value: 9700 },
    { offset: -1, value: 8800 },
    { offset: 0, value: 7600 },
  ]),
];

const buildWorkout = (
  id: string,
  name: string,
  dayOffset: number,
  hourUTC: number,
  durationSeconds: number,
  totalSets: number,
  totalVolumeKg: number
): Workout => {
  const date = getDateOffset(dayOffset);
  const startedAt = `${date}T${String(hourUTC).padStart(2, "0")}:15:00Z`;
  const endedDate = new Date(startedAt);
  endedDate.setSeconds(endedDate.getSeconds() + durationSeconds);

  return {
    id,
    name,
    started_at: startedAt,
    ended_at: endedDate.toISOString(),
    duration_seconds: durationSeconds,
    total_sets: totalSets,
    total_volume_kg: totalVolumeKg,
    notes: null,
    created_at: startedAt,
    updated_at: endedDate.toISOString(),
  };
};

export const mockWorkouts: Workout[] = [
  buildWorkout("mock-workout-1", "Push Day", -20, 18, 3500, 14, 8320),
  buildWorkout("mock-workout-2", "Pull Day", -14, 18, 3600, 15, 8940),
  buildWorkout("mock-workout-3", "Leg Day", -9, 18, 4100, 16, 10440),
  buildWorkout("mock-workout-4", "Upper Body", -5, 18, 3300, 13, 7750),
  buildWorkout("mock-workout-5", "Full Body", -2, 18, 3850, 15, 9360),
  buildWorkout("mock-workout-6", "Push Day", -1, 18, 3450, 14, 8210),
];

const createSet = (
  workoutId: string,
  exerciseId: string,
  setOrder: number,
  reps: number,
  weightKg: number
): ExerciseSet => ({
  id: `${workoutId}-${exerciseId}-set-${setOrder}`,
  workout_exercise_id: `${workoutId}-${exerciseId}`,
  set_order: setOrder,
  reps,
  weight_kg: weightKg,
  created_at: new Date().toISOString(),
});

const createExerciseBlock = (
  workoutId: string,
  exerciseOrder: number,
  exerciseName: string,
  setSpecs: Array<{ reps: number; weight_kg: number }>
) => {
  const exerciseId = exerciseName.toLowerCase().replace(/\s+/g, "-");
  return {
    id: `${workoutId}-${exerciseId}`,
    workout_id: workoutId,
    exercise_id: exerciseId,
    exercise_order: exerciseOrder,
    created_at: new Date().toISOString(),
    exercise: {
      id: exerciseId,
      name: exerciseName,
      name_lower: exerciseName.toLowerCase(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    sets: setSpecs.map((set, idx) => createSet(workoutId, exerciseId, idx + 1, set.reps, set.weight_kg)),
  };
};

const createWorkoutWithExercises = (
  workout: Workout,
  blocks: Array<{ name: string; sets: Array<{ reps: number; weight_kg: number }> }>
): WorkoutWithExercises => ({
  ...workout,
  workout_exercises: blocks.map((block, idx) =>
    createExerciseBlock(workout.id, idx + 1, block.name, block.sets)
  ),
});

export const mockWorkoutsWithExercises: WorkoutWithExercises[] = [
  createWorkoutWithExercises(mockWorkouts[0], [
    { name: "Barbell Bench Press", sets: [{ reps: 8, weight_kg: 70 }, { reps: 8, weight_kg: 70 }, { reps: 7, weight_kg: 72.5 }] },
    { name: "Incline Dumbbell Press", sets: [{ reps: 10, weight_kg: 26 }, { reps: 9, weight_kg: 26 }, { reps: 8, weight_kg: 28 }] },
    { name: "Cable Triceps Pushdown", sets: [{ reps: 12, weight_kg: 27.5 }, { reps: 12, weight_kg: 30 }, { reps: 10, weight_kg: 32.5 }] },
  ]),
  createWorkoutWithExercises(mockWorkouts[1], [
    { name: "Lat Pulldown", sets: [{ reps: 10, weight_kg: 55 }, { reps: 10, weight_kg: 57.5 }, { reps: 8, weight_kg: 60 }] },
    { name: "Seated Cable Row", sets: [{ reps: 12, weight_kg: 50 }, { reps: 10, weight_kg: 55 }, { reps: 10, weight_kg: 55 }] },
    { name: "Dumbbell Curl", sets: [{ reps: 12, weight_kg: 14 }, { reps: 10, weight_kg: 16 }, { reps: 9, weight_kg: 16 }] },
  ]),
  createWorkoutWithExercises(mockWorkouts[2], [
    { name: "Back Squat", sets: [{ reps: 6, weight_kg: 90 }, { reps: 6, weight_kg: 95 }, { reps: 5, weight_kg: 100 }] },
    { name: "Romanian Deadlift", sets: [{ reps: 8, weight_kg: 90 }, { reps: 8, weight_kg: 95 }, { reps: 8, weight_kg: 95 }] },
    { name: "Leg Press", sets: [{ reps: 12, weight_kg: 180 }, { reps: 12, weight_kg: 200 }, { reps: 10, weight_kg: 210 }] },
  ]),
  createWorkoutWithExercises(mockWorkouts[3], [
    { name: "Overhead Press", sets: [{ reps: 8, weight_kg: 45 }, { reps: 7, weight_kg: 47.5 }, { reps: 6, weight_kg: 50 }] },
    { name: "Chest-Supported Row", sets: [{ reps: 10, weight_kg: 36 }, { reps: 10, weight_kg: 38 }, { reps: 9, weight_kg: 40 }] },
    { name: "Lateral Raise", sets: [{ reps: 14, weight_kg: 10 }, { reps: 13, weight_kg: 10 }, { reps: 12, weight_kg: 12 }] },
  ]),
  createWorkoutWithExercises(mockWorkouts[4], [
    { name: "Trap Bar Deadlift", sets: [{ reps: 6, weight_kg: 110 }, { reps: 6, weight_kg: 115 }, { reps: 5, weight_kg: 120 }] },
    { name: "Push-up", sets: [{ reps: 18, weight_kg: 0 }, { reps: 16, weight_kg: 0 }, { reps: 14, weight_kg: 0 }] },
    { name: "Walking Lunges", sets: [{ reps: 12, weight_kg: 18 }, { reps: 12, weight_kg: 18 }, { reps: 10, weight_kg: 20 }] },
  ]),
  createWorkoutWithExercises(mockWorkouts[5], [
    { name: "Machine Chest Press", sets: [{ reps: 10, weight_kg: 55 }, { reps: 10, weight_kg: 57.5 }, { reps: 9, weight_kg: 60 }] },
    { name: "Dips (Assisted)", sets: [{ reps: 10, weight_kg: 20 }, { reps: 9, weight_kg: 18 }, { reps: 8, weight_kg: 16 }] },
    { name: "Skull Crushers", sets: [{ reps: 12, weight_kg: 25 }, { reps: 11, weight_kg: 27.5 }, { reps: 10, weight_kg: 27.5 }] },
  ]),
];

export const filterOptions = [
  { value: "all", label: "All Tasks" },
  { value: "daily", label: "Daily Only" },
  { value: "one_time", label: "One-Time Only" },
  { value: "tracked", label: "Tracked Only" },
  { value: "completed", label: "Completed" },
  { value: "incomplete", label: "Incomplete" },
  { value: "overdue", label: "Overdue" },
];
