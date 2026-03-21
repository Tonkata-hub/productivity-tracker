"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { Task } from "@/lib/types";
import { mockTasks } from "@/lib/mock-data";
import { getWeekDates, generateWeekData, formatDateISO, filterTasks } from "@/lib/calendar-utils";
import { WeekNavigation } from "./WeekNavigation";
import { FilterBar } from "./FilterBar";
import { DayCard } from "./DayCard";
import { cn } from "@/lib/utils";

export function CalendarView() {
	const [tasks, setTasks] = useState<Task[]>(mockTasks);
	const [weekOffset, setWeekOffset] = useState(0);
	const [activeFilter, setActiveFilter] = useState("all");
	const [currentDayIndex, setCurrentDayIndex] = useState(0);
	const scrollContainerRef = useRef<HTMLDivElement>(null);

	// Calculate current week dates based on offset
	const weekDates = useMemo(() => {
		const baseDate = new Date();
		baseDate.setDate(baseDate.getDate() + weekOffset * 7);
		return getWeekDates(baseDate);
	}, [weekOffset]);

	// Check if viewing current week
	const isCurrentWeek = useMemo(() => {
		const today = formatDateISO(new Date());
		return weekDates.some((d) => formatDateISO(d) === today);
	}, [weekDates]);

	// Generate week data with tasks
	const weekData = useMemo(() => {
		const data = generateWeekData(tasks, weekDates);

		// Apply filter to each day's tasks
		if (activeFilter !== "all") {
			return data.map((day) => ({
				...day,
				tasks: filterTasks(day.tasks, activeFilter),
			}));
		}

		return data;
	}, [tasks, weekDates, activeFilter]);

	// Find today's index for default scroll position
	const todayIndex = useMemo(() => {
		const idx = weekData.findIndex((d) => d.isToday);
		return idx >= 0 ? idx : 0;
	}, [weekData]);

	// Scroll to today on mount and when week changes
	useEffect(() => {
		if (scrollContainerRef.current && isCurrentWeek) {
			const container = scrollContainerRef.current;
			const cardWidth = container.offsetWidth;
			container.scrollTo({
				left: todayIndex * cardWidth,
				behavior: "smooth",
			});
		}
	}, [todayIndex, isCurrentWeek, weekOffset]);

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
		setWeekOffset((prev) => prev - 1);
	}, []);

	const handleNextWeek = useCallback(() => {
		setWeekOffset((prev) => prev + 1);
	}, []);

	// Toggle task completion
	const handleToggleTask = useCallback((taskId: string, date: string) => {
		setTasks((prevTasks) =>
			prevTasks.map((task) => {
				if (task.id !== taskId) return task;

				const isCompleted = task.completedDates.includes(date);
				return {
					...task,
					completedDates: isCompleted
						? task.completedDates.filter((d) => d !== date)
						: [...task.completedDates, date],
				};
			})
		);
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
		}
	}, []);

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
					/>
				</div>

				{/* Filters - glass effect */}
				<div className="glass-subtle rounded-xl p-2">
					<FilterBar activeFilter={activeFilter} onFilterChange={setActiveFilter} />
				</div>

				{/* Day indicators for mobile scroll */}
				<div className="flex justify-center gap-1.5 sm:hidden">
					{weekData.map((day, index) => (
						<button
							key={day.date}
							onClick={() => scrollToDay(index)}
							className={cn(
								"flex flex-col items-center gap-0.5 rounded-lg px-2 py-1 transition-all duration-200",
								currentDayIndex === index ? "bg-white/10" : "opacity-50 hover:opacity-80"
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
									currentDayIndex === index
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
				<div className="perspective-container" role="grid" aria-label="Weekly calendar view">
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
									index={index}
									totalCards={weekData.length}
									stackMode="mobile"
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
								index={index}
								totalCards={weekData.length}
								stackMode="grid"
							/>
						))}
					</div>

					{/* Desktop: Horizontal scroll with larger fixed-width cards */}
					<div className="hidden lg:block overflow-x-auto scrollbar-none">
						<div className="flex gap-3 pb-2" style={{ minWidth: "max-content" }}>
							{weekData.map((dayData, index) => (
								<div key={dayData.date} className="w-[220px] shrink-0">
									<DayCard
										dayData={dayData}
										onToggleTask={handleToggleTask}
										index={index}
										totalCards={weekData.length}
										stackMode="desktop"
									/>
								</div>
							))}
						</div>
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
