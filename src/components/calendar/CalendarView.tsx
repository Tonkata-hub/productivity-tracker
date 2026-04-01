"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { Task } from "@/lib/types";
import { supabase } from "@/lib/supabase";
import { mockTasks } from "@/lib/mock-data";
import { getWeekDates, generateWeekData, formatDateISO, filterTasks, getWeekOffsetForDate } from "@/lib/calendar-utils";
import { WeekNavigation } from "./WeekNavigation";
import { FilterBar } from "./FilterBar";
import { DayCard } from "./DayCard";
import { MonthView } from "./MonthView";
import { cn } from "@/lib/utils";

export function CalendarView() {
	const [tasks, setTasks] = useState<Task[]>(process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true" ? mockTasks : []);
	const [completions, setCompletions] = useState<Set<string>>(new Set());
	const [quantValues, setQuantValues] = useState<Map<string, number>>(new Map());

	useEffect(() => {
		if (process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true") return;
		async function fetchTasks() {
			const { data, error } = await supabase.from("tasks").select("*");
			if (error) {
				console.error("Failed to fetch tasks:", error);
				return;
			}
			setTasks(data as Task[]);
		}
		fetchTasks();
	}, []);
	const [weekOffset, setWeekOffset] = useState(0);
	const [activeFilter, setActiveFilter] = useState("all");
	const [currentDayIndex, setCurrentDayIndex] = useState(0);
	const [isMonthView, setIsMonthView] = useState(false);
	const [monthOffset, setMonthOffset] = useState(0);
	const [highlightedDate, setHighlightedDate] = useState<string | null>(null);
	const [monthDirection, setMonthDirection] = useState<"up" | "down" | "none">("none");
	const [weekDirection, setWeekDirection] = useState<"left" | "right" | "none">("none");
	const [weekAnimKey, setWeekAnimKey] = useState(0);
	const scrollContainerRef = useRef<HTMLDivElement>(null);
	const hasInitialTodayScrollRun = useRef(false);

	// Calculate current week dates based on offset
	const weekDates = useMemo(() => {
		const baseDate = new Date();
		baseDate.setDate(baseDate.getDate() + weekOffset * 7);
		return getWeekDates(baseDate);
	}, [weekOffset]);

	// Calculate month base date
	const monthBaseDate = useMemo(() => {
		const date = new Date();
		date.setMonth(date.getMonth() + monthOffset);
		return date;
	}, [monthOffset]);

	// Fetch completions for visible week
	useEffect(() => {
		if (process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true") return;
		if (weekDates.length === 0) return;

		const from = formatDateISO(weekDates[0]);
		const to = formatDateISO(weekDates[weekDates.length - 1]);

		async function fetchCompletions() {
			const { data, error } = await supabase
				.from("task_completions")
				.select("task_id, date, value")
				.gte("date", from)
				.lte("date", to);
			if (error) {
				console.error("Failed to fetch completions:", error);
				return;
			}
			const set = new Set<string>();
			const qmap = new Map<string, number>();
			for (const c of data as { task_id: string; date: string; value: number | null }[]) {
				const key = `${c.task_id}:${c.date}`;
				if (c.value != null) {
					qmap.set(key, (qmap.get(key) ?? 0) + c.value);
				} else {
					set.add(key);
				}
			}
			setCompletions(set);
			setQuantValues(qmap);
		}
		fetchCompletions();
	}, [weekDates]);

	// Check if viewing current week
	// const isCurrentWeek = useMemo(() => {
	// 	const today = formatDateISO(new Date());
	// 	return weekDates.some((d) => formatDateISO(d) === today);
	// }, [weekDates]);

	// Generate week data with tasks
	const weekData = useMemo(() => {
		const data = generateWeekData(tasks, weekDates, completions, quantValues);

		// Apply filter to each day's tasks
		if (activeFilter !== "all") {
			return data.map((day) => ({
				...day,
				tasks: filterTasks(day.tasks, activeFilter),
			}));
		}

		return data;
	}, [tasks, weekDates, activeFilter, completions, quantValues]);

	const highlightedDayIndex = useMemo(() => {
		if (!highlightedDate) return -1;
		return weekData.findIndex((d) => d.date === highlightedDate);
	}, [highlightedDate, weekData]);

	// Find today's index for default initial scroll position
	const todayIndex = useMemo(() => {
		const idx = weekData.findIndex((d) => d.isToday);
		return idx >= 0 ? idx : 0;
	}, [weekData]);

	// Scroll to today only once when the week scroller first mounts
	useEffect(() => {
		if (hasInitialTodayScrollRun.current || !scrollContainerRef.current || highlightedDate) return;

		const container = scrollContainerRef.current;
		const cardWidth = container.offsetWidth;
		container.scrollTo({
			left: todayIndex * cardWidth,
			behavior: "smooth",
		});
		hasInitialTodayScrollRun.current = true;
	}, [todayIndex, highlightedDate]);

	// Scroll to highlighted date when coming from month view
	useEffect(() => {
		if (scrollContainerRef.current && highlightedDate) {
			const highlightIndex = highlightedDayIndex;
			if (highlightIndex >= 0) {
				const container = scrollContainerRef.current;
				const cardWidth = container.offsetWidth;
				container.scrollTo({
					left: highlightIndex * cardWidth,
					behavior: "smooth",
				});
			}
		}
	}, [highlightedDate, highlightedDayIndex]);

	// Handle scroll snap to update current day indicator
	const handleScroll = useCallback(() => {
		if (scrollContainerRef.current) {
			const container = scrollContainerRef.current;
			const cardWidth = container.offsetWidth;
			const scrollPosition = container.scrollLeft;
			const newIndex = Math.round(scrollPosition / cardWidth);
			setCurrentDayIndex(newIndex);
		}
	}, []);

	// Navigation handlers
	const handlePreviousWeek = useCallback(() => {
		setWeekDirection("right");
		setWeekAnimKey((k) => k + 1);
		setWeekOffset((prev) => prev - 1);
	}, []);

	const handleNextWeek = useCallback(() => {
		setWeekDirection("left");
		setWeekAnimKey((k) => k + 1);
		setWeekOffset((prev) => prev + 1);
	}, []);

	const handlePreviousMonth = useCallback(() => {
		setMonthDirection("down");
		setMonthOffset((prev) => prev - 1);
	}, []);

	const handleNextMonth = useCallback(() => {
		setMonthDirection("up");
		setMonthOffset((prev) => prev + 1);
	}, []);

	const handleToggleMonthView = useCallback(() => {
		setIsMonthView((prev) => {
			if (!prev) {
				const today = new Date();
				const todayISO = formatDateISO(today);
				// If the visible week contains today, anchor month view to today
				// instead of the week's Monday so month boundaries behave correctly.
				const currentWeekDate = weekDates.find((date) => formatDateISO(date) === todayISO) ?? weekDates[0];
				const monthsDiff =
					(currentWeekDate.getFullYear() - today.getFullYear()) * 12 +
					(currentWeekDate.getMonth() - today.getMonth());
				setMonthOffset(monthsDiff);
				setMonthDirection("none");
			}
			return !prev;
		});
		setHighlightedDate(null);
	}, [weekDates]);

	// Handle day click from month view
	const handleMonthDayClick = useCallback((date: Date) => {
		const newOffset = getWeekOffsetForDate(date);
		setWeekOffset(newOffset);
		setHighlightedDate(formatDateISO(date));
		setIsMonthView(false);

		// Clear highlight after animation
		setTimeout(() => {
			setHighlightedDate(null);
		}, 2000);
	}, []);

	// Toggle task completion
	const handleToggleTask = useCallback(
		(taskId: string, date: string) => {
			const task = tasks.find((t) => t.id === taskId);
			if (!task) return;

			if (task.type === "daily") {
				const key = `${taskId}:${date}`;
				const wasCompleted = completions.has(key);

				// Optimistic update
				setCompletions((prev) => {
					const next = new Set(prev);
					if (wasCompleted) next.delete(key);
					else next.add(key);
					return next;
				});

				if (wasCompleted) {
					supabase
						.from("task_completions")
						.delete()
						.match({ task_id: taskId, date })
						.then(({ error }) => {
							if (error) {
								console.error("Failed to delete completion:", error);
								setCompletions((prev) => {
									const next = new Set(prev);
									next.add(key);
									return next;
								});
							}
						});
				} else {
					const now = new Date().toISOString();
					supabase
						.from("task_completions")
						.insert({ task_id: taskId, date, completed_at: now })
						.then(({ error }) => {
							if (error) {
								console.error("Failed to insert completion:", error);
								setCompletions((prev) => {
									const next = new Set(prev);
									next.delete(key);
									return next;
								});
							}
						});
				}
			} else if (task.type === "one_time") {
				const newCompleted = !task.is_completed;
				const now = new Date().toISOString();

				// Optimistic update
				setTasks((prev) =>
					prev.map((t) =>
						t.id !== taskId
							? t
							: { ...t, is_completed: newCompleted, completed_at: newCompleted ? now : null }
					)
				);

				supabase
					.from("tasks")
					.update({ is_completed: newCompleted, completed_at: newCompleted ? now : null })
					.eq("id", taskId)
					.then(({ error }) => {
						if (error) {
							console.error("Failed to update task:", error);
							// Roll back
							setTasks((prev) =>
								prev.map((t) =>
									t.id !== taskId
										? t
										: { ...t, is_completed: !newCompleted, completed_at: task.completed_at }
								)
							);
						}
					});
			}
		},
		[tasks, completions]
	);

	// Log an amount for a quantitative task
	const handleLogQuantitative = useCallback((taskId: string, date: string, amount: number) => {
		const key = `${taskId}:${date}`;

		// Optimistic update
		setQuantValues((prev) => {
			const next = new Map(prev);
			next.set(key, (next.get(key) ?? 0) + amount);
			return next;
		});

		if (process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true") return;

		supabase
			.from("task_completions")
			.insert({ task_id: taskId, date, value: amount, completed_at: new Date().toISOString() })
			.then(({ error }) => {
				if (error) {
					console.error("Failed to log value:", error);
					// Roll back
					setQuantValues((prev) => {
						const next = new Map(prev);
						const current = next.get(key) ?? 0;
						const rolled = current - amount;
						if (rolled <= 0) next.delete(key);
						else next.set(key, rolled);
						return next;
					});
				}
			});
	}, []);

	// Scroll to specific day (mobile)
	const scrollToDay = useCallback((index: number) => {
		if (scrollContainerRef.current) {
			const container = scrollContainerRef.current;
			const cardWidth = container.offsetWidth;
			container.scrollTo({
				left: index * cardWidth,
				behavior: "smooth",
			});
			setCurrentDayIndex(index);
		}
	}, []);

	const activeDayIndex = highlightedDayIndex >= 0 ? highlightedDayIndex : currentDayIndex;

	return (
		<div className="relative flex min-h-screen flex-col overflow-hidden bg-background">
			{/* Subtle background gradient */}
			<div className="pointer-events-none fixed inset-0 overflow-hidden">
				<div className="absolute -left-1/4 -top-1/4 h-[600px] w-[600px] rounded-full bg-white/2 blur-[120px]" />
				<div className="absolute -bottom-1/4 -right-1/4 h-[500px] w-[500px] rounded-full bg-white/1 blur-[100px]" />
			</div>

			<main className="relative flex-1 space-y-4 p-4 pb-8">
				{/* Week navigation - glass effect */}
				<div className="glass rounded-2xl p-3">
					<WeekNavigation
						weekDates={weekDates}
						onPreviousWeek={handlePreviousWeek}
						onNextWeek={handleNextWeek}
						isMonthView={isMonthView}
						onToggleMonthView={handleToggleMonthView}
						monthBaseDate={monthBaseDate}
						onPreviousMonth={handlePreviousMonth}
						onNextMonth={handleNextMonth}
					/>
				</div>

				{/* Month View */}
				{isMonthView && (
					<div className="glass rounded-2xl p-4">
						<MonthView
							key={`${monthBaseDate.getFullYear()}-${monthBaseDate.getMonth()}`}
							baseDate={monthBaseDate}
							tasks={tasks}
							completions={completions}
							onDayClick={handleMonthDayClick}
							direction={monthDirection}
						/>
					</div>
				)}

				{/* Filters - glass effect (only show in week view) */}
				<div
					className={cn(
						"glass-subtle rounded-xl p-2 transition-all duration-300",
						isMonthView && "opacity-0 h-0 p-0 overflow-hidden"
					)}
				>
					<FilterBar activeFilter={activeFilter} onFilterChange={setActiveFilter} />
				</div>

				{/* Day indicators for mobile scroll */}
				<div
					className={cn(
						"flex justify-center gap-1.5 sm:hidden transition-all duration-300",
						isMonthView && "opacity-0 h-0 overflow-hidden"
					)}
				>
					{weekData.map((day, index) => (
						<button
							key={day.date}
							onClick={() => scrollToDay(index)}
							className={cn(
								"flex flex-col items-center gap-0.5 rounded-lg px-2 py-1 transition-all duration-200",
								activeDayIndex === index ? "bg-white/10" : "opacity-50 hover:opacity-80"
							)}
							aria-label={`Go to ${day.dayName}`}
						>
							<span
								className={cn(
									"text-[10px] font-medium uppercase",
									day.isToday ? "text-mars-red" : "text-muted-foreground"
								)}
							>
								{day.dayName.slice(0, 1)}
							</span>
							<div
								className={cn(
									"size-1.5 rounded-full transition-all",
									activeDayIndex === index
										? day.isToday
											? "bg-mars-red"
											: "bg-foreground"
										: "bg-muted-foreground/30"
								)}
							/>
						</button>
					))}
				</div>

				{/* Week cards */}
				<div
					key={weekAnimKey}
					className={cn(
						"perspective-container transition-opacity duration-300",
						isMonthView && "opacity-0 h-0 overflow-hidden",
						!isMonthView && weekDirection === "left" && "calendar-animate-slide-in-left",
						!isMonthView && weekDirection === "right" && "calendar-animate-slide-in-right"
					)}
					role="grid"
					aria-label="Weekly calendar view"
				>
					{/* Mobile: Horizontal snap scroll */}
					<div
						ref={scrollContainerRef}
						onScroll={handleScroll}
						className="flex snap-x snap-mandatory gap-4 overflow-x-auto scrollbar-none sm:hidden"
						style={{ scrollPaddingLeft: "0px" }}
					>
						{weekData.map((dayData, index) => (
							<div key={dayData.date} className="w-full shrink-0 snap-center px-1 py-1">
								<DayCard
									dayData={dayData}
									onToggleTask={handleToggleTask}
									onLogQuantitative={handleLogQuantitative}
									index={index}
									totalCards={weekData.length}
									stackMode="mobile"
									isHighlighted={highlightedDate === dayData.date}
								/>
							</div>
						))}
					</div>

					{/* Tablet: 2 column grid */}
					<div className="hidden gap-3 sm:grid sm:grid-cols-2 lg:hidden">
						{weekData.map((dayData, index) => (
							<DayCard
								key={dayData.date}
								dayData={dayData}
								onToggleTask={handleToggleTask}
								onLogQuantitative={handleLogQuantitative}
								index={index}
								totalCards={weekData.length}
								stackMode="grid"
								isHighlighted={highlightedDate === dayData.date}
							/>
						))}
					</div>

					{/* Desktop: Full-width grid */}
					<div className="hidden lg:grid lg:grid-cols-7 gap-3">
						{weekData.map((dayData, index) => (
							<DayCard
								key={dayData.date}
								dayData={dayData}
								onToggleTask={handleToggleTask}
								onLogQuantitative={handleLogQuantitative}
								index={index}
								totalCards={weekData.length}
								stackMode="desktop"
								isHighlighted={highlightedDate === dayData.date}
							/>
						))}
					</div>
				</div>

				{/* Empty state when all tasks are filtered out */}
				{weekData.every((d) => d.tasks.length === 0) && activeFilter !== "all" && (
					<div className="glass flex flex-col items-center justify-center rounded-2xl py-16 text-center">
						<div className="mb-4 flex size-16 items-center justify-center rounded-full bg-white/5">
							<span className="text-3xl opacity-30">*</span>
						</div>
						<h3 className="text-sm font-medium text-foreground">No matching tasks</h3>
						<p className="mt-2 text-xs text-muted-foreground">
							Try adjusting your filter to see more tasks
						</p>
					</div>
				)}
			</main>
		</div>
	);
}
