"use client";

import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getWeekRangeLabel } from "@/lib/calendar-utils";
import { cn } from "@/lib/utils";

interface WeekNavigationProps {
	weekDates: Date[];
	onPreviousWeek: () => void;
	onNextWeek: () => void;
}

export function WeekNavigation({ weekDates, onPreviousWeek, onNextWeek }: WeekNavigationProps) {
	return (
		<div className="grid grid-cols-[auto_1fr_auto] items-center gap-2">
			<Button
				variant="ghost"
				size="icon"
				onClick={onPreviousWeek}
				aria-label="Previous week"
				className={cn(
					"size-9 rounded-xl bg-white/5 text-foreground transition-all duration-200",
					"hover:bg-white/10 hover:text-mars-red",
					"active:scale-95"
				)}
			>
				<ChevronLeft className="size-4" />
			</Button>

			<h2 className="text-center text-sm font-bold tracking-tight text-foreground">{getWeekRangeLabel(weekDates)}</h2>

			<Button
				variant="ghost"
				size="icon"
				onClick={onNextWeek}
				aria-label="Next week"
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
