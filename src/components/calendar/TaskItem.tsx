"use client";

import { useRef, useEffect, useState } from "react";
import { TaskWithStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { CheckCircle2, Circle, Plus, X, AlertCircle, Calendar } from "lucide-react";
import { format, parseISO, differenceInDays } from "date-fns";
import { isMultiOptionDailyTask } from "@/lib/task-utils";

interface TaskItemProps {
  task: TaskWithStatus;
  onToggle?: (taskId: string, optionIndex?: number) => void;
  onLogValue?: (taskId: string, amount: number) => void;
}

const PRIORITY_DOT: Record<string, string> = {
  high: "bg-red-500",
  medium: "bg-yellow-500",
  low: "bg-zinc-500",
};

function getQuickIncrements(unit: string | null, target: number): number[] {
  const withTarget = (values: number[]): number[] => {
    const normalized = [...values];
    if (Number.isFinite(target) && target > 0) normalized.push(target);
    return Array.from(
      new Set(normalized.map((n) => (Number.isInteger(n) ? n : Number(n.toFixed(2)))))
    ).sort((a, b) => a - b);
  };

  const u = (unit ?? "").toLowerCase();
  if (u === "ml") return withTarget([250, 500]);
  if (u === "steps") return withTarget([1000, 2000]);
  if (u === "l" || u === "liters" || u === "litres") return withTarget([0.25, 0.5]);
  if (u === "min" || u === "mins" || u === "minutes") return withTarget([15, 30]);
  if (u === "pages") return withTarget([5, 10]);
  if (u === "times" || u === "reps") return withTarget([1, 2, Math.ceil(target / 2)]);
  const quarter = Math.ceil(target / 4);
  return withTarget(quarter > 1 ? [1, quarter] : [1]);
}

function overdueDayCount(dueDate: string): number {
  return differenceInDays(new Date(), parseISO(dueDate));
}

export function TaskItem({ task, onToggle, onLogValue }: TaskItemProps) {
  const [showInput, setShowInput] = useState(false);
  const [showMultiOptions, setShowMultiOptions] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const isQuantitative = task.target_value != null;
  const isMultiOptionDaily = isMultiOptionDailyTask(task);
  const dailyOptions = isMultiOptionDaily ? task.daily_options ?? [] : [];
  const completedOptionsCount = task.completed_option_indexes.length;
  const hasMeta = task.due_date || task.isOverdue || task.isDueToday;

  const handleToggle = () => {
    onToggle?.(task.id);
  };

  const handleCardClick = () => {
    if (isQuantitative) {
      setShowInput((prev) => !prev);
      setInputValue("");
    } else {
      if (isMultiOptionDaily) {
        setShowMultiOptions((prev) => !prev);
        return;
      }
      handleToggle();
    }
  };

  const handleLogSubmit = () => {
    const amount = parseFloat(inputValue);
    if (!isNaN(amount) && amount > 0) {
      onLogValue?.(task.id, amount);
    }
    setShowInput(false);
    setInputValue("");
  };

  const closeInput = () => {
    setShowInput(false);
    setInputValue("");
  };

  // Close on outside click
  useEffect(() => {
    if (!showInput && !showMultiOptions) return;
    const handleOutside = (e: MouseEvent | TouchEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setShowMultiOptions(false);
        closeInput();
      }
    };
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("touchstart", handleOutside, { passive: true });
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
    };
  }, [showInput, showMultiOptions]);

  const quickIncrements = isQuantitative
    ? getQuickIncrements(task.unit, task.target_value ?? 1)
    : [];

  const progress = isQuantitative
    ? Math.min((task.currentValue / (task.target_value ?? 1)) * 100, 100)
    : 0;

  return (
    <div
      ref={containerRef}
      className={cn(
        "glass cursor-pointer rounded-xl px-4 py-3 transition-all duration-200 hover:bg-white/10!",
        task.isCompleted && "opacity-40"
      )}
      role="listitem"
      onClick={handleCardClick}
    >
      <div className="flex items-center gap-3">
        {/* Left icon */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleCardClick();
          }}
          className="shrink-0 cursor-pointer transition-transform active:scale-90"
          aria-label={
            isQuantitative
              ? `Log amount for ${task.title}`
              : task.isCompleted
              ? "Mark incomplete"
              : "Mark complete"
          }
        >
          {isQuantitative ? (
            <div
              className={cn(
                "flex size-5 items-center justify-center rounded-full border transition-colors",
                showInput ? "border-accent/60 bg-accent/20" : "border-white/20"
              )}
            >
              <Plus className="w-3 h-3 text-muted-foreground" />
            </div>
          ) : task.isCompleted ? (
            <CheckCircle2 className="w-5 h-5 text-accent" />
          ) : (
            <Circle className="w-5 h-5 text-muted-foreground" />
          )}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p
            className={cn(
              "text-sm font-medium truncate",
              task.isCompleted ? "line-through text-muted-foreground" : "text-foreground",
              task.isOverdue && !task.isCompleted && "text-mars-red"
            )}
          >
            {task.title}
          </p>

          {/* Quantitative progress */}
          {isQuantitative && (
            <>
              <p className="text-[11px] text-muted-foreground tabular-nums">
                {task.currentValue} / {task.target_value} {task.unit}
              </p>
              <div className="mt-1 h-[2px] overflow-hidden rounded-full bg-white/10">
                <div
                  className={cn(
                    "h-full transition-all duration-500 ease-out",
                    task.isCompleted ? "bg-accent" : "bg-white/30"
                  )}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </>
          )}
          {isMultiOptionDaily && dailyOptions.length > 0 && (
            <p className="text-[11px] text-muted-foreground">
              {completedOptionsCount}/{dailyOptions.length} options
            </p>
          )}

          {/* Meta info */}
          {hasMeta && !isQuantitative && (
            <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
              {task.isOverdue && !task.isCompleted && task.due_date && (
                <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-red-400">
                  <AlertCircle className="size-2.5 shrink-0" />
                  Overdue {overdueDayCount(task.due_date)}d
                </span>
              )}
              {task.isDueToday && !task.isCompleted && !task.isOverdue && (
                <span className="text-[11px] font-medium text-red-400">Due Today</span>
              )}
              {task.due_date && task.type === "one_time" && !task.isOverdue && !task.isDueToday && (
                <span className="inline-flex items-center gap-0.5 text-[11px] text-muted-foreground">
                  <Calendar className="size-2.5 shrink-0" />
                  {format(parseISO(task.due_date), "MMM d")}
                </span>
              )}
            </div>
          )}

          {/* Meta info for quantitative */}
          {hasMeta && isQuantitative && (
            <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
              {task.isOverdue && !task.isCompleted && task.due_date && (
                <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-red-400">
                  <AlertCircle className="size-2.5 shrink-0" />
                  Overdue {overdueDayCount(task.due_date)}d
                </span>
              )}
              {task.isDueToday && !task.isCompleted && !task.isOverdue && (
                <span className="text-[11px] font-medium text-red-400">Due Today</span>
              )}
            </div>
          )}
        </div>

        {/* Priority dot */}
        {task.priority && (
          <div
            className={cn("w-1.5 h-1.5 rounded-full shrink-0", PRIORITY_DOT[task.priority] ?? "")}
            title={task.priority}
          />
        )}
      </div>

      {/* Quantitative quick-log panel */}
      {isMultiOptionDaily && dailyOptions.length > 0 && onToggle && showMultiOptions && (
        <div className="mt-2 space-y-2" onClick={(e) => e.stopPropagation()}>
          {dailyOptions.map((option, idx) => {
            const isDone = task.completed_option_indexes.includes(idx);
            return (
              <button
                key={`${task.id}-option-${idx}`}
                onClick={() => {
                  onToggle(task.id, idx);
                  setShowMultiOptions(false);
                }}
                className={cn(
                  "flex w-full items-center justify-between cursor-pointer rounded-xl border px-3 py-2 text-left text-xs font-semibold transition-all",
                  isDone
                    ? "border-accent/50 bg-accent/18 text-accent shadow-[0_0_0_1px_rgba(34,197,94,0.2)]"
                    : "border-white/15 bg-white/8 text-foreground/90 hover:border-white/30 hover:bg-white/12"
                )}
              >
                <span className="truncate">{option}</span>
                <span className={cn("ml-3 text-[10px] uppercase tracking-wide", isDone ? "text-accent" : "text-muted-foreground")}>{isDone ? "Done" : "Tap"}</span>
              </button>
            );
          })}
        </div>
      )}

      {isQuantitative && showInput && (
        <div
          className="mt-3 space-y-2 rounded-xl border border-white/10 bg-white/3 p-2.5"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Quick increment buttons */}
          {quickIncrements.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              {quickIncrements.map((inc) => (
                <button
                  key={inc}
                  onClick={() => {
                    onLogValue?.(task.id, inc);
                    closeInput();
                  }}
                  className="cursor-pointer rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-semibold tabular-nums text-muted-foreground transition-all hover:border-accent/30 hover:bg-accent/10 hover:text-accent"
                >
                  +{inc}
                </button>
              ))}
            </div>
          )}

          {/* Custom input row */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                autoFocus
                type="number"
                step="any"
                min="0"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleLogSubmit();
                  if (e.key === "Escape") closeInput();
                }}
                className="no-spinner h-9 w-full rounded-lg border border-white/20 bg-background/40 px-3 pr-14 text-base text-foreground placeholder-muted-foreground outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20"
                placeholder="Custom"
                aria-label={`Amount for ${task.title}`}
              />
              {task.unit && (
                <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground/70">
                  {task.unit}
                </span>
              )}
            </div>
            <button
              onClick={handleLogSubmit}
              className="h-9 cursor-pointer rounded-lg bg-accent/20 px-3 text-xs font-semibold text-accent transition-colors hover:bg-accent/30"
            >
              Log
            </button>
            <button
              onClick={closeInput}
              className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-white/10 bg-white/5 text-muted-foreground transition-colors hover:text-foreground"
              aria-label="Close quick log"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
