"use client";

import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Calendar, CalendarDays } from "lucide-react";
import { getWeekRangeLabel, getMonthLabel } from "@/lib/calendar-utils";
import { DayTasks } from "@/lib/types";
import { cn } from "@/lib/utils";

const RING_R = 8;
const RING_C = 2 * Math.PI * RING_R;
const DAY_ABBR = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

interface WeekHeaderProps {
  weekDates: Date[];
  weekData: DayTasks[];
  onPreviousWeek: () => void;
  onNextWeek: () => void;
  isMonthView: boolean;
  onToggleMonthView: () => void;
  monthBaseDate: Date;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onScrollToDay?: (index: number) => void;
  activeDayIndex: number;
}

export function WeekHeader({
  weekDates,
  weekData,
  onPreviousWeek,
  onNextWeek,
  isMonthView,
  onToggleMonthView,
  monthBaseDate,
  onPreviousMonth,
  onNextMonth,
  onScrollToDay,
  activeDayIndex,
}: WeekHeaderProps) {
  const handlePrev = isMonthView ? onPreviousMonth : onPreviousWeek;
  const handleNext = isMonthView ? onNextMonth : onNextWeek;
  const label = isMonthView ? getMonthLabel(monthBaseDate) : getWeekRangeLabel(weekDates);
  const ViewIcon = isMonthView ? CalendarDays : Calendar;

  return (
    <div className="flex w-full flex-col gap-3">
      {/* Top row: nav + label + filter + toggle — min-h-10 + items-center for vertical balance in the glass card */}
      <div className="flex h-10 w-full items-center gap-2">
        <Button
          variant="ghost"
          size="icon-lg"
          onClick={handlePrev}
          aria-label={isMonthView ? "Previous month" : "Previous week"}
          className="size-10 shrink-0 rounded-xl bg-white/5 text-foreground hover:bg-white/10 hover:text-accent active:scale-95 transition-all"
        >
          <ChevronLeft className="size-4" />
        </Button>

        <button
          type="button"
          onClick={onToggleMonthView}
          className="group flex h-10 min-w-0 flex-1 items-center justify-center gap-2 rounded-lg px-3 transition-all hover:bg-white/5 active:scale-[0.98] cursor-pointer"
          aria-label={isMonthView ? "Switch to week view" : "Switch to month view"}
        >
          <ViewIcon className="size-4 shrink-0 text-muted-foreground group-hover:text-accent transition-colors" />
          <span className="min-w-0 truncate text-center text-base font-bold leading-none tracking-tight text-foreground">
            {label}
          </span>
        </button>

        <Button
          variant="ghost"
          size="icon-lg"
          onClick={handleNext}
          aria-label={isMonthView ? "Next month" : "Next week"}
          className="size-10 shrink-0 rounded-xl bg-white/5 text-foreground hover:bg-white/10 hover:text-accent active:scale-95 transition-all"
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>

      {/* Day pills — mobile/tablet only in week view */}
      {!isMonthView && weekData.length > 0 && (
        <div className="grid grid-cols-7 gap-1 mx-auto w-full max-w-sm sm:max-w-md lg:hidden">
          {weekData.map((day, index) => {
            const fraction =
              day.tasks.length > 0
                ? day.tasks.reduce((sum, t) => {
                    if (t.target_value != null) return sum + Math.min(t.currentValue / t.target_value, 1);
                    return sum + (t.isCompleted ? 1 : 0);
                  }, 0) / day.tasks.length
                : 0;
            const dash = fraction * RING_C;
            const isActive = activeDayIndex === index;

            return (
              <button
                key={day.date}
                onClick={() => onScrollToDay?.(index)}
                className={cn(
                  "flex min-h-[44px] cursor-pointer flex-col items-center gap-0.5 rounded-xl px-1 py-1.5 transition-all duration-200",
                  isActive ? "bg-white/8" : "hover:bg-white/4",
                  day.isFuture && "opacity-35"
                )}
                aria-label={`Go to ${day.dayName}`}
              >
                <svg
                  viewBox="0 0 24 24"
                  className="pointer-events-none size-6 -rotate-90 sm:size-7"
                  aria-hidden
                >
                  <circle
                    cx="12"
                    cy="12"
                    r={RING_R}
                    fill="none"
                    stroke={day.isToday ? "rgba(255,59,59,0.2)" : "rgba(255,255,255,0.06)"}
                    strokeWidth="2.5"
                  />
                  {fraction > 0 && (
                    <circle
                      cx="12"
                      cy="12"
                      r={RING_R}
                      fill="none"
                      stroke={fraction >= 1 ? "#34d399" : "rgba(255,59,59,0.45)"}
                      strokeWidth="2.5"
                      strokeDasharray={`${dash} ${RING_C}`}
                      strokeLinecap="round"
                    />
                  )}
                </svg>
                <span
                  className={cn(
                    "text-[10px] font-semibold uppercase leading-none tracking-wide",
                    day.isToday ? "text-accent" : isActive ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {DAY_ABBR[index]}
                </span>
                <span
                  className={cn(
                    "text-[10px] font-medium leading-none tabular-nums",
                    day.isToday ? "text-accent font-bold" : "text-muted-foreground"
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
