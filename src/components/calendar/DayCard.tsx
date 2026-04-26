"use client";

import { DayTasks } from "@/lib/types";
import { TaskItem } from "./TaskItem";
import { cn } from "@/lib/utils";

const ARC_RADIUS = 10;
const ARC_CIRCUMFERENCE = 2 * Math.PI * ARC_RADIUS;

interface DayCardProps {
  dayData: DayTasks;
  onToggleTask?: (taskId: string, date: string, optionIndex?: number) => void;
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

  const handleToggle = (taskId: string, optionIndex?: number) => {
    onToggleTask?.(taskId, date, optionIndex);
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
          isToday && stackMode !== "mobile" && "ring-1 ring-mars-red/50 shadow-lg shadow-mars-red/10",
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

        {/* Day header */}
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            {/* Day number */}
            <div
              className={cn(
                "flex size-12 items-center justify-center rounded-xl text-xl font-bold transition-all duration-300 tabular-nums",
                isToday && stackMode !== "mobile" ? "bg-mars-red text-white" : "bg-white/5 text-foreground"
              )}
            >
              {dayNumber}
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-base font-semibold tracking-tight text-foreground">{dayName}</span>
              {totalCount > 0 && (
                <span className="text-sm tabular-nums text-muted-foreground">
                  {completedCount}/{totalCount}
                </span>
              )}
            </div>
          </div>

          {/* Radial arc progress */}
          {totalCount > 0 && (
            <svg viewBox="0 0 28 28" className="w-8 h-8 shrink-0 -rotate-90">
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
                  stroke={allCompleted ? "#ff3b3b" : "rgba(255,59,59,0.45)"}
                  strokeWidth="2.5"
                  strokeDasharray={`${(completionPercentage / 100) * ARC_CIRCUMFERENCE} ${ARC_CIRCUMFERENCE}`}
                  strokeLinecap="round"
                />
              )}
            </svg>
          )}
        </div>

        {/* Tasks list */}
        <div
          className={cn("space-y-1.5 px-2 pb-3", tasks.length === 0 && "flex min-h-[80px] items-center justify-center")}
          role="list"
          aria-label={`${totalCount} tasks`}
        >
          {tasks.length === 0 ? (
            <span className="text-sm italic text-muted-foreground/60">No tasks scheduled</span>
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
