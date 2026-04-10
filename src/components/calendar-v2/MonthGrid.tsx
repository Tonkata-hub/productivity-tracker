"use client";

import { useMemo } from "react";
import { Task, TaskWithStatus } from "@/lib/types";
import { getMonthDates, formatDateISO, getTasksForDate } from "@/lib/calendar-utils";
import { cn } from "@/lib/utils";

interface MonthGridProps {
  baseDate: Date;
  tasks: Task[];
  completions: Set<string>;
  quantValues: Map<string, number>;
  onDayClick: (date: Date) => void;
  direction?: "up" | "down" | "none";
}

const WEEKDAY_LABELS = [
  { short: "Mo", full: "Mon" },
  { short: "Tu", full: "Tue" },
  { short: "We", full: "Wed" },
  { short: "Th", full: "Thu" },
  { short: "Fr", full: "Fri" },
  { short: "Sa", full: "Sat" },
  { short: "Su", full: "Sun" },
];

export function MonthGrid({
  baseDate,
  tasks,
  completions,
  quantValues,
  onDayClick,
  direction = "none",
}: MonthGridProps) {
  const monthDates = useMemo(() => getMonthDates(baseDate), [baseDate]);
  const currentMonth = baseDate.getMonth();
  const todayISO = formatDateISO(new Date());

  const weeks = useMemo(() => {
    const result: Date[][] = [];
    for (let i = 0; i < monthDates.length; i += 7) {
      result.push(monthDates.slice(i, i + 7));
    }
    return result;
  }, [monthDates]);

  // Compute day stats — now includes ALL task types
  const dayStatsMap = useMemo(() => {
    const map = new Map<string, { totalCount: number; completedCount: number; fraction: number }>();
    for (const date of monthDates) {
      const dateISO = formatDateISO(date);
      const allTasks = getTasksForDate(tasks, dateISO, completions, quantValues);
      const totalCount = allTasks.length;
      const completionScore = allTasks.reduce((sum, t) => {
        if (t.target_value != null) return sum + Math.min(t.currentValue / t.target_value, 1);
        return sum + (t.isCompleted ? 1 : 0);
      }, 0);
      const completedCount = allTasks.filter((t) => t.isCompleted).length;
      const fraction = totalCount > 0 ? completionScore / totalCount : 0;
      map.set(dateISO, { totalCount, completedCount, fraction });
    }
    return map;
  }, [monthDates, tasks, completions, quantValues]);

  const animClass =
    direction === "up"
      ? "calendar-animate-slide-in-up"
      : direction === "down"
        ? "calendar-animate-slide-in-down"
        : "calendar-animate-slide-in-up";

  return (
    <div className={animClass}>
      {/* Weekday headers */}
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAY_LABELS.map((label, index) => (
          <div
            key={index}
            className={cn(
              "py-2 text-center text-[10px] lg:text-xs font-semibold uppercase tracking-widest",
              index >= 5 ? "text-muted-foreground/50" : "text-muted-foreground/40"
            )}
          >
            <span className="sm:hidden">{label.short}</span>
            <span className="hidden sm:inline">{label.full}</span>
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid gap-y-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 gap-x-1">
            {week.map((date) => {
              const dateISO = formatDateISO(date);
              const isCurrentMonth = date.getMonth() === currentMonth;
              const isToday = dateISO === todayISO;
              const stats = dayStatsMap.get(dateISO) ?? { totalCount: 0, completedCount: 0, fraction: 0 };
              const allDone = stats.totalCount > 0 && stats.fraction >= 1;

              return (
                <button
                  key={dateISO}
                  onClick={() => onDayClick(date)}
                  className={cn(
                    "group relative flex min-h-[56px] lg:min-h-[76px] flex-col items-center justify-between gap-1 rounded-lg p-1.5 lg:p-2",
                    "transition-all duration-150 active:scale-95",
                    "hover:bg-white/[0.06]",
                    isCurrentMonth ? "text-foreground" : "text-muted-foreground/20",
                    isToday
                      ? "bg-accent/10 ring-1 ring-accent/50"
                      : allDone
                        ? "bg-completed-green/8"
                        : "bg-transparent"
                  )}
                  aria-label={`${date.toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })}. ${stats.totalCount} tasks, ${stats.completedCount} completed`}
                >
                  {/* Date number */}
                  <span
                    className={cn(
                      "text-xs lg:text-sm font-semibold tabular-nums leading-none select-none",
                      isToday ? "text-accent" : isCurrentMonth ? "text-foreground/85" : "text-muted-foreground/20"
                    )}
                  >
                    {date.getDate()}
                  </span>

                  {/* Count + progress bar */}
                  {stats.totalCount > 0 && isCurrentMonth && (
                    <div className="w-full flex flex-col items-center gap-1">
                      <span
                        className={cn(
                          "text-[10px] lg:text-xs font-medium tabular-nums leading-none",
                          allDone ? "text-completed-green" : "text-muted-foreground/60"
                        )}
                      >
                        {stats.completedCount}/{stats.totalCount}
                      </span>
                      <div className="w-full h-[2px] lg:h-[3px] rounded-full bg-white/10 overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all duration-500",
                            allDone ? "bg-completed-green" : "bg-accent/40"
                          )}
                          style={{ width: `${stats.fraction * 100}%` }}
                        />
                      </div>
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
