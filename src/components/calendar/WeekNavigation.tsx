"use client";

import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Calendar, CalendarDays } from "lucide-react";
import { getWeekRangeLabel, getMonthLabel } from "@/lib/calendar-utils";
import { cn } from "@/lib/utils";

interface WeekNavigationProps {
	weekDates: Date[];
	onPreviousWeek: () => void;
	onNextWeek: () => void;
	isMonthView?: boolean;
	onToggleMonthView?: () => void;
	monthBaseDate?: Date;
	onPreviousMonth?: () => void;
	onNextMonth?: () => void;
}

export function WeekNavigation({
	weekDates,
	onPreviousWeek,
	onNextWeek,
	isMonthView = false,
	onToggleMonthView,
	monthBaseDate,
	onPreviousMonth,
	onNextMonth,
}: WeekNavigationProps) {
	const handlePrevious = isMonthView && onPreviousMonth ? onPreviousMonth : onPreviousWeek;
	const handleNext = isMonthView && onNextMonth ? onNextMonth : onNextWeek;

	const label = isMonthView && monthBaseDate
		? getMonthLabel(monthBaseDate)
		: getWeekRangeLabel(weekDates);

	return (
		<div className="grid grid-cols-[auto_1fr_auto] items-center gap-2">
			<Button
				variant="ghost"
				size="icon"
				onClick={handlePrevious}
				aria-label={isMonthView ? "Previous month" : "Previous week"}
				className={cn(
					"size-9 rounded-xl bg-white/5 text-foreground transition-all duration-200",
					"hover:bg-white/10 hover:text-mars-red",
					"active:scale-95"
				)}
			>
				<ChevronLeft className="size-4" />
			</Button>

			<button
				onClick={onToggleMonthView}
				className={cn(
					"flex items-center justify-center gap-2 rounded-lg px-3 py-1.5 transition-all duration-200",
					"hover:bg-white/5 active:scale-98",
					"group cursor-pointer"
				)}
				aria-label={isMonthView ? "Switch to week view" : "Switch to month view"}
			>
				<h2 className="text-center text-sm font-bold tracking-tight text-foreground">
					{label}
				</h2>
				{isMonthView ? (
					<CalendarDays className="size-4 text-muted-foreground group-hover:text-mars-red transition-colors" />
				) : (
					<Calendar className="size-4 text-muted-foreground group-hover:text-mars-red transition-colors" />
				)}
			</button>

			<Button
				variant="ghost"
				size="icon"
				onClick={handleNext}
				aria-label={isMonthView ? "Next month" : "Next week"}
				className={cn(
					"size-9 rounded-xl bg-white/5 text-foreground transition-all duration-200",
					"hover:bg-white/10 hover:text-mars-red",
					"active:scale-95"
				)}
			>
				<ChevronRight className="size-4" />
			</Button>
		</div>
	);
}
