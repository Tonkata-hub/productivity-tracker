"use client";

import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import type { TimeRange } from "./TimeRangePicker";
import type { Task } from "@/lib/types";

export interface HabitRow {
  task: Task;
  dots: { date: string; completed: boolean; isFuture: boolean }[];
  rate: number;
  completedCount: number;
  totalDays: number;
}

interface DailyHabitsChartProps {
  habitRows: HabitRow[];
  datesInRange: string[];
  timeRange: TimeRange;
}

export function DailyHabitsChart({ habitRows, datesInRange, timeRange }: DailyHabitsChartProps) {
  if (habitRows.length === 0) {
    return (
      <div className="glass rounded-2xl p-8 text-center">
        <p className="text-muted-foreground text-sm">No daily habits found</p>
      </div>
    );
  }

  const isWeekly = timeRange === "W";

  return (
    <div className="glass rounded-2xl p-4 space-y-1 overflow-hidden">
      {isWeekly ? (
        <WeeklyDotGrid habitRows={habitRows} datesInRange={datesInRange} />
      ) : (
        <HeatmapGrid habitRows={habitRows} datesInRange={datesInRange} />
      )}
    </div>
  );
}

function WeeklyDotGrid({ habitRows, datesInRange }: { habitRows: HabitRow[]; datesInRange: string[] }) {
  const dayLabels = datesInRange.map((d) => format(parseISO(d), "EEE"));

  return (
    <div className="overflow-x-auto scrollbar-none">
      <div style={{ minWidth: "max-content" }}>
        {/* Header row: day labels */}
        <div className="flex items-center mb-3" style={{ paddingLeft: "120px" }}>
          {dayLabels.map((label, i) => (
            <div key={i} className="w-8 text-center text-[11px] font-medium text-muted-foreground/60 uppercase">
              {label}
            </div>
          ))}
          <div className="w-14" />
        </div>

        {/* Habit rows */}
        {habitRows.map(({ task, dots, rate, completedCount, totalDays }) => (
          <div key={task.id} className="flex items-center py-1.5 group">
            {/* Title */}
            <div className="w-[120px] pr-3 shrink-0">
              <p className="text-xs font-medium text-foreground/80 truncate group-hover:text-foreground transition-colors">
                {task.title}
              </p>
            </div>

            {/* Dots */}
            {dots.map(({ date, completed, isFuture }) => (
              <div key={date} className="w-8 flex justify-center">
                <div
                  className={cn(
                    "w-5 h-5 rounded-full transition-all duration-200",
                    completed
                      ? "bg-accent shadow-sm shadow-accent/40"
                      : isFuture
                        ? "border border-white/5"
                        : "border border-white/10 bg-white/[0.03]"
                  )}
                />
              </div>
            ))}

            {/* Rate */}
            <div className="w-14 pl-2 shrink-0">
              <span
                className={cn(
                  "text-xs font-semibold tabular-nums",
                  rate >= 0.8 ? "text-accent" : rate >= 0.5 ? "text-yellow-400/80" : "text-muted-foreground/50"
                )}
              >
                {completedCount}/{totalDays}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function HeatmapGrid({ habitRows, datesInRange }: { habitRows: HabitRow[]; datesInRange: string[] }) {
  // For long ranges, show every nth date label
  const totalDates = datesInRange.length;
  const labelStep = totalDates <= 31 ? 7 : totalDates <= 90 ? 14 : 30;

  const cellSize = totalDates <= 31 ? 14 : totalDates <= 90 ? 10 : 8;
  const gap = totalDates <= 31 ? 2 : 1;

  return (
    <div className="overflow-x-auto scrollbar-none">
      <div style={{ minWidth: "max-content" }}>
        {/* Date labels */}
        <div className="flex items-end mb-2" style={{ paddingLeft: "120px", gap: `${gap}px` }}>
          {datesInRange.map((d, i) => (
            <div
              key={d}
              style={{ width: cellSize, minWidth: cellSize }}
              className="text-center overflow-visible"
            >
              {i % labelStep === 0 && (
                <span
                  className="text-[9px] text-muted-foreground/50 block"
                  style={{ transform: "rotate(-45deg)", transformOrigin: "center bottom", whiteSpace: "nowrap" }}
                >
                  {format(parseISO(d), totalDates <= 31 ? "d" : "MMM d")}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Habit rows */}
        {habitRows.map(({ task, dots }) => (
          <div key={task.id} className="flex items-center py-0.5">
            <div className="w-[120px] pr-3 shrink-0">
              <p className="text-xs font-medium text-foreground/70 truncate">{task.title}</p>
            </div>
            <div className="flex items-center" style={{ gap: `${gap}px` }}>
              {dots.map(({ date, completed, isFuture }) => (
                <div
                  key={date}
                  style={{ width: cellSize, height: cellSize }}
                  className={cn(
                    "rounded-sm transition-all duration-150",
                    completed
                      ? "bg-accent"
                      : isFuture
                        ? "bg-white/[0.02]"
                        : "bg-white/[0.05]"
                  )}
                  title={`${task.title} — ${format(parseISO(date), "MMM d")}${completed ? " ✓" : ""}`}
                />
              ))}
            </div>
            <div className="pl-2 shrink-0">
              <span
                className={cn(
                  "text-[11px] font-semibold tabular-nums",
                  (dots.filter((d) => d.completed).length / Math.max(1, dots.filter((d) => !d.isFuture).length)) >= 0.8
                    ? "text-accent"
                    : "text-muted-foreground/50"
                )}
              >
                {Math.round(
                  (dots.filter((d) => d.completed).length /
                    Math.max(1, dots.filter((d) => !d.isFuture).length)) *
                    100
                )}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
