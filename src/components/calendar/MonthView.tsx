"use client";

import { useMemo } from "react";
import { Task, TaskWithStatus } from "@/lib/types";
import { getMonthDates, formatDateISO, getTasksForDate } from "@/lib/calendar-utils";
import { cn } from "@/lib/utils";

interface MonthViewProps {
	baseDate: Date;
	tasks: Task[];
	completions: Set<string>;
	onDayClick: (date: Date) => void;
}

const WEEKDAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];
const MAX_DOTS = 5;

export function MonthView({ baseDate, tasks, completions, onDayClick }: MonthViewProps) {
	const monthDates = useMemo(() => getMonthDates(baseDate), [baseDate]);
	const currentMonth = baseDate.getMonth();
	const todayISO = formatDateISO(new Date());

	// Group dates into weeks
	const weeks = useMemo(() => {
		const result: Date[][] = [];
		for (let i = 0; i < monthDates.length; i += 7) {
			result.push(monthDates.slice(i, i + 7));
		}
		return result;
	}, [monthDates]);

	// Get tasks for each day
	const dayTasksMap = useMemo(() => {
		const map = new Map<string, TaskWithStatus[]>();
		for (const date of monthDates) {
			const dateISO = formatDateISO(date);
			map.set(dateISO, getTasksForDate(tasks, dateISO, completions));
		}
		return map;
	}, [monthDates, tasks, completions]);

	return (
		<div className="animate-in fade-in slide-in-from-top-2 duration-300">
			{/* Weekday headers */}
			<div className="grid grid-cols-7 gap-1 mb-2">
				{WEEKDAY_LABELS.map((label, index) => (
					<div
						key={index}
						className="text-center text-xs font-medium text-muted-foreground py-2"
					>
						{label}
					</div>
				))}
			</div>

			{/* Calendar grid */}
			<div className="grid gap-1">
				{weeks.map((week, weekIndex) => (
					<div
						key={weekIndex}
						className="grid grid-cols-7 gap-1"
						style={{
							animationDelay: `${weekIndex * 50}ms`,
						}}
					>
						{week.map((date) => {
							const dateISO = formatDateISO(date);
							const isCurrentMonth = date.getMonth() === currentMonth;
							const isToday = dateISO === todayISO;
							const dayTasks = dayTasksMap.get(dateISO) || [];
							const completedTasks = dayTasks.filter((t) => t.isCompleted);
							const incompleteTasks = dayTasks.filter((t) => !t.isCompleted);

							return (
								<button
									key={dateISO}
									onClick={() => onDayClick(date)}
									className={cn(
										"relative flex flex-col items-center justify-start gap-1 rounded-lg p-1.5 transition-all duration-200",
										"min-h-[52px] sm:min-h-[60px]",
										"hover:bg-white/10 active:scale-95",
										isCurrentMonth ? "text-foreground" : "text-muted-foreground/40",
										isToday && "ring-1 ring-mars-red bg-mars-red/10"
									)}
									aria-label={`${date.toLocaleDateString("en-US", {
										weekday: "long",
										month: "long",
										day: "numeric",
									})}. ${dayTasks.length} tasks`}
								>
									{/* Day number */}
									<span
										className={cn(
											"text-sm font-medium",
											isToday && "text-mars-red font-bold"
										)}
									>
										{date.getDate()}
									</span>

									{/* Task dots */}
									{dayTasks.length > 0 && (
										<div className="flex flex-wrap justify-center gap-0.5 max-w-[36px]">
											{/* Show completed dots first (green) */}
											{completedTasks.slice(0, MAX_DOTS).map((task, i) => (
												<div
													key={`completed-${task.id}-${i}`}
													className="size-1.5 rounded-full bg-emerald-500"
													title={task.title}
												/>
											))}
											{/* Then incomplete dots (gray) */}
											{incompleteTasks
												.slice(0, Math.max(0, MAX_DOTS - completedTasks.length))
												.map((task, i) => (
													<div
														key={`incomplete-${task.id}-${i}`}
														className="size-1.5 rounded-full bg-muted-foreground/50"
														title={task.title}
													/>
												))}
											{/* Show overflow indicator if more than MAX_DOTS */}
											{dayTasks.length > MAX_DOTS && (
												<span className="text-[8px] text-muted-foreground leading-none">
													+{dayTasks.length - MAX_DOTS}
												</span>
											)}
										</div>
									)}
								</button>
							);
						})}
					</div>
				))}
			</div>
		</div>
	);
}
