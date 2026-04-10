import { Task, Workout } from "./types";

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
  buildWorkout("mock-workout-1", "Push Day", -33, 7, 3200, 15, 7650),
  buildWorkout("mock-workout-2", "Pull Day", -30, 18, 3400, 16, 8020),
  buildWorkout("mock-workout-3", "Leg Day", -27, 7, 3900, 18, 10480),
  buildWorkout("mock-workout-4", "Upper Body", -24, 18, 3000, 14, 7140),
  buildWorkout("mock-workout-5", "Full Body", -21, 7, 3600, 17, 9580),
  buildWorkout("mock-workout-6", "Push Day", -18, 18, 3350, 16, 8220),
  buildWorkout("mock-workout-7", "Pull Day", -15, 7, 3500, 16, 8470),
  buildWorkout("mock-workout-8", "Leg Day", -12, 18, 4100, 19, 11200),
  buildWorkout("mock-workout-9", "Upper Body", -9, 7, 3050, 14, 7360),
  buildWorkout("mock-workout-10", "Full Body", -6, 18, 3650, 17, 9760),
  buildWorkout("mock-workout-11", "Push Day", -3, 7, 3300, 15, 7890),
  buildWorkout("mock-workout-12", "Leg Day", -1, 18, 4000, 19, 10940),
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
