"use client";

import { DayTasks } from "@/lib/types";
import { TaskItemV2 } from "./TaskItemV2";
import { cn } from "@/lib/utils";

const ARC_RADIUS = 10;
const ARC_CIRCUMFERENCE = 2 * Math.PI * ARC_RADIUS;

interface DayPanelProps {
  dayData: DayTasks;
  onToggleTask?: (taskId: string, date: string, optionIndex?: number) => void;
  onLogQuantitative?: (taskId: string, date: string, amount: number) => void;
  isHighlighted?: boolean;
  className?: string;
}

export function DayPanel({
  dayData,
  onToggleTask,
  onLogQuantitative,
  isHighlighted = false,
  className,
}: DayPanelProps) {
  const { date, dayName, dayNumber, isToday, isPast, tasks } = dayData;

  const completionScore = tasks.reduce((sum, t) => {
    if (t.target_value != null) {
      return sum + Math.min(t.currentValue / t.target_value, 1);
    }
    return sum + (t.isCompleted ? 1 : 0);
  }, 0);
  const completedCount = tasks.filter((t) => t.isCompleted).length;
  const totalCount = tasks.length;
  const allCompleted = totalCount > 0 && completedCount === totalCount;
  const completionPercentage = totalCount > 0 ? (completionScore / totalCount) * 100 : 0;
  const firstOneTimeTaskIndex = tasks.findIndex((task) => task.type === "one_time");
  const endOfFirstOneTimeBlockIndex = (() => {
    if (firstOneTimeTaskIndex < 0) return -1;
    let end = firstOneTimeTaskIndex;
    while (end + 1 < tasks.length && tasks[end + 1]?.type === "one_time") {
      end += 1;
    }
    return end;
  })();
  const firstFutureOneTimeTaskIndex = tasks.findIndex(
    (task) => task.type === "one_time" && !!task.due_date && task.due_date > date
  );
  const hasDailyBeforeFutureOneTime =
    firstFutureOneTimeTaskIndex > 0 &&
    tasks.slice(0, firstFutureOneTimeTaskIndex).some((task) => task.type === "daily");

  return (
    <div
      className={cn(
        "glass flex h-full flex-col rounded-2xl overflow-hidden transition-all duration-300",
        isHighlighted && "ring-2 ring-accent animate-pulse",
        isPast && !isToday && "opacity-65",
        className
      )}
      role="region"
      aria-label={`Tasks for ${dayName}, ${dayNumber}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex size-10 items-center justify-center rounded-xl text-lg font-bold tabular-nums transition-all duration-300",
              isToday ? "bg-accent text-white" : "bg-white/5 text-foreground"
            )}
          >
            {dayNumber}
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold tracking-tight text-foreground">
              {dayName}
            </span>
            {totalCount > 0 && (
              <span className="text-[11px] tabular-nums text-muted-foreground">
                {completedCount}/{totalCount} done
              </span>
            )}
          </div>
        </div>

        {/* Radial arc */}
        {totalCount > 0 && (
          <svg viewBox="0 0 28 28" className="size-7 shrink-0 -rotate-90">
            <circle
              cx="14"
              cy="14"
              r={ARC_RADIUS}
              fill="none"
              stroke="rgba(255,255,255,0.07)"
              strokeWidth="2.5"
            />
            {completionPercentage > 0 && (
              <circle
                cx="14"
                cy="14"
                r={ARC_RADIUS}
                fill="none"
                stroke={allCompleted ? "#34d399" : "rgba(255,59,59,0.45)"}
                strokeWidth="2.5"
                strokeDasharray={`${(completionPercentage / 100) * ARC_CIRCUMFERENCE} ${ARC_CIRCUMFERENCE}`}
                strokeLinecap="round"
              />
            )}
          </svg>
        )}
      </div>

      {/* Task list */}
      <div
        className={cn(
          "min-h-0 flex-1 space-y-1 px-2 pb-3",
          tasks.length === 0 && "flex min-h-[80px] items-center justify-center"
        )}
        role="list"
      >
        {tasks.length === 0 ? (
          <span className="text-xs italic text-muted-foreground/50">No tasks scheduled</span>
        ) : (
          tasks.map((task, index) => (
            <div key={task.id}>
              {index === endOfFirstOneTimeBlockIndex + 1 &&
                endOfFirstOneTimeBlockIndex >= 0 &&
                endOfFirstOneTimeBlockIndex < tasks.length - 1 && (
                  <div className="my-2.5 h-px bg-white/14" aria-hidden="true" />
                )}
              {index === firstFutureOneTimeTaskIndex && hasDailyBeforeFutureOneTime && (
                <div className="my-2.5 h-px bg-white/14" aria-hidden="true" />
              )}
              <TaskItemV2
                task={task}
                onToggle={task.target_value == null ? (id, optionIndex) => onToggleTask?.(id, date, optionIndex) : undefined}
                onLogValue={
                  task.target_value != null
                    ? (id, amount) => onLogQuantitative?.(id, date, amount)
                    : undefined
                }
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
