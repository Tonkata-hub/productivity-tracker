"use client";

import { Fragment, useState } from "react";
import { CheckCircle2, ChevronDown, Circle, Clock, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { TaskWithStatus } from "@/lib/types";
import { isMultiOptionDailyTask } from "@/lib/task-utils";

// ── Utilities (mirrored from page.tsx) ───────────────────────────────────────

function getQuantOptions(target: number): number[] {
  const half = target / 2;
  if (!Number.isFinite(target) || target <= 0) return [];
  if (!Number.isFinite(half) || half <= 0) return [target];
  return Array.from(new Set([half, target])).sort((a, b) => a - b);
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
  onToggle: () => void;
  onToggleOption: (optionIndex: number) => void;
  onLogValue: (amount: number) => void;
  onSchedule: () => void;
}

function TaskRowWithSchedule({
  task,
  today,
  isToggling,
  onToggle,
  onToggleOption,
  onLogValue,
  onSchedule,
}: RowProps) {
  const [isPressed, setIsPressed] = useState(false);
  const [showMultiOptions, setShowMultiOptions] = useState(false);

  const priorityDot: Record<string, string> = {
    high: "bg-red-500",
    medium: "bg-yellow-500",
    low: "bg-zinc-500",
  };

  const isQuantitative = task.target_value != null;
  const isMultiOptionDaily = isMultiOptionDailyTask(task);
  const dailyOptions = isMultiOptionDaily ? task.daily_options ?? [] : [];
  const completedOptionsCount = task.completed_option_indexes.length;

  const handleCardClick = () => {
    setIsPressed(false);
    if (isQuantitative) return;
    if (isMultiOptionDaily) {
      setShowMultiOptions((prev) => !prev);
      return;
    }
    onToggle();
  };
  const quantOptions = isQuantitative ? getQuantOptions(task.target_value ?? 0) : [];
  const overdueDays = task.due_date ? getOverdueDayCount(task.due_date) : null;
  const overdueSuffix = overdueDays ? ` by ${overdueDays} day${overdueDays === 1 ? "" : "s"}` : "";
  const overdueLabel = task.isCompleted ? `Was overdue${overdueSuffix}` : `Overdue${overdueSuffix}`;
  const futureDueLabel =
    task.due_date && task.due_date > today ? `Due ${formatDueDateLabel(task.due_date)}` : null;

  return (
    <div
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
        {!isQuantitative && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleCardClick();
            }}
            onPointerDown={(e) => {
              e.stopPropagation();
              if (!isToggling) setIsPressed(true);
            }}
            onPointerUp={(e) => {
              e.stopPropagation();
              setIsPressed(false);
            }}
            onPointerCancel={(e) => {
              e.stopPropagation();
              setIsPressed(false);
            }}
            onPointerLeave={(e) => {
              e.stopPropagation();
              setIsPressed(false);
            }}
            disabled={isToggling}
            className="shrink-0 cursor-pointer transition-transform duration-150 active:scale-90 disabled:cursor-default"
          >
            {task.isCompleted ? (
              <CheckCircle2 className="w-5 h-5 text-accent animate-task-check-pop" />
            ) : (
              <Circle className="w-5 h-5 text-muted-foreground" />
            )}
          </button>
        )}

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
            <p className={cn("text-[11px]", task.isCompleted ? "text-muted-foreground" : "text-red-400 font-medium")}>
              {overdueLabel}
            </p>
          )}
          {task.isDueToday && (
            <p className={cn("text-[11px] font-medium", task.isCompleted ? "text-muted-foreground" : "text-red-400")}>
              Due Today
            </p>
          )}
          {futureDueLabel && !task.isDueToday && !task.isOverdue && (
            <p className="text-[11px] text-muted-foreground">{futureDueLabel}</p>
          )}
          {isQuantitative && (
            <p className="text-[11px] text-muted-foreground">
              {task.currentValue} / {task.target_value} {task.unit}
            </p>
          )}
          {isMultiOptionDaily && dailyOptions.length > 0 && (
            <p className="text-[11px] text-muted-foreground">
              {completedOptionsCount}/{dailyOptions.length} options
            </p>
          )}
        </div>

        {isQuantitative && (
          <div className="flex shrink-0 items-center gap-1.5">
            {quantOptions.map((amount, index) => (
              <button
                key={`${task.id}-${amount}-${index}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onLogValue(amount);
                }}
                onPointerDown={(e) => e.stopPropagation()}
                disabled={isToggling}
                className="h-7 cursor-pointer rounded-md border border-white/10 bg-white/5 px-2 text-[11px] font-semibold tabular-nums text-muted-foreground transition-colors hover:border-white/20 hover:bg-white/10 hover:text-foreground disabled:cursor-default disabled:opacity-60"
                title={task.unit ? `Log ${amount} ${task.unit}` : `Log ${amount}`}
              >
                +{amount}
              </button>
            ))}
          </div>
        )}

        {/* Priority dot + Schedule button */}
        <div className="relative flex items-center gap-2.5 shrink-0 pr-[2.375rem]">
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
              className="absolute right-0 top-1/2 flex size-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-lg border border-white/15 bg-white/6 text-muted-foreground transition-colors hover:border-white/30 hover:bg-white/12 hover:text-foreground"
              title="Schedule on timeline"
            >
              <Clock className="size-3.5" />
            </button>
          )}
        </div>
      </div>

      {isMultiOptionDaily && dailyOptions.length > 0 && showMultiOptions && (
        <div className="mt-2 flex flex-wrap gap-1.5" onClick={(event) => event.stopPropagation()}>
          {dailyOptions.map((option, idx) => {
            const isDone = task.completed_option_indexes.includes(idx);
            return (
              <button
                key={`${task.id}-option-${idx}`}
                onClick={() => onToggleOption(idx)}
                disabled={isToggling}
                className={cn(
                  "cursor-pointer rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-all",
                  isDone
                    ? "border-accent/40 bg-accent/20 text-accent"
                    : "border-white/12 bg-white/5 text-muted-foreground hover:border-white/20 hover:text-foreground",
                  isToggling && "cursor-default opacity-60"
                )}
              >
                {option}
              </button>
            );
          })}
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
  onSchedule: (task: TaskWithStatus) => void;
  onToggle: (task: TaskWithStatus, optionIndex?: number) => void;
  onLogValue: (task: TaskWithStatus, amount: number) => void;
  onAddTask: (title: string) => void;
  onClosePanel?: () => void;
}

export function UnscheduledPanel({
  tasks,
  today,
  toggling,
  onSchedule,
  onToggle,
  onLogValue,
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
                onToggle={() => onToggle(task)}
                onToggleOption={(optionIndex) => onToggle(task, optionIndex)}
                onLogValue={(amount) => onLogValue(task, amount)}
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
