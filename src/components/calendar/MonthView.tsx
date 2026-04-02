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
  /** "up" = navigating forward (next month), "down" = backward (prev month), "none" = initial open */
  direction?: "up" | "down" | "none";
}

const WEEKDAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

export function MonthView({ baseDate, tasks, completions, onDayClick, direction = "none" }: MonthViewProps) {
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

  // Get daily tasks only for each day
  const dayTasksMap = useMemo(() => {
    const map = new Map<string, TaskWithStatus[]>();
    for (const date of monthDates) {
      const dateISO = formatDateISO(date);
      const allTasks = getTasksForDate(tasks, dateISO, completions);
      map.set(
        dateISO,
        allTasks.filter((t) => t.type === "daily")
      );
    }
    return map;
  }, [monthDates, tasks, completions]);

  const gridAnimClass =
    direction === "up"
      ? "calendar-animate-slide-in-up"
      : direction === "down"
        ? "calendar-animate-slide-in-down"
        : "calendar-animate-slide-in-up";

  return (
    <div className={cn(gridAnimClass)}>
      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {WEEKDAY_LABELS.map((label, index) => (
          <div key={index} className="text-center text-xs font-medium text-muted-foreground py-2">
            {label}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid gap-1">
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="grid grid-cols-7 gap-1">
            {week.map((date) => {
              const dateISO = formatDateISO(date);
              const isCurrentMonth = date.getMonth() === currentMonth;
              const isToday = dateISO === todayISO;
              const dayTasks = dayTasksMap.get(dateISO) || [];
              const completedCount = dayTasks.filter((t) => t.isCompleted).length;
              const fraction = dayTasks.length > 0 ? completedCount / dayTasks.length : 0;
              const heatBg =
                fraction === 0
                  ? ""
                  : fraction < 0.5
                    ? "bg-mars-red/8"
                    : fraction < 1
                      ? "bg-mars-red/16"
                      : "bg-mars-red/25";

              return (
                <button
                  key={dateISO}
                  onClick={() => onDayClick(date)}
                  className={cn(
                    "relative flex flex-col items-center justify-start gap-1 rounded-lg p-1.5 transition-all duration-200",
                    "min-h-[56px] sm:min-h-[64px]",
                    "hover:bg-white/10 active:scale-95",
                    isCurrentMonth ? "text-foreground" : "text-muted-foreground/40",
                    isToday ? "ring-1 ring-mars-red bg-mars-red/10" : heatBg
                  )}
                  aria-label={`${date.toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })}. ${dayTasks.length} tasks`}
                >
                  {/* Day number */}
                  <span className={cn("text-sm font-medium", isToday && "text-mars-red font-bold")}>
                    {date.getDate()}
                  </span>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
