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

export function getTaskStatusForDate(
	task: Task,
	dateISO: string,
	completions: Set<string> = new Set()
): TaskWithStatus {
	const today = formatDateISO(new Date());

	let isCompleted = false;
	let isOverdue = false;
	let isDueToday = false;

	if (task.type === "one_time") {
		isCompleted = task.is_completed;
		isDueToday = task.due_date === today;
		isOverdue = !!task.due_date && task.due_date < today && !task.is_completed;
	} else if (task.type === "daily") {
		isCompleted = completions.has(`${task.id}:${dateISO}`);
	}

	return {
		...task,
		isCompleted,
		isOverdue,
		isDueToday,
	};
}

export function getTasksForDate(
	tasks: Task[],
	dateISO: string,
	completions: Set<string> = new Set()
): TaskWithStatus[] {
	const result: TaskWithStatus[] = [];
	const today = formatDateISO(new Date());

	for (const task of tasks) {
		if (task.type === "daily") {
			result.push(getTaskStatusForDate(task, dateISO, completions));
		} else if (task.type === "one_time") {
			let shouldShow = false;

			if (task.is_completed) {
				// Show on the day it was actually completed
				const completedDate = task.completed_at ? task.completed_at.split("T")[0] : task.due_date;
				shouldShow = completedDate === dateISO;
			} else if (task.due_date && task.due_date < today) {
				// Overdue and not completed: only show on today
				shouldShow = dateISO === today;
			} else {
				// Not overdue: show on due date and on today
				shouldShow = task.due_date === dateISO || dateISO === today;
			}

			if (shouldShow) {
				result.push(getTaskStatusForDate(task, dateISO, completions));
			}
		}
	}

	return result;
}

export function generateWeekData(tasks: Task[], weekDates: Date[], completions: Set<string> = new Set()): DayTasks[] {
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
			tasks: getTasksForDate(tasks, dateISO, completions),
		};
	});
}

export function filterTasks(tasks: TaskWithStatus[], filter: string): TaskWithStatus[] {
	switch (filter) {
		case "daily":
			return tasks.filter((t) => t.type === "daily");
		case "one_time":
			return tasks.filter((t) => t.type === "one_time");
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
