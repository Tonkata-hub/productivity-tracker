import { Task, TaskWithStatus, DayTasks } from "./types";

export function getWeekDates(baseDate: Date = new Date()): Date[] {
  const dates: Date[] = [];
  const current = new Date(baseDate);

  // Get Monday of the current week
  const day = current.getDay();
  const diff = current.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
  current.setDate(diff);

  // Generate 7 days starting from Monday
  for (let i = 0; i < 7; i++) {
    const date = new Date(current);
    date.setDate(current.getDate() + i);
    dates.push(date);
  }

  return dates;
}

export function formatDateISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatLocalDateFromTimestamp(timestamp: string | null): string | null {
  if (!timestamp) return null;
  return formatDateISO(new Date(timestamp));
}

export function getTaskStatusForDate(
  task: Task,
  dateISO: string,
  completions: Set<string> = new Set(),
  quantValues: Map<string, number> = new Map()
): TaskWithStatus {
  const today = formatDateISO(new Date());

  let isCompleted = false;
  let isOverdue = false;
  let isDueToday = false;
  let currentValue = 0;

  if (task.target_value != null) {
    // Tracked task: completion is determined by logged amount vs target
    currentValue = quantValues.get(`${task.id}:${dateISO}`) ?? 0;
    isCompleted = currentValue >= task.target_value;
  } else if (task.type === "one_time") {
    isCompleted = task.is_completed;
  } else if (task.type === "daily") {
    isCompleted = completions.has(`${task.id}:${dateISO}`);
  }

  // Date-based flags for one-time tasks (applies whether tracked or not)
  if (task.type === "one_time") {
    isDueToday = task.due_date === today;
    isOverdue = !!task.due_date && task.due_date < today;
  }

  return {
    ...task,
    isCompleted,
    isOverdue,
    isDueToday,
    currentValue,
  };
}

export function getTasksForDate(
  tasks: Task[],
  dateISO: string,
  completions: Set<string> = new Set(),
  quantValues: Map<string, number> = new Map()
): TaskWithStatus[] {
  const result: TaskWithStatus[] = [];
  const today = formatDateISO(new Date());

  for (const task of tasks) {
    if (task.type === "daily") {
      // Only show daily tasks from the day they were created onwards (local time)
      const createdDate = formatDateISO(new Date(task.created_at));
      if (dateISO < createdDate) continue;
      result.push(getTaskStatusForDate(task, dateISO, completions, quantValues));
    } else if (task.type === "one_time") {
      let shouldShow = false;

      if (task.is_completed) {
        // Show on the day it was actually completed
        const completedDate = formatLocalDateFromTimestamp(task.completed_at) ?? task.due_date;
        shouldShow = completedDate === dateISO;
      } else if (task.due_date && task.due_date < today) {
        // Overdue and not completed: only show on today
        shouldShow = dateISO === today;
      } else {
        // Not overdue: show on due date and on today
        shouldShow = task.due_date === dateISO || dateISO === today;
      }

      if (shouldShow) {
        result.push(getTaskStatusForDate(task, dateISO, completions, quantValues));
      }
    }
  }

  const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
  const getPriority = (t: TaskWithStatus) => priorityOrder[t.priority ?? ""] ?? 3;

  return result.sort((a, b) => {
    // Overdue first (keep overdue one-time tasks in this bucket even after completion)
    const aOverdue = a.type === "one_time" && !!a.due_date && a.due_date < today ? 0 : 1;
    const bOverdue = b.type === "one_time" && !!b.due_date && b.due_date < today ? 0 : 1;
    if (aOverdue !== bOverdue) return aOverdue - bOverdue;

    // Due today second
    const aToday = a.isDueToday && !a.isCompleted ? 0 : 1;
    const bToday = b.isDueToday && !b.isCompleted ? 0 : 1;
    if (aToday !== bToday) return aToday - bToday;

    // Daily before one_time
    const aType = a.type === "daily" ? 0 : 1;
    const bType = b.type === "daily" ? 0 : 1;
    if (aType !== bType) return aType - bType;

    // Within same group, sort by priority
    return getPriority(a) - getPriority(b);
  });
}

export function generateWeekData(
  tasks: Task[],
  weekDates: Date[],
  completions: Set<string> = new Set(),
  quantValues: Map<string, number> = new Map()
): DayTasks[] {
  const today = formatDateISO(new Date());
  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return weekDates.map((date, index) => {
    const dateISO = formatDateISO(date);
    return {
      date: dateISO,
      dayName: dayNames[index],
      dayNumber: date.getDate(),
      isToday: dateISO === today,
      isPast: dateISO < today,
      isFuture: dateISO > today,
      tasks: getTasksForDate(tasks, dateISO, completions, quantValues),
    };
  });
}

export function filterTasks(tasks: TaskWithStatus[], filter: string): TaskWithStatus[] {
  switch (filter) {
    case "daily":
      return tasks.filter((t) => t.type === "daily");
    case "one_time":
      return tasks.filter((t) => t.type === "one_time");
    case "tracked":
      return tasks.filter((t) => t.target_value != null);
    case "completed":
      return tasks.filter((t) => t.isCompleted);
    case "incomplete":
      return tasks.filter((t) => !t.isCompleted);
    case "overdue":
      return tasks.filter((t) => t.isOverdue);
    default:
      return tasks;
  }
}

export function getWeekRangeLabel(weekDates: Date[]): string {
  if (weekDates.length < 7) return "";

  const first = weekDates[0];
  const last = weekDates[6];

  const formatOptions: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
  };

  const firstStr = first.toLocaleDateString("en-US", formatOptions);
  const lastStr = last.toLocaleDateString("en-US", {
    ...formatOptions,
    year: "numeric",
  });

  return `${firstStr} - ${lastStr}`;
}

export function getMonthDates(baseDate: Date = new Date()): Date[] {
  const dates: Date[] = [];
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();

  // Get first day of the month
  const firstDay = new Date(year, month, 1);
  // Get the weekday (0 = Sunday, convert to Monday-based: 0 = Monday)
  let startDayOfWeek = firstDay.getDay();
  startDayOfWeek = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1; // Convert to Monday-based

  // Add days from previous month to fill the first week
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const date = new Date(year, month, -i);
    dates.push(date);
  }

  // Add all days of the current month
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let i = 1; i <= daysInMonth; i++) {
    dates.push(new Date(year, month, i));
  }

  // Add days from next month to complete the last week
  const remainingDays = 7 - (dates.length % 7);
  if (remainingDays < 7) {
    for (let i = 1; i <= remainingDays; i++) {
      dates.push(new Date(year, month + 1, i));
    }
  }

  return dates;
}

export function getMonthLabel(baseDate: Date): string {
  return baseDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export function getWeekOffsetForDate(targetDate: Date): number {
  const today = new Date();
  const todayMonday = new Date(today);
  const todayDay = today.getDay();
  todayMonday.setDate(today.getDate() - (todayDay === 0 ? 6 : todayDay - 1));
  todayMonday.setHours(0, 0, 0, 0);

  const targetMonday = new Date(targetDate);
  const targetDay = targetDate.getDay();
  targetMonday.setDate(targetDate.getDate() - (targetDay === 0 ? 6 : targetDay - 1));
  targetMonday.setHours(0, 0, 0, 0);

  const diffTime = targetMonday.getTime() - todayMonday.getTime();
  const diffWeeks = Math.round(diffTime / (7 * 24 * 60 * 60 * 1000));

  return diffWeeks;
}
