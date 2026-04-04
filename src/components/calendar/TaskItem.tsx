"use client";

import { useState } from "react";
import { TaskWithStatus, TaskPriority } from "@/lib/types";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { Repeat, Clock, AlertCircle, Calendar, Plus, Check } from "lucide-react";
import { format, parseISO, differenceInDays } from "date-fns";

interface TaskItemProps {
  task: TaskWithStatus;
  onToggle?: (taskId: string) => void;
  onLogValue?: (taskId: string, amount: number) => void;
}

function PriorityIndicator({ priority }: { priority: TaskPriority | null }) {
  if (!priority || priority === "low") return null;
  return (
    <div
      className={cn(
        "absolute left-0 top-1 bottom-1 w-[3px] rounded-full",
        priority === "high" ? "bg-mars-red" : "bg-amber-400"
      )}
    />
  );
}

function overdueDays(dueDate: string): number {
  return differenceInDays(new Date(), parseISO(dueDate));
}

export function TaskItem({ task, onToggle, onLogValue }: TaskItemProps) {
  const [isPressed, setIsPressed] = useState(false);
  const [showInput, setShowInput] = useState(false);
  const [inputValue, setInputValue] = useState("");

  const handleToggle = () => {
    setIsPressed(true);
    setTimeout(() => setIsPressed(false), 200);
    onToggle?.(task.id);
  };

  const handleLogSubmit = () => {
    const amount = parseFloat(inputValue);
    if (!isNaN(amount) && amount > 0) {
      onLogValue?.(task.id, amount);
    }
    setShowInput(false);
    setInputValue("");
  };

  const hasMeta = task.due_date || task.isOverdue || task.isDueToday;

  if (task.target_value != null) {
    const progress = Math.min((task.currentValue / task.target_value) * 100, 100);

    return (
      <div
        className={cn(
          "group relative cursor-pointer rounded-xl p-2.5 transition-all duration-200",
          "bg-white/3 hover:bg-white/6",
          "border border-transparent hover:border-white/5",
          task.isCompleted && "opacity-60"
        )}
        role="listitem"
        onClick={() => setShowInput(true)}
      >
        <PriorityIndicator priority={task.priority} />
        {/* Main row */}
        <div className="flex items-center gap-3">
          {/* + button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowInput((prev) => !prev);
              setInputValue("");
            }}
            className={cn(
              "shrink-0 flex size-5 items-center justify-center rounded-md border-2 transition-all duration-200",
              showInput ? "border-mars-red/60 bg-mars-red/20" : "border-white/20 bg-transparent hover:border-white/40"
            )}
            aria-label={`Log amount for ${task.title}`}
          >
            <Plus className="size-3 text-foreground/70" />
          </button>

          {/* Content */}
          <div className="min-w-0 flex-1">
            <span
              className={cn(
                "text-base font-semibold leading-snug transition-all duration-200",
                task.isCompleted && "line-through text-muted-foreground"
              )}
            >
              {task.title}
            </span>
            <div className="mt-0.5">
              <span className="text-sm tabular-nums text-muted-foreground">
                {task.currentValue} / {task.target_value} {task.unit}
              </span>
            </div>
            {/* Progress bar */}
            <div className="mt-1.5 h-[2px] overflow-hidden rounded-full bg-white/10">
              <div
                className={cn(
                  "h-full transition-all duration-500 ease-out",
                  task.isCompleted ? "bg-mars-red" : "bg-white/30"
                )}
                style={{ width: `${progress}%` }}
              />
            </div>
            {/* Meta info below progress bar */}
            {hasMeta && (
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                {task.isOverdue && !task.isCompleted && task.due_date && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-mars-red/15 px-2 py-0.5 text-sm font-semibold text-mars-red">
                    <AlertCircle className="size-3 shrink-0" />
                    Overdue {overdueDays(task.due_date)}d
                  </span>
                )}
                {task.isDueToday && !task.isCompleted && !task.isOverdue && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-mars-red/15 px-2 py-0.5 text-sm font-semibold text-mars-red">
                    Due Today
                  </span>
                )}
                {task.due_date && task.type === "one_time" && !task.isOverdue && !task.isDueToday && (
                  <span className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground">
                    <Calendar className="size-3 shrink-0" />
                    {format(parseISO(task.due_date), "MMM d")}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Type icon */}
          {task.type === "daily" ? (
            <Repeat className="shrink-0 size-4 text-muted-foreground" />
          ) : (
            <Clock className="shrink-0 size-4 text-muted-foreground" />
          )}
        </div>

        {/* Inline log input */}
        {showInput && (
          <div className="mt-2.5 flex items-center justify-center gap-2" onClick={(e) => e.stopPropagation()}>
            <input
              autoFocus
              type="number"
              min="0"
              step="any"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleLogSubmit();
                if (e.key === "Escape") {
                  setShowInput(false);
                  setInputValue("");
                }
              }}
              className="w-28 min-h-10 rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-base leading-none text-foreground placeholder-muted-foreground outline-none focus:border-mars-red/50 focus:ring-1 focus:ring-mars-red/20"
              placeholder={task.unit ?? "amount"}
            />
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleLogSubmit}
              className="flex min-h-10 items-center gap-1 rounded-lg bg-mars-red/20 px-3 py-2 text-base font-medium text-mars-red transition-colors hover:bg-mars-red/30"
            >
              <Check className="size-4 shrink-0" />
              Log
            </button>
            <button
              onClick={() => {
                setShowInput(false);
                setInputValue("");
              }}
              className="min-h-10 px-1 text-base text-muted-foreground transition-colors hover:text-foreground"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "group relative flex cursor-pointer items-center gap-3 rounded-xl p-2.5 transition-all duration-200",
        "bg-white/3 hover:bg-white/6",
        "border border-transparent hover:border-white/5",
        isPressed && "scale-[0.98] bg-white/8",
        task.isCompleted && "opacity-40"
      )}
      role="listitem"
      onClick={handleToggle}
    >
      <PriorityIndicator priority={task.priority} />
      {/* Checkbox with custom styling */}
      <div className="relative flex shrink-0 items-center self-center">
        <Checkbox
          checked={task.isCompleted}
          onCheckedChange={handleToggle}
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "size-5 rounded-full border-2 transition-all duration-200",
            "border-white/20 bg-transparent",
            "data-[state=checked]:border-white/40 data-[state=checked]:bg-white/10",
            "hover:border-white/30"
          )}
          aria-label={`Mark "${task.title}" as ${task.isCompleted ? "incomplete" : "complete"}`}
        />
      </div>

      {/* Task content */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-col gap-1">
          {/* Task title */}
          <span
            className={cn(
              "text-base font-semibold leading-snug transition-all duration-200",
              task.isCompleted && "line-through text-muted-foreground",
              task.isOverdue && !task.isCompleted && "text-mars-red"
            )}
          >
            {task.title}
          </span>

          {/* Meta info row - priority, due date, status badges */}
          {hasMeta && (
            <div className="flex flex-wrap items-center gap-2">
              {/* Due date for one-time tasks */}
              {task.due_date && task.type === "one_time" && !task.isOverdue && !task.isDueToday && (
                <span className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground">
                  <Calendar className="size-3 shrink-0" />
                  {format(parseISO(task.due_date), "MMM d")}
                </span>
              )}

              {/* Overdue badge */}
              {task.isOverdue && !task.isCompleted && task.due_date && (
                <span className="inline-flex items-center gap-1 rounded-md bg-mars-red/15 px-2 py-0.5 text-sm font-semibold text-mars-red">
                  <AlertCircle className="size-3 shrink-0" />
                  Overdue {overdueDays(task.due_date)}d
                </span>
              )}

              {/* Due today badge */}
              {task.isDueToday && !task.isCompleted && !task.isOverdue && (
                <span className="inline-flex items-center gap-1 rounded-md bg-mars-red/15 px-2 py-0.5 text-sm font-semibold text-mars-red">
                  Due Today
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Type icon - always visible, vertically centered */}
      <div className="shrink-0 self-center">
        {task.type === "daily" ? (
          <Repeat className="size-4 text-muted-foreground" />
        ) : (
          <Clock className="size-4 text-muted-foreground" />
        )}
      </div>
    </div>
  );
}
