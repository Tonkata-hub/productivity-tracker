"use client";

import { useState, type KeyboardEvent } from "react";
import { TaskWithStatus, TaskPriority } from "@/lib/types";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { Repeat, Clock, AlertCircle, Calendar, Plus } from "lucide-react";
import { format, parseISO, differenceInDays } from "date-fns";
import { QuantLogInput } from "./QuantLogInput";

interface TaskItemV2Props {
  task: TaskWithStatus;
  onToggle?: (taskId: string) => void;
  onLogValue?: (taskId: string, amount: number) => void;
}

function PriorityBar({ priority }: { priority: TaskPriority | null }) {
  if (!priority || priority === "low") return null;
  return (
    <div
      className={cn(
        "absolute left-0 top-1 bottom-1 w-[3px] rounded-full",
        priority === "high" ? "bg-accent" : "bg-amber-400"
      )}
    />
  );
}

function overdueDays(dueDate: string): number {
  return differenceInDays(new Date(), parseISO(dueDate));
}

export function TaskItemV2({ task, onToggle, onLogValue }: TaskItemV2Props) {
  const [isPressed, setIsPressed] = useState(false);
  const [showQuickLog, setShowQuickLog] = useState(false);

  const handleToggle = () => {
    setIsPressed(true);
    setTimeout(() => setIsPressed(false), 200);
    onToggle?.(task.id);
  };

  const hasMeta = task.due_date || task.isOverdue || task.isDueToday;

  // Quantitative task
  if (task.target_value != null) {
    const progress = Math.min((task.currentValue / task.target_value) * 100, 100);
    const handleToggleQuickLog = () => setShowQuickLog((prev) => !prev);
    const handleQuickLogKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleToggleQuickLog();
      }
    };

    return (
      <div
        className={cn(
          "group relative rounded-xl p-3 transition-all duration-200",
          "bg-white/[0.03] hover:bg-white/[0.06]",
          "border border-transparent hover:border-white/5",
          task.isCompleted && "opacity-40"
        )}
        role="listitem"
      >
        <PriorityBar priority={task.priority} />

        <div
          className="flex cursor-pointer items-center gap-3"
          onClick={handleToggleQuickLog}
          onKeyDown={handleQuickLogKeyDown}
          role="button"
          tabIndex={0}
          aria-expanded={showQuickLog}
          aria-label={`Toggle options for ${task.title}`}
        >
          {/* Toggle quick-log */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleToggleQuickLog();
            }}
            className={cn(
              "shrink-0 flex size-5 items-center justify-center rounded-md border-2 transition-all duration-200",
              showQuickLog
                ? "border-accent/60 bg-accent/20"
                : "border-white/20 bg-transparent hover:border-white/40"
            )}
            aria-label={`Log amount for ${task.title}`}
          >
            <Plus className="size-3 text-foreground/70" />
          </button>

          <div className="min-w-0 flex-1">
            <span
              className={cn(
                "text-sm font-medium leading-snug transition-all duration-200",
                task.isCompleted && "line-through text-muted-foreground"
              )}
            >
              {task.title}
            </span>
            <div className="mt-0.5 flex items-baseline gap-1">
              <span className="text-xs tabular-nums text-muted-foreground">
                {task.currentValue} / {task.target_value} {task.unit}
              </span>
            </div>
            {/* Progress bar */}
            <div className="mt-1.5 h-[3px] overflow-hidden rounded-full bg-white/10">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500 ease-out",
                  task.isCompleted ? "bg-completed-green" : "bg-white/25"
                )}
                style={{ width: `${progress}%` }}
              />
            </div>

            {/* Meta badges */}
            {hasMeta && (
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                {task.isOverdue && !task.isCompleted && task.due_date && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-accent/15 px-2 py-0.5 text-xs font-semibold text-accent">
                    <AlertCircle className="size-3 shrink-0" />
                    Overdue {overdueDays(task.due_date)}d
                  </span>
                )}
                {task.isDueToday && !task.isCompleted && !task.isOverdue && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-accent/15 px-2 py-0.5 text-xs font-semibold text-accent">
                    Due Today
                  </span>
                )}
                {task.due_date && task.type === "one_time" && !task.isOverdue && !task.isDueToday && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
                    <Calendar className="size-3 shrink-0" />
                    {format(parseISO(task.due_date), "MMM d")}
                  </span>
                )}
              </div>
            )}
          </div>

          {task.type === "daily" ? (
            <Repeat className="shrink-0 size-3.5 text-muted-foreground/50" />
          ) : (
            <Clock className="shrink-0 size-3.5 text-muted-foreground/50" />
          )}
        </div>

        {/* Quick-increment input */}
        {showQuickLog && onLogValue && (
          <QuantLogInput
            unit={task.unit}
            targetValue={task.target_value}
            onLogValue={(amount) => {
              onLogValue(task.id, amount);
              setShowQuickLog(false);
            }}
          />
        )}
      </div>
    );
  }

  // Boolean task (daily or one-time)
  return (
    <div
      className={cn(
        "group relative flex cursor-pointer items-center gap-3 rounded-xl p-3 transition-all duration-200",
        "bg-white/[0.03] hover:bg-white/[0.06]",
        "border border-transparent hover:border-white/5",
        isPressed && "scale-[0.98] bg-white/[0.08]",
        task.isCompleted && "opacity-40"
      )}
      role="listitem"
      onClick={handleToggle}
    >
      <PriorityBar priority={task.priority} />

      <div className="relative flex shrink-0 items-center self-center">
        <Checkbox
          checked={task.isCompleted}
          onCheckedChange={handleToggle}
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "size-5 rounded-full border-2 transition-all duration-200",
            "border-white/20 bg-transparent",
            "data-[state=checked]:border-accent/50 data-[state=checked]:bg-accent/15",
            "hover:border-white/30"
          )}
          aria-label={`Mark "${task.title}" as ${task.isCompleted ? "incomplete" : "complete"}`}
        />
      </div>

      <div className="min-w-0 flex-1">
        <span
          className={cn(
            "text-sm font-medium leading-snug transition-all duration-200",
            task.isCompleted && "line-through text-muted-foreground",
            task.isOverdue && !task.isCompleted && "text-accent"
          )}
        >
          {task.title}
        </span>

        {hasMeta && (
          <div className="mt-1 flex flex-wrap items-center gap-2">
            {task.due_date && task.type === "one_time" && !task.isOverdue && !task.isDueToday && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
                <Calendar className="size-3 shrink-0" />
                {format(parseISO(task.due_date), "MMM d")}
              </span>
            )}
            {task.isOverdue && !task.isCompleted && task.due_date && (
              <span className="inline-flex items-center gap-1 rounded-md bg-accent/15 px-2 py-0.5 text-xs font-semibold text-accent">
                <AlertCircle className="size-3 shrink-0" />
                Overdue {overdueDays(task.due_date)}d
              </span>
            )}
            {task.isDueToday && !task.isCompleted && !task.isOverdue && (
              <span className="inline-flex items-center gap-1 rounded-md bg-accent/15 px-2 py-0.5 text-xs font-semibold text-accent">
                Due Today
              </span>
            )}
          </div>
        )}
      </div>

      <div className="shrink-0 self-center">
        {task.type === "daily" ? (
          <Repeat className="size-3.5 text-muted-foreground/50" />
        ) : (
          <Clock className="size-3.5 text-muted-foreground/50" />
        )}
      </div>
    </div>
  );
}
