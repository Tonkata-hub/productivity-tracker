"use client";

import { DayTasks } from "@/lib/types";
import { TaskItem } from "./TaskItem";
import { cn } from "@/lib/utils";
import { CheckCircle2, Circle } from "lucide-react";

interface DayCardProps {
  dayData: DayTasks;
  onToggleTask?: (taskId: string, date: string) => void;
  onLogQuantitative?: (taskId: string, date: string, amount: number) => void;
  index: number;
  totalCards: number;
  stackMode: "mobile" | "grid" | "desktop";
  isHighlighted?: boolean;
}

export function DayCard({
  dayData,
  onToggleTask,
  onLogQuantitative,
  index,
  totalCards,
  stackMode,
  isHighlighted = false,
}: DayCardProps) {
  const { date, dayName, dayNumber, isToday, isPast, tasks } = dayData;

  const completedCount = tasks.filter((t) => t.isCompleted).length;
  const totalCount = tasks.length;
  const allCompleted = totalCount > 0 && completedCount === totalCount;
  const completionScore = tasks.reduce((sum, t) => {
    if (t.target_value != null) {
      return sum + Math.min(t.currentValue / t.target_value, 1);
    }
    return sum + (t.isCompleted ? 1 : 0);
  }, 0);
  const completionPercentage = totalCount > 0 ? (completionScore / totalCount) * 100 : 0;

  const handleToggle = (taskId: string) => {
    onToggleTask?.(taskId, date);
  };

  return (
    <div
      className="group relative"
      style={{ zIndex: totalCards - index }}
      role="region"
      aria-label={`Tasks for ${dayName}, ${dayNumber}`}
    >
      <div
        className={cn(
          "relative overflow-hidden rounded-2xl transition-all duration-300",
          // Glassmorphism base
          "glass",
          // Today highlight (not on mobile)
          isToday && stackMode !== "mobile" && "ring-1 ring-mars-red/70",
          // Highlighted from month view selection
          isHighlighted && "ring-2 ring-mars-red animate-pulse",
          // Past days slightly dimmed
          isPast && !isToday && "opacity-60",
          // Hover effects
          "hover:bg-[rgba(26,29,38,0.6)]",
          // Desktop hover lift shadow
          stackMode === "desktop" && "hover:shadow-xl hover:shadow-black/20",
          // Mobile full height
          stackMode === "mobile" && "min-h-[400px]"
        )}
      >
        {/* Completion progress bar (top edge) - white/neutral, red only when complete */}
        {totalCount > 0 && (
          <div className="absolute left-0 right-0 top-0 h-[2px] overflow-hidden rounded-t-2xl bg-white/5">
            <div
              className={cn(
                "h-full transition-all duration-500 ease-out",
                allCompleted ? "bg-mars-red" : "bg-white/30"
              )}
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
        )}

        {/* Day header */}
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            {/* Day number */}
            <div
              className={cn(
                "flex size-11 items-center justify-center rounded-xl text-lg font-bold transition-all duration-300",
                isToday && stackMode !== "mobile" ? "bg-mars-red text-white" : "bg-white/5 text-foreground"
              )}
            >
              {dayNumber}
            </div>
            <div className="flex flex-col">
              <span
                className={cn("text-sm font-semibold tracking-wide", isToday ? "text-foreground" : "text-foreground")}
              >
                {dayName}
              </span>
              {totalCount > 0 && (
                <span className="text-xs text-muted-foreground">
                  {completedCount} of {totalCount} done
                </span>
              )}
            </div>
          </div>

          {/* Completion indicator */}
          {totalCount > 0 && (
            <div
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5",
                allCompleted ? "bg-mars-red/15" : "bg-white/5"
              )}
            >
              {allCompleted ? (
                <CheckCircle2 className="size-4 text-mars-red" />
              ) : (
                <Circle className="size-4 text-muted-foreground" />
              )}
              <span className={cn("text-xs font-semibold", allCompleted ? "text-mars-red" : "text-muted-foreground")}>
                {completedCount}/{totalCount}
              </span>
            </div>
          )}
        </div>

        {/* Tasks list */}
        <div
          className={cn("space-y-1 px-2 pb-3", tasks.length === 0 && "flex min-h-[80px] items-center justify-center")}
          role="list"
          aria-label={`${totalCount} tasks`}
        >
          {tasks.length === 0 ? (
            <span className="text-xs text-muted-foreground/50">No tasks scheduled</span>
          ) : (
            tasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onToggle={task.target_value == null ? handleToggle : undefined}
                onLogValue={
                  task.target_value != null ? (id, amount) => onLogQuantitative?.(id, date, amount) : undefined
                }
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
