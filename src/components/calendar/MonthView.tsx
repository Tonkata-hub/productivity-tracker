"use client";

import { useMemo } from "react";
import { Task, TaskWithStatus } from "@/lib/types";
import { getMonthDates, formatDateISO, getTasksForDate } from "@/lib/calendar-utils";
import { cn } from "@/lib/utils";

interface MonthViewProps {
  baseDate: Date;
  tasks: Task[];
  completions: Set<string>;
  quantValues: Map<string, number>;
  onDayClick: (date: Date) => void;
  /** "up" = navigating forward (next month), "down" = backward (prev month), "none" = initial open */
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
const MAX_DOTS = 8;

export function MonthView({
  baseDate,
  tasks,
  completions,
  quantValues,
  onDayClick,
  direction = "none",
}: MonthViewProps) {
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

  const dayTasksMap = useMemo(() => {
    const map = new Map<
      string,
      { displayTasks: TaskWithStatus[]; totalCount: number; completedCount: number; hasOverflow: boolean }
    >();
    for (const date of monthDates) {
      const dateISO = formatDateISO(date);
      const allTasks = getTasksForDate(tasks, dateISO, completions, quantValues);
      const relevantTasks = allTasks.filter((t) => t.type === "daily");
      const prioritizedTasks = relevantTasks.slice(0, MAX_DOTS);
      const totalCount = relevantTasks.length;
      const completedCount = relevantTasks.filter((t) => t.isCompleted).length;
      map.set(
        dateISO,
        {
          displayTasks: prioritizedTasks,
          totalCount,
          completedCount,
          hasOverflow: totalCount > MAX_DOTS,
        }
      );
    }
    return map;
  }, [monthDates, tasks, completions, quantValues]);

  const gridAnimClass =
    direction === "up"
      ? "calendar-animate-slide-in-up"
      : direction === "down"
        ? "calendar-animate-slide-in-down"
        : "calendar-animate-slide-in-up";

  return (
    <div className={cn(gridAnimClass)}>
      {/* Weekday headers */}
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAY_LABELS.map((label, index) => (
          <div
            key={index}
            className={cn(
              "py-2 text-center text-xs font-semibold uppercase tracking-widest",
              index >= 5 ? "text-muted-foreground/55" : "text-muted-foreground/45"
            )}
          >
            <span className="sm:hidden">{label.short}</span>
            <span className="hidden sm:inline">{label.full}</span>
          </div>
        ))}
      </div>

      {/* Month legend */}
      <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] uppercase tracking-wider text-muted-foreground/65">
        <div className="flex items-center gap-1.5">
          <span className="inline-block size-2 rounded-full bg-completed-green" />
          <span>Completed</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block size-2 rounded-full bg-muted-foreground/45" />
          <span>Incomplete</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-4 rounded-full bg-mars-red/40" />
          <span>Today</span>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="grid gap-y-1">
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="grid grid-cols-7 gap-x-1">
            {week.map((date) => {
              const dateISO = formatDateISO(date);
              const isCurrentMonth = date.getMonth() === currentMonth;
              const isToday = dateISO === todayISO;
              const dayTaskData = dayTasksMap.get(dateISO) ?? {
                displayTasks: [],
                totalCount: 0,
                completedCount: 0,
                hasOverflow: false,
              };
              const allDone = dayTaskData.totalCount > 0 && dayTaskData.completedCount === dayTaskData.totalCount;

              return (
                <button
                  key={dateISO}
                  onClick={() => onDayClick(date)}
                  className={cn(
                    "group relative flex min-h-[60px] flex-col items-center gap-1.5 rounded-lg p-1.5",
                    "transition-all duration-150 active:scale-90",
                    "hover:bg-white/6",
                    isCurrentMonth ? "text-foreground" : "text-muted-foreground/25",
                    isToday
                      ? "bg-mars-red/10 ring-1 ring-mars-red/60"
                      : allDone
                        ? "bg-completed-green/8"
                        : "bg-transparent"
                  )}
                  aria-label={`${date.toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })}. ${dayTaskData.totalCount} daily tasks, ${dayTaskData.completedCount} completed`}
                >
                  {/* Date number */}
                  <span
                    className={cn(
                      "text-xs font-semibold tabular-nums leading-none select-none",
                      isToday ? "text-mars-red" : isCurrentMonth ? "text-foreground/90" : "text-muted-foreground/25"
                    )}
                  >
                    {date.getDate()}
                  </span>

                  {/* Task dot grid — bottom of cell */}
                  {dayTaskData.displayTasks.length > 0 && (
                    <div
                      className="grid gap-[3px] justify-center"
                      style={{ gridTemplateColumns: `repeat(4, 5px)` }}
                    >
                      {dayTaskData.displayTasks.map((task) => (
                        <span
                          key={task.id}
                          className={cn(
                            "block h-[5px] w-[5px] rounded-full transition-colors duration-200",
                            task.isCompleted ? "bg-completed-green shadow-[0_0_4px_rgba(52,211,153,0.35)]" : "bg-muted-foreground/45"
                          )}
                        />
                      ))}
                    </div>
                  )}

                  {dayTaskData.hasOverflow && (
                    <span className="text-[11px] leading-none text-muted-foreground/60">+{dayTaskData.totalCount - MAX_DOTS}</span>
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
