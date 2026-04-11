"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { TaskWithStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { CheckCircle2, Circle, Plus, X } from "lucide-react";
import { format, parseISO, differenceInDays } from "date-fns";

interface TaskItemV2Props {
  task: TaskWithStatus;
  onToggle?: (taskId: string) => void;
  onLogValue?: (taskId: string, amount: number) => void;
}

function overdueDays(dueDate: string): number {
  return differenceInDays(new Date(), parseISO(dueDate));
}

function getQuickIncrements(unit: string | null, target: number): number[] {
  const withTarget = (values: number[]): number[] => {
    const normalized = [...values];
    if (Number.isFinite(target) && target > 0) normalized.push(target);
    return Array.from(new Set(normalized.map((n) => (Number.isInteger(n) ? n : Number(n.toFixed(2)))))).sort(
      (a, b) => a - b
    );
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

export function TaskItemV2({ task, onToggle, onLogValue }: TaskItemV2Props) {
  const [isPressed, setIsPressed] = useState(false);
  const [showQuickLog, setShowQuickLog] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const containerRef = useRef<HTMLDivElement | null>(null);

  const isQuantitative = task.target_value != null;
  const priorityDot: Record<string, string> = {
    high: "bg-red-500",
    medium: "bg-yellow-500",
    low: "bg-zinc-500",
  };

  const handleToggle = () => onToggle?.(task.id);
  const handleCardClick = () => {
    setIsPressed(false);
    if (isQuantitative) {
      setShowQuickLog((prev) => !prev);
      if (!showQuickLog) setInputValue("");
      return;
    }
    handleToggle();
  };
  const handleCardKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleCardClick();
    }
  };
  const handleCardPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement | null;
    if (target?.closest("input")) return;
    setIsPressed(true);
  };
  const handleCardPointerUp = () => setIsPressed(false);
  const handleCardPointerCancel = () => setIsPressed(false);
  const handleCardPointerLeave = () => setIsPressed(false);

  const handleSubmit = () => {
    const amount = Number(inputValue);
    if (!onLogValue || !Number.isFinite(amount) || amount <= 0) return;
    onLogValue(task.id, amount);
    setShowQuickLog(false);
    setInputValue("");
  };

  useEffect(() => {
    if (!showQuickLog) return;
    const handleOutsidePointer = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (containerRef.current?.contains(target)) return;
      setShowQuickLog(false);
      setInputValue("");
    };
    document.addEventListener("mousedown", handleOutsidePointer);
    document.addEventListener("touchstart", handleOutsidePointer, { passive: true });
    return () => {
      document.removeEventListener("mousedown", handleOutsidePointer);
      document.removeEventListener("touchstart", handleOutsidePointer);
    };
  }, [showQuickLog]);

  const quickIncrements = isQuantitative ? getQuickIncrements(task.unit, task.target_value ?? 1) : [];
  const progress = isQuantitative ? Math.min((task.currentValue / (task.target_value ?? 1)) * 100, 100) : 0;
  const overdueLabel = task.due_date ? `Overdue ${overdueDays(task.due_date)}d` : "Overdue";
  const futureDueLabel =
    task.due_date && !task.isDueToday && !task.isOverdue ? `Due ${format(parseISO(task.due_date), "MMM d")}` : null;

  return (
    <div
      ref={containerRef}
      className={cn(
        "glass cursor-pointer rounded-xl px-4 py-3 select-none transition-all duration-150 ease-out hover:bg-white/10! will-change-transform",
        task.isCompleted && "opacity-40",
        isPressed && "translate-y-px scale-[0.985] bg-white/12! border-white/20 shadow-[0_8px_18px_rgba(0,0,0,0.22)]"
      )}
      role="button"
      tabIndex={0}
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
      onPointerDown={handleCardPointerDown}
      onPointerUp={handleCardPointerUp}
      onPointerCancel={handleCardPointerCancel}
      onPointerLeave={handleCardPointerLeave}
      aria-label={isQuantitative ? `Open quick log for ${task.title}` : `Toggle ${task.title}`}
      aria-pressed={!isQuantitative ? task.isCompleted : showQuickLog}
    >
      <div className="flex items-center gap-3">
        <button
          onClick={(event) => {
            event.stopPropagation();
            handleCardClick();
          }}
          onPointerDown={(event) => {
            event.stopPropagation();
            setIsPressed(true);
          }}
          onPointerUp={(event) => {
            event.stopPropagation();
            setIsPressed(false);
          }}
          onPointerCancel={(event) => {
            event.stopPropagation();
            setIsPressed(false);
          }}
          onPointerLeave={(event) => {
            event.stopPropagation();
            setIsPressed(false);
          }}
          className="shrink-0 cursor-pointer transition-transform duration-150 active:scale-90"
          aria-label={
            isQuantitative ? `Open quick log for ${task.title}` : task.isCompleted ? "Mark incomplete" : "Mark complete"
          }
        >
          {isQuantitative ? (
            task.isCompleted ? (
              <CheckCircle2 className="w-5 h-5 text-accent animate-task-check-pop" />
            ) : (
              <div className="flex size-5 items-center justify-center rounded-full border border-white/20 text-muted-foreground">
                <Plus className="w-3 h-3" />
              </div>
            )
          ) : task.isCompleted ? (
            <CheckCircle2 className="w-5 h-5 text-accent animate-task-check-pop" />
          ) : (
            <Circle className="w-5 h-5 text-muted-foreground" />
          )}
        </button>

        <div className="flex-1 min-w-0">
          <p
            className={cn(
              "text-sm font-medium truncate",
              task.isCompleted ? "line-through text-muted-foreground" : "text-foreground"
            )}
          >
            {task.title}
          </p>

          {task.isOverdue && (
            <p className={cn("text-[10px]", task.isCompleted ? "text-muted-foreground" : "text-red-400 font-medium")}>
              {overdueLabel}
            </p>
          )}
          {task.isDueToday && (
            <p className={cn("text-[10px] font-medium", task.isCompleted ? "text-muted-foreground" : "text-red-400")}>
              Due Today
            </p>
          )}
          {futureDueLabel && <p className="text-[10px] text-muted-foreground">{futureDueLabel}</p>}

          {isQuantitative && (
            <>
              <p className="text-[10px] text-muted-foreground tabular-nums">
                {task.currentValue} / {task.target_value} {task.unit}
              </p>
              <div className="mt-1 h-[2px] overflow-hidden rounded-full bg-white/10">
                <div
                  className={cn("h-full transition-all duration-500 ease-out", task.isCompleted ? "bg-accent" : "bg-white/30")}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </>
          )}
        </div>

        {task.priority && (
          <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", priorityDot[task.priority] ?? "")} title={task.priority} />
        )}
      </div>

      {isQuantitative && showQuickLog && onLogValue && (
        <div className="mt-3 space-y-2 rounded-xl border border-white/10 bg-white/3 p-2.5" onClick={(e) => e.stopPropagation()}>
          {quickIncrements.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              {quickIncrements.map((inc) => (
                <button
                  key={inc}
                  onClick={() => {
                    onLogValue(task.id, inc);
                    setShowQuickLog(false);
                    setInputValue("");
                  }}
                  className="cursor-pointer rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-semibold tabular-nums text-muted-foreground transition-all hover:border-accent/30 hover:bg-accent/10 hover:text-accent"
                >
                  +{inc}
                </button>
              ))}
            </div>
          )}

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
                  if (e.key === "Enter") handleSubmit();
                  if (e.key === "Escape") {
                    setShowQuickLog(false);
                    setInputValue("");
                  }
                }}
                className="no-spinner h-9 w-full rounded-lg border border-white/20 bg-background/40 px-3 pr-14 text-sm text-foreground placeholder-muted-foreground outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20"
                placeholder="Custom"
                aria-label={`Amount for ${task.title}`}
              />
              {task.unit && (
                <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground/70">
                  {task.unit}
                </span>
              )}
            </div>
            <button onClick={handleSubmit} className="h-9 cursor-pointer rounded-lg bg-accent/20 px-3 text-xs font-semibold text-accent transition-colors hover:bg-accent/30">
              Log
            </button>
            <button
              onClick={() => {
                setShowQuickLog(false);
                setInputValue("");
              }}
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
