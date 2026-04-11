"use client";

import { useMemo } from "react";
import { Check, ListChecks } from "lucide-react";
import { Task } from "@/lib/types";
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

  // Compute day stats from daily tasks only
  const dayStatsMap = useMemo(() => {
    const map = new Map<string, { totalCount: number; completedCount: number; fraction: number }>();
    for (const date of monthDates) {
      const dateISO = formatDateISO(date);
      const dailyTasks = getTasksForDate(tasks, dateISO, completions, quantValues).filter((task) => task.type === "daily");
      const totalCount = dailyTasks.length;
      const completionScore = dailyTasks.reduce((sum, t) => {
        if (t.target_value != null) return sum + Math.min(t.currentValue / t.target_value, 1);
        return sum + (t.isCompleted ? 1 : 0);
      }, 0);
      const completedCount = dailyTasks.filter((t) => t.isCompleted).length;
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
      <div className="mb-3 flex items-start justify-between">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-foreground">Habit Overview</h2>
          <p className="text-[10px] text-muted-foreground">Daily completions</p>
        </div>
        <ListChecks className="mt-0.5 size-4 text-muted-foreground" />
      </div>

      {/* Weekday headers */}
      <div className="mb-2 grid grid-cols-7 gap-x-1">
        {WEEKDAY_LABELS.map((label, index) => (
          <div
            key={index}
            className={cn(
              "py-1.5 text-center text-[10px] font-semibold uppercase tracking-widest",
              index >= 5 ? "text-muted-foreground/45" : "text-muted-foreground/35"
            )}
          >
            <span className="sm:hidden">{label.short}</span>
            <span className="hidden sm:inline">{label.full}</span>
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid gap-y-1.5">
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 gap-x-1">
            {week.map((date) => {
              const dateISO = formatDateISO(date);
              const isCurrentMonth = date.getMonth() === currentMonth;
              const isToday = dateISO === todayISO;
              const isFuture = dateISO > todayISO;
              const stats = dayStatsMap.get(dateISO) ?? { totalCount: 0, completedCount: 0, fraction: 0 };
              const allDone = stats.totalCount > 0 && stats.fraction >= 1;
              const progressStroke = allDone ? "#34d399" : "rgba(255,59,59,0.45)";
              const circumference = 2 * Math.PI * 11;
              const dash = Math.max(0, Math.min(stats.fraction, 1)) * circumference;

              return (
                <button
                  key={dateISO}
                  onClick={() => onDayClick(date)}
                  className={cn(
                    "group relative flex min-h-[68px] cursor-pointer flex-col items-center justify-between gap-2 rounded-xl px-1 py-2",
                    "transition-all duration-200 active:scale-95",
                    "hover:-translate-y-0.5 hover:bg-white/[0.06]",
                    isCurrentMonth ? "text-foreground" : "text-muted-foreground/20 opacity-55",
                    isToday
                      ? "bg-white/[0.04]"
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
                      "text-xs font-semibold tabular-nums leading-none select-none",
                      isCurrentMonth ? "text-foreground/85" : "text-muted-foreground/20"
                    )}
                  >
                    {date.getDate()}
                  </span>

                  {isCurrentMonth ? (
                    <div className="relative size-9">
                      <svg viewBox="0 0 28 28" className="-rotate-90 size-9">
                        <circle cx="14" cy="14" r="11" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="2.5" />
                        {!isFuture && stats.totalCount > 0 && stats.fraction > 0 && (
                          <circle
                            cx="14"
                            cy="14"
                            r="11"
                            fill="none"
                            stroke={progressStroke}
                            strokeWidth="2.5"
                            strokeDasharray={`${dash} ${circumference}`}
                            strokeLinecap="round"
                          />
                        )}
                      </svg>

                      {allDone && (
                        <div className="absolute inset-0 flex items-center justify-center text-completed-green">
                          <Check className="size-3.5" strokeWidth={3.5} />
                        </div>
                      )}

                      {!allDone && stats.totalCount > 0 && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          {!isFuture && (
                            <span className="text-[9px] font-semibold tabular-nums text-muted-foreground/75">
                              {stats.completedCount}/{stats.totalCount}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex size-9 items-center justify-center">
                      <span className="text-[10px] font-medium tabular-nums leading-none text-muted-foreground/35" />
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
