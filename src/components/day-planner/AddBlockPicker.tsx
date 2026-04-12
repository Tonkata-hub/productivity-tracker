"use client";

import { useState, useEffect } from "react";
import { X, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { PlannerBlock, TaskWithStatus } from "@/lib/types";
import { minutesToClockTimeStr } from "@/lib/planner-utils";

interface Props {
  startMinutes: number;
  blocks: PlannerBlock[];
  unscheduledTasks: TaskWithStatus[];
  initialTask?: TaskWithStatus | null;
  onAdd: (title: string, taskId: string | null, taskType: string | null, durationMinutes: number) => void;
  onClose: () => void;
}

const DURATIONS = [
  { label: "15m", value: 15 },
  { label: "30m", value: 30 },
  { label: "45m", value: 45 },
  { label: "1h", value: 60 },
  { label: "1.5h", value: 90 },
  { label: "2h", value: 120 },
];

const PRIORITY_DOT: Record<string, string> = {
  high: "bg-accent",
  medium: "bg-yellow-400",
  low: "bg-zinc-500",
};

function hasOverlap(startMinutes: number, durationMinutes: number, blocks: PlannerBlock[]) {
  const candidateEnd = startMinutes + durationMinutes;
  return blocks.some((block) => {
    const blockStart = block.start_minutes;
    const blockEnd = block.start_minutes + block.duration_minutes;
    return startMinutes < blockEnd && candidateEnd > blockStart;
  });
}

export function AddBlockPicker({
  startMinutes,
  blocks,
  unscheduledTasks,
  initialTask,
  onAdd,
  onClose,
}: Props) {
  const [title, setTitle] = useState(initialTask?.title ?? "");
  const [selectedTask, setSelectedTask] = useState<TaskWithStatus | null>(initialTask ?? null);
  const [duration, setDuration] = useState(30);
  const [customDurationInput, setCustomDurationInput] = useState("");
  const isDurationDisabled = (durationMinutes: number) =>
    hasOverlap(startMinutes, durationMinutes, blocks);
  const hasValidDuration = DURATIONS.some((opt) => !isDurationDisabled(opt.value));
  const parsedCustomDuration = Number.parseInt(customDurationInput, 10);
  const hasCustomInput = customDurationInput.trim().length > 0;
  const isCustomDurationValid = Number.isFinite(parsedCustomDuration) && parsedCustomDuration > 0;
  const selectedDurationMinutes =
    hasCustomInput && isCustomDurationValid ? parsedCustomDuration : duration;
  const hasBlockingCustomDuration =
    hasCustomInput && (!isCustomDurationValid || isDurationDisabled(parsedCustomDuration));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const selectTask = (task: TaskWithStatus) => {
    if (selectedTask?.id === task.id) {
      setSelectedTask(null);
      setTitle("");
    } else {
      setSelectedTask(task);
      setTitle(task.title);
    }
  };

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (selectedTask && val !== selectedTask.title) {
      setSelectedTask(null);
    }
  };

  const handleAdd = () => {
    if (!title.trim() || hasBlockingCustomDuration || isDurationDisabled(selectedDurationMinutes)) return;
    onAdd(title.trim(), selectedTask?.id ?? null, selectedTask?.type ?? null, selectedDurationMinutes);
  };

  const handlePresetDurationClick = (minutes: number) => {
    setCustomDurationInput("");
    setDuration(minutes);
  };

  const endMinutes = startMinutes + selectedDurationMinutes;
  const timeLabel = `${minutesToClockTimeStr(startMinutes)} – ${minutesToClockTimeStr(endMinutes)}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 sm:p-6"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/50" style={{ backdropFilter: "blur(4px)" }} />
      <div
        className="relative w-full max-w-md glass-strong rounded-2xl p-5 flex flex-col gap-4 shadow-2xl"
        style={{ animation: "slide-in-up 0.22s cubic-bezier(0.22,1,0.36,1) both" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Add time block</h3>
            <p className="text-sm tabular-nums mt-0.5" style={{ color: "rgba(161,161,170,0.6)" }}>
              {timeLabel}
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex cursor-pointer items-center justify-center size-8 rounded-xl hover:bg-white/8 text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Task chips */}
        {unscheduledTasks.length > 0 && (
          <div className="flex flex-col gap-2">
            <p
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: "rgba(161,161,170,0.5)" }}
            >
              From today&apos;s tasks
            </p>
            <div className="flex flex-wrap gap-1.5">
              {unscheduledTasks.map((task) => (
                <button
                  key={task.id}
                  onClick={() => selectTask(task)}
                  className={cn(
                    "flex cursor-pointer items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-all duration-150",
                    selectedTask?.id === task.id
                      ? "bg-accent/15 text-accent border border-accent/30"
                      : "glass-subtle text-muted-foreground hover:text-foreground border border-white/8 hover:border-white/20"
                  )}
                >
                  {task.priority && (
                    <div
                      className={cn(
                        "size-1.5 rounded-full shrink-0",
                        PRIORITY_DOT[task.priority] ?? "bg-zinc-500"
                      )}
                    />
                  )}
                  <span className="max-w-[130px] truncate">{task.title}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Title input */}
        <div className="flex flex-col gap-1.5">
          <p
            className="text-xs font-semibold uppercase tracking-wider"
            style={{ color: "rgba(161,161,170,0.5)" }}
          >
            {unscheduledTasks.length > 0 ? "Or custom block title" : "Block title"}
          </p>
          <input
            type="text"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            autoFocus={!initialTask}
            placeholder="Focus time, meeting, break..."
            className="w-full px-3 py-2.5 text-base rounded-xl glass-subtle text-foreground placeholder:text-muted-foreground/35 focus:outline-none focus:border-accent/50 transition-colors border border-white/10"
          />
        </div>

        {/* Duration */}
        <div className="flex flex-col gap-1.5">
          <p
            className="text-xs font-semibold uppercase tracking-wider"
            style={{ color: "rgba(161,161,170,0.5)" }}
          >
            Duration
          </p>
          <div className="grid grid-cols-4 gap-1.5">
            {DURATIONS.map((opt) => (
              <button
                key={opt.value}
                disabled={isDurationDisabled(opt.value)}
                onClick={() => handlePresetDurationClick(opt.value)}
                className={cn(
                  "cursor-pointer py-2 rounded-xl text-sm font-semibold transition-all duration-150",
                  !hasCustomInput && duration === opt.value
                    ? "bg-accent/15 text-accent border border-accent/30"
                    : "glass-subtle text-muted-foreground border border-white/8 hover:text-foreground hover:border-white/20",
                  isDurationDisabled(opt.value) &&
                    "opacity-40 cursor-not-allowed hover:text-muted-foreground hover:border-white/8"
                )}
              >
                {opt.label}
              </button>
            ))}
            <input
              type="number"
              id="custom-duration-minutes"
              name="custom-duration-minutes"
              min={1}
              inputMode="numeric"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
              enterKeyHint="done"
              data-lpignore="true"
              data-1p-ignore="true"
              className={cn(
                "no-spinner col-span-2 px-3 py-2.5 text-base rounded-xl text-foreground placeholder:text-muted-foreground/35 focus:outline-none transition-colors border",
                hasCustomInput
                  ? "bg-accent/15 text-accent border-accent/30 focus:border-accent/50"
                  : "glass-subtle border-white/10 focus:border-accent/50"
              )}
              value={customDurationInput}
              onChange={(e) => setCustomDurationInput(e.target.value.replace(/\D/g, ""))}
              placeholder="Custom minutes"
            />
          </div>
          {hasCustomInput && !isCustomDurationValid && (
            <p className="text-xs text-red-300/85">Enter a valid number of minutes.</p>
          )}
          {hasCustomInput && isCustomDurationValid && isDurationDisabled(parsedCustomDuration) && (
            <p className="text-xs text-red-300/85">This custom duration overlaps another block at this time.</p>
          )}
          {!hasValidDuration && (
            <p className="text-xs text-red-300/85">
              No available duration at this start time. Pick another slot.
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <button
            onClick={onClose}
            className="flex-1 cursor-pointer py-2.5 rounded-xl text-sm font-semibold glass-subtle text-muted-foreground border border-white/8 hover:text-foreground hover:border-white/20 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleAdd}
            disabled={!title.trim() || (!hasCustomInput && !hasValidDuration) || hasBlockingCustomDuration || isDurationDisabled(selectedDurationMinutes)}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-accent/15 text-accent border border-accent/30 hover:bg-accent/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
          >
            <Plus className="size-3.5" />
            Add block
          </button>
        </div>
      </div>
    </div>
  );
}
