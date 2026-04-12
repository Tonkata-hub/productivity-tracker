"use client";

import { Fragment, useState, useEffect, useRef } from "react";
import { CheckCircle2, ChevronDown, Circle, Clock, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { TaskWithStatus } from "@/lib/types";

// ── Utilities (mirrored from page.tsx) ───────────────────────────────────────

function getQuickIncrements(unit: string | null, target: number): number[] {
  const u = unit?.toLowerCase() ?? "";
  if (u === "ml") return [250, 500];
  if (u === "steps") return [1000, 2000];
  if (u === "l" || u === "liters" || u === "litres") return [0.25, 0.5];
  if (u === "min" || u === "minutes") return [15, 30];
  if (u === "pages") return [5, 10];
  const half = Math.ceil(target / 2);
  return [1, 2, half].filter((v, i, arr) => arr.indexOf(v) === i && v > 0);
}

function getOverdueDayCount(dueDateISO: string): number | null {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDateISO + "T00:00:00");
  const diff = Math.floor((today.getTime() - due.getTime()) / 86400000);
  return diff > 0 ? diff : null;
}

function formatDueDateLabel(dateISO: string): string {
  return new Date(dateISO + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function computeSeparators(tasks: TaskWithStatus[], today: string) {
  const firstOneTimeIdx = tasks.findIndex((t) => t.type === "one_time");
  const endOfFirstOneTimeBlock = (() => {
    if (firstOneTimeIdx < 0) return -1;
    let end = firstOneTimeIdx;
    while (end + 1 < tasks.length && tasks[end + 1]?.type === "one_time") end++;
    return end;
  })();
  const firstFutureOneTimeIdx = tasks.findIndex(
    (t) => t.type === "one_time" && !!t.due_date && t.due_date > today
  );
  const hasDailyBeforeFutureOneTime =
    firstFutureOneTimeIdx > 0 &&
    tasks.slice(0, firstFutureOneTimeIdx).some((t) => t.type === "daily");
  return { endOfFirstOneTimeBlock, firstFutureOneTimeIdx, hasDailyBeforeFutureOneTime };
}

// ── TaskRow with schedule button ─────────────────────────────────────────────

interface RowProps {
  task: TaskWithStatus;
  today: string;
  isToggling: boolean;
  showQuantInput: boolean;
  quantInputValue: string;
  onToggle: () => void;
  onLogValue: (amount: number) => void;
  onToggleQuantInput: () => void;
  onQuantInputChange: (v: string) => void;
  onCloseQuantInput: () => void;
  onSchedule: () => void;
}

function TaskRowWithSchedule({
  task,
  today,
  isToggling,
  showQuantInput,
  quantInputValue,
  onToggle,
  onLogValue,
  onToggleQuantInput,
  onQuantInputChange,
  onCloseQuantInput,
  onSchedule,
}: RowProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPressed, setIsPressed] = useState(false);

  const priorityDot: Record<string, string> = {
    high: "bg-red-500",
    medium: "bg-yellow-500",
    low: "bg-zinc-500",
  };

  const isQuantitative = task.target_value != null;

  const handleCardClick = () => {
    setIsPressed(false);
    if (isQuantitative) {
      if (showQuantInput) {
        onCloseQuantInput();
      } else {
        onToggleQuantInput();
      }
      return;
    }
    onToggle();
  };

  const handleSubmit = () => {
    const amount = Number(quantInputValue);
    if (!Number.isFinite(amount) || amount === 0) return;
    onLogValue(amount);
    onCloseQuantInput();
  };

  const quickIncrements = isQuantitative ? getQuickIncrements(task.unit, task.target_value ?? 1) : [];
  const overdueDays = task.due_date ? getOverdueDayCount(task.due_date) : null;
  const overdueSuffix = overdueDays ? ` by ${overdueDays} day${overdueDays === 1 ? "" : "s"}` : "";
  const overdueLabel = task.isCompleted ? `Was overdue${overdueSuffix}` : `Overdue${overdueSuffix}`;
  const futureDueLabel =
    task.due_date && task.due_date > today ? `Due ${formatDueDateLabel(task.due_date)}` : null;

  useEffect(() => {
    if (!showQuantInput) return;
    const handle = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current?.contains(e.target as Node)) return;
      onCloseQuantInput();
    };
    document.addEventListener("mousedown", handle);
    document.addEventListener("touchstart", handle, { passive: true });
    return () => {
      document.removeEventListener("mousedown", handle);
      document.removeEventListener("touchstart", handle);
    };
  }, [showQuantInput, onCloseQuantInput]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "glass cursor-pointer rounded-xl px-4 py-3 select-none transition-all duration-150 ease-out hover:bg-white/[0.07]! will-change-transform",
        task.isCompleted && "opacity-40",
        isPressed &&
          "translate-y-px scale-[0.985] bg-white/12! border-white/20 shadow-[0_8px_18px_rgba(0,0,0,0.22)]",
        isToggling && "pointer-events-none"
      )}
      role="button"
      tabIndex={0}
      onClick={handleCardClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleCardClick(); }
      }}
      onPointerDown={(e) => {
        if (isToggling) return;
        if ((e.target as HTMLElement)?.closest("input, button")) return;
        setIsPressed(true);
      }}
      onPointerUp={() => setIsPressed(false)}
      onPointerCancel={() => setIsPressed(false)}
      onPointerLeave={() => setIsPressed(false)}
    >
      <div className="flex items-center gap-3">
        {/* Completion toggle */}
        <button
          onClick={(e) => { e.stopPropagation(); handleCardClick(); }}
          onPointerDown={(e) => { e.stopPropagation(); if (!isToggling) setIsPressed(true); }}
          onPointerUp={(e) => { e.stopPropagation(); setIsPressed(false); }}
          onPointerCancel={(e) => { e.stopPropagation(); setIsPressed(false); }}
          onPointerLeave={(e) => { e.stopPropagation(); setIsPressed(false); }}
          disabled={isToggling}
          className="shrink-0 cursor-pointer transition-transform duration-150 active:scale-90 disabled:cursor-default"
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

        {/* Task info */}
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
          {futureDueLabel && !task.isDueToday && !task.isOverdue && (
            <p className="text-[10px] text-muted-foreground">{futureDueLabel}</p>
          )}
          {isQuantitative && (
            <p className="text-[10px] text-muted-foreground">
              {task.currentValue} / {task.target_value} {task.unit}
            </p>
          )}
        </div>

        {/* Priority dot + Schedule button */}
        <div className="flex items-center gap-2.5 shrink-0">
          {task.priority && (
            <div
              className={cn("w-1.5 h-1.5 rounded-full", priorityDot[task.priority] ?? "")}
              title={task.priority}
            />
          )}
          {!task.isCompleted && (
            <button
              onClick={(e) => { e.stopPropagation(); onSchedule(); }}
              onPointerDown={(e) => e.stopPropagation()}
              aria-label={`Schedule ${task.title}`}
              className="flex cursor-pointer items-center justify-center size-7 rounded-lg border border-white/15 bg-white/6 text-muted-foreground hover:text-foreground hover:bg-white/12 hover:border-white/30 transition-colors"
              title="Schedule on timeline"
            >
              <Clock className="size-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Quantitative quick-log panel */}
      {isQuantitative && showQuantInput && (
        <div
          className="mt-3 space-y-2 rounded-xl border border-white/10 bg-white/3 p-2.5"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex flex-wrap items-center gap-1.5">
            {quickIncrements.map((inc) => (
              <button
                key={inc}
                onClick={() => { onLogValue(inc); onCloseQuantInput(); }}
                disabled={isToggling}
                className="cursor-pointer rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-semibold tabular-nums text-muted-foreground transition-all hover:border-white/20 hover:bg-white/8 hover:text-foreground disabled:opacity-60"
              >
                +{inc}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                autoFocus
                type="number"
                step="any"
                value={quantInputValue}
                onChange={(e) => onQuantInputChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSubmit();
                  if (e.key === "Escape") onCloseQuantInput();
                }}
                className="no-spinner h-9 w-full rounded-lg border border-white/20 bg-background/40 px-3 pr-14 text-base text-foreground placeholder-muted-foreground outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20"
                placeholder="Custom"
              />
              {task.unit && (
                <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground/70">
                  {task.unit}
                </span>
              )}
            </div>
            <button
              onClick={handleSubmit}
              disabled={isToggling}
              className="h-9 cursor-pointer rounded-lg bg-accent/15 px-3 text-xs font-semibold text-accent transition-colors hover:bg-accent/20 disabled:cursor-default disabled:opacity-60"
            >
              Log
            </button>
            <button
              onClick={onCloseQuantInput}
              className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-white/10 bg-white/5 text-muted-foreground transition-colors hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Panel ────────────────────────────────────────────────────────────────────

export interface UnscheduledPanelProps {
  tasks: TaskWithStatus[];
  today: string;
  toggling: Set<string>;
  openQuantInputTaskId: string | null;
  quantInputValue: string;
  onSchedule: (task: TaskWithStatus) => void;
  onToggle: (task: TaskWithStatus) => void;
  onLogValue: (task: TaskWithStatus, amount: number) => void;
  onToggleQuantInput: (taskId: string) => void;
  onQuantInputChange: (v: string) => void;
  onCloseQuantInput: () => void;
  onAddTask: (title: string) => void;
  onClosePanel?: () => void;
}

export function UnscheduledPanel({
  tasks,
  today,
  toggling,
  openQuantInputTaskId,
  quantInputValue,
  onSchedule,
  onToggle,
  onLogValue,
  onToggleQuantInput,
  onQuantInputChange,
  onCloseQuantInput,
  onAddTask,
  onClosePanel,
}: UnscheduledPanelProps) {
  const [newTitle, setNewTitle] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  const completedCount = tasks.filter((t) => t.isCompleted).length;
  const { endOfFirstOneTimeBlock, firstFutureOneTimeIdx, hasDailyBeforeFutureOneTime } =
    computeSeparators(tasks, today);

  const handleAddSubmit = () => {
    if (!newTitle.trim()) return;
    onAddTask(newTitle.trim());
    setNewTitle("");
    setShowAdd(false);
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="px-0.5 flex items-center justify-between">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-foreground">Today</h2>
          <p className="mt-1 text-xs text-muted-foreground/80">Today&apos;s unscheduled tasks</p>
        </div>
        <div className="flex items-center gap-2">
          {tasks.length > 0 && (
            <span className="text-xs text-muted-foreground">
              {completedCount} / {tasks.length}
            </span>
          )}
          {onClosePanel && (
            <button
              onClick={onClosePanel}
              className="flex size-7 cursor-pointer items-center justify-center rounded-lg border border-white/12 bg-white/5 text-muted-foreground/80 transition-colors hover:border-white/25 hover:bg-white/10 hover:text-foreground"
              aria-label="Close unscheduled tasks drawer"
              title="Close"
            >
              <ChevronDown className="size-4" />
            </button>
          )}
        </div>
      </div>

      {/* Task rows */}
      {tasks.length === 0 ? (
        <div className="glass rounded-2xl p-6 text-center">
          <p className="text-muted-foreground text-sm">No tasks for today</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {tasks.map((task, index) => (
            <Fragment key={task.id}>
              {/* Same separator logic as homepage */}
              {index === endOfFirstOneTimeBlock + 1 &&
                endOfFirstOneTimeBlock >= 0 &&
                endOfFirstOneTimeBlock < tasks.length - 1 && (
                  <div className="my-2.5 h-px bg-white/14" aria-hidden="true" />
                )}
              {index === firstFutureOneTimeIdx && hasDailyBeforeFutureOneTime && (
                <div className="my-2.5 h-px bg-white/14" aria-hidden="true" />
              )}
              <TaskRowWithSchedule
                task={task}
                today={today}
                isToggling={toggling.has(task.id)}
                showQuantInput={openQuantInputTaskId === task.id}
                quantInputValue={quantInputValue}
                onToggle={() => onToggle(task)}
                onLogValue={(amount) => onLogValue(task, amount)}
                onToggleQuantInput={() => onToggleQuantInput(task.id)}
                onQuantInputChange={onQuantInputChange}
                onCloseQuantInput={onCloseQuantInput}
                onSchedule={() => onSchedule(task)}
              />
            </Fragment>
          ))}
        </div>
      )}

      {/* Add unscheduled task */}
      {showAdd ? (
        <div className="glass rounded-xl px-4 py-2.5 flex items-center gap-2">
          <input
            autoFocus
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAddSubmit();
              if (e.key === "Escape") { setShowAdd(false); setNewTitle(""); }
            }}
            placeholder="Task title..."
            className="flex-1 bg-transparent text-base text-foreground placeholder:text-muted-foreground/40 outline-none"
          />
          <button
            onClick={handleAddSubmit}
            disabled={!newTitle.trim()}
            className="cursor-pointer text-xs font-semibold text-accent hover:text-accent/80 disabled:opacity-40 disabled:cursor-not-allowed transition-colors px-1 shrink-0"
          >
            Add
          </button>
          <button
            onClick={() => { setShowAdd(false); setNewTitle(""); }}
            className="cursor-pointer text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            <X className="size-3.5" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowAdd(true)}
          className="flex cursor-pointer items-center gap-2 px-1 py-1.5 text-xs text-muted-foreground/45 hover:text-muted-foreground transition-colors rounded-lg w-full"
        >
          <Plus className="size-3.5" />
          Add a task for today
        </button>
      )}
    </div>
  );
}
