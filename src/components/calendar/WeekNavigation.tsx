"use client";

import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Calendar, CalendarDays } from "lucide-react";
import { getWeekRangeLabel, getMonthLabel } from "@/lib/calendar-utils";
import { DayTasks } from "@/lib/types";
import { cn } from "@/lib/utils";

interface WeekNavigationProps {
  weekDates: Date[];
  weekData: DayTasks[];
  onPreviousWeek: () => void;
  onNextWeek: () => void;
  isMonthView?: boolean;
  onToggleMonthView?: () => void;
  monthBaseDate?: Date;
  onPreviousMonth?: () => void;
  onNextMonth?: () => void;
  onScrollToDay?: (index: number) => void;
  activeDayIndex?: number;
}

const RING_RADIUS = 8;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export function WeekNavigation({
  weekDates,
  weekData = [],
  onPreviousWeek,
  onNextWeek,
  isMonthView = false,
  onToggleMonthView,
  monthBaseDate,
  onPreviousMonth,
  onNextMonth,
  onScrollToDay,
  activeDayIndex = 0,
}: WeekNavigationProps) {
  const handlePrevious = isMonthView && onPreviousMonth ? onPreviousMonth : onPreviousWeek;
  const handleNext = isMonthView && onNextMonth ? onNextMonth : onNextWeek;
  const label =
    isMonthView && monthBaseDate ? getMonthLabel(monthBaseDate) : getWeekRangeLabel(weekDates);

  return (
    <div className="space-y-3">
      {/* Top row: prev/next + label + view toggle */}
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
            "hover:bg-white/5 active:scale-[0.98]",
            "group cursor-pointer"
          )}
          aria-label={isMonthView ? "Switch to week view" : "Switch to month view"}
        >
          <h2 className="text-center text-sm font-bold tracking-tight text-foreground">{label}</h2>
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

      {/* Bottom row: day chips with completion rings (week view only) */}
      {!isMonthView && weekData.length > 0 && (
        <div className="grid grid-cols-7 gap-1">
          {weekData.map((day, index) => {
            const completionScore =
              day.tasks.length > 0
                ? day.tasks.reduce((sum, t) => {
                    if (t.target_value != null) {
                      return sum + Math.min(t.currentValue / t.target_value, 1);
                    }
                    return sum + (t.isCompleted ? 1 : 0);
                  }, 0)
                : 0;
            const fraction = day.tasks.length > 0 ? completionScore / day.tasks.length : 0;
            const dash = fraction * RING_CIRCUMFERENCE;
            const isActive = activeDayIndex === index;

            return (
              <button
                key={day.date}
                onClick={() => onScrollToDay?.(index)}
                style={{ animationDelay: `${index * 25}ms` }}
                className={cn(
                  "calendar-animate-slide-in-up flex flex-col items-center gap-0.5 rounded-xl py-1.5 px-1 transition-all duration-200",
                  isActive ? "bg-white/8" : "hover:bg-white/5",
                  day.isFuture && "opacity-40"
                )}
                aria-label={`Go to ${day.dayName}`}
              >
                {/* Completion ring */}
                <svg viewBox="0 0 24 24" className="w-6 h-6 -rotate-90">
                  <circle
                    cx="12"
                    cy="12"
                    r={RING_RADIUS}
                    fill="none"
                    stroke={day.isToday ? "rgba(255,59,59,0.25)" : "rgba(255,255,255,0.07)"}
                    strokeWidth="2.5"
                  />
                  {fraction > 0 && (
                    <circle
                      cx="12"
                      cy="12"
                      r={RING_RADIUS}
                      fill="none"
                      stroke={fraction >= 1 ? "#ff3b3b" : "rgba(255,59,59,0.45)"}
                      strokeWidth="2.5"
                      strokeDasharray={`${dash} ${RING_CIRCUMFERENCE}`}
                      strokeLinecap="round"
                    />
                  )}
                </svg>
                {/* Day letter */}
                <span
                  className={cn(
                    "text-[10px] font-semibold uppercase leading-none",
                    day.isToday
                      ? "text-mars-red"
                      : isActive
                        ? "text-foreground"
                        : "text-muted-foreground"
                  )}
                >
                  {day.dayName.slice(0, 1)}
                </span>
                {/* Date number */}
                <span
                  className={cn(
                    "text-[10px] leading-none",
                    day.isToday ? "text-mars-red font-bold" : "text-muted-foreground"
                  )}
                >
                  {day.dayNumber}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
