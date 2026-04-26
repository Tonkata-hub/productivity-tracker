"use client";

import { useState, useEffect, useSyncExternalStore } from "react";
import { ChevronUp } from "lucide-react";
import { formatDateISO, getTasksForDate } from "@/lib/calendar-utils";
import { supabase } from "@/lib/supabase";
import { Task, TaskWithStatus, PlannerBlock } from "@/lib/types";
import { mockTasks, mockTaskCompletions, mockPlannerBlocks } from "@/lib/mock-data";
import { DayTimeline } from "@/components/day-planner/DayTimeline";
import { UnscheduledPanel } from "@/components/day-planner/UnscheduledPanel";
import { AddBlockPicker } from "@/components/day-planner/AddBlockPicker";
import { cn } from "@/lib/utils";
import { buildCompletionState } from "@/lib/task-completion-utils";
import { completionOptionKey, isMultiOptionDailyTask, normalizeTasks } from "@/lib/task-utils";

const useMock = process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true";
const DESKTOP_MEDIA_QUERY = "(min-width: 768px)";
const TEMP_TASK_ID_PREFIX = "temp-task-";

type RawCompletion = {
  id?: string;
  task_id: string;
  date: string;
  value: number | null;
  daily_option_index?: number | null;
  optimistic_id?: string;
};

function hasOverlap(startMinutes: number, durationMinutes: number, existingBlocks: PlannerBlock[]) {
  const candidateEnd = startMinutes + durationMinutes;
  return existingBlocks.some((block) => {
    const blockStart = block.start_minutes;
    const blockEnd = block.start_minutes + block.duration_minutes;
    return startMinutes < blockEnd && candidateEnd > blockStart;
  });
}

function buildSets(completions: RawCompletion[], dateISO: string) {
  const rows = completions
    .filter((c) => c.date === dateISO)
    .map((c) => ({
      task_id: c.task_id,
      date: c.date,
      value: c.value,
      daily_option_index: c.daily_option_index ?? null,
    }));
  return buildCompletionState(rows);
}

function subscribeDesktopQuery(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};
  const mediaQuery = window.matchMedia(DESKTOP_MEDIA_QUERY);
  mediaQuery.addEventListener("change", onStoreChange);
  return () => mediaQuery.removeEventListener("change", onStoreChange);
}

function getDesktopSnapshot() {
  if (typeof window === "undefined") return false;
  return window.matchMedia(DESKTOP_MEDIA_QUERY).matches;
}

export default function DayPlannerPage() {
  const [tasks, setTasks] = useState<Task[]>(useMock ? mockTasks : []);
  const [rawCompletions, setRawCompletions] = useState<RawCompletion[]>(
    useMock ? mockTaskCompletions : []
  );
  const [blocks, setBlocks] = useState<PlannerBlock[]>(useMock ? mockPlannerBlocks : []);
  const [now, setNow] = useState(new Date());
  const todayISO = formatDateISO(now);
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const [pickerSlot, setPickerSlot] = useState<number | null>(null);
  const [pendingTask, setPendingTask] = useState<TaskWithStatus | null>(null);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(true);
  const [loading, setLoading] = useState(!useMock);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isDesktop = useSyncExternalStore(subscribeDesktopQuery, getDesktopSnapshot, () => false);

  // Task interaction state (mirrors homepage)
  const [toggling, setToggling] = useState<Set<string>>(new Set());

  // Derive today's tasks with completion status
  const { completionSet, quantValues, optionCompletions } = buildSets(rawCompletions, todayISO);
  const todayTasks = getTasksForDate(tasks, todayISO, completionSet, quantValues, optionCompletions);

  // Tasks not yet placed on the timeline
  const scheduledTaskIds = new Set(blocks.map((b) => b.task_id).filter(Boolean));
  const unscheduledTasks = todayTasks.filter((t) => !scheduledTaskIds.has(t.id));

  // Clock tick every 60s
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isDesktop) setIsMobileDrawerOpen(true);
  }, [isDesktop]);

  const formatPersistenceError = (prefix: string, error: unknown) => {
    const details =
      error && typeof error === "object" && "message" in error
        ? String((error as { message?: unknown }).message ?? "")
        : "";
    return details ? `${prefix}: ${details}` : prefix;
  };

  // Data load for current date
  useEffect(() => {
    if (useMock) return;
    let isCancelled = false;

    async function load() {
      setLoading(true);
      const [tasksRes, completionsRes, blocksRes] = await Promise.all([
        supabase.from("tasks").select("*"),
        supabase.from("task_completions").select("id, task_id, date, value, daily_option_index").eq("date", todayISO),
        supabase.from("planner_blocks").select("*").eq("date", todayISO),
      ]);

      if (isCancelled) return;
      if (tasksRes.data) setTasks(normalizeTasks(tasksRes.data as Task[]));
      if (completionsRes.data) setRawCompletions(completionsRes.data as RawCompletion[]);
      if (blocksRes.data) setBlocks(blocksRes.data as PlannerBlock[]);
      setLoading(false);
    }

    load();
    return () => {
      isCancelled = true;
    };
  }, [todayISO]);

  // ── Task interactions (same logic as homepage) ──────────────────────────

  const toggleTask = async (task: TaskWithStatus, optionIndex?: number) => {
    if (task.target_value != null) return; // quantitative tasks use logTaskValue
    const wasCompleted = task.isCompleted;
    const isMultiOption = isMultiOptionDailyTask(task);
    const isValidOptionIndex = Number.isInteger(optionIndex) && (optionIndex as number) >= 0;
    const mapKey = completionOptionKey(task.id, todayISO);
    const previousOptionSet = new Set(optionCompletions.get(mapKey) ?? []);
    const wasOptionCompleted = isMultiOption && isValidOptionIndex && previousOptionSet.has(optionIndex!);
    if (isMultiOption && !isValidOptionIndex) return;
    setToggling((prev) => new Set([...prev, task.id]));

    // Optimistic
    if (task.type === "daily") {
      if (isMultiOption && isValidOptionIndex) {
        setRawCompletions((prev) => {
          if (wasOptionCompleted) {
            return prev.filter(
              (c) => !(c.task_id === task.id && c.date === todayISO && c.daily_option_index === optionIndex)
            );
          }
          return [...prev, { task_id: task.id, date: todayISO, value: null, daily_option_index: optionIndex }];
        });
      } else {
        setRawCompletions((prev) =>
          wasCompleted
            ? prev.filter((c) => !(c.task_id === task.id && c.date === todayISO))
            : [...prev, { task_id: task.id, date: todayISO, value: null }]
        );
      }
    } else {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === task.id
            ? { ...t, is_completed: !wasCompleted, completed_at: wasCompleted ? null : new Date().toISOString() }
            : t
        )
      );
    }

    if (!useMock) {
      if (task.type === "daily") {
        if (isMultiOption && isValidOptionIndex) {
          if (wasOptionCompleted) {
            await supabase
              .from("task_completions")
              .delete()
              .eq("task_id", task.id)
              .eq("date", todayISO)
              .eq("daily_option_index", optionIndex!)
              .is("value", null);
          } else {
            await supabase.from("task_completions").insert({
              task_id: task.id,
              date: todayISO,
              completed_at: new Date().toISOString(),
              daily_option_index: optionIndex!,
            });
          }
        } else if (wasCompleted) {
          await supabase.from("task_completions").delete().eq("task_id", task.id).eq("date", todayISO);
        } else {
          await supabase
            .from("task_completions")
            .insert({ task_id: task.id, date: todayISO, completed_at: new Date().toISOString() });
        }
      } else {
        await supabase
          .from("tasks")
          .update({ is_completed: !wasCompleted, completed_at: wasCompleted ? null : new Date().toISOString() })
          .eq("id", task.id);
      }
    }

    setToggling((prev) => { const n = new Set(prev); n.delete(task.id); return n; });
  };

  const logTaskValue = async (task: TaskWithStatus, amount: number) => {
    if (task.target_value == null || !Number.isFinite(amount) || amount === 0) return;
    setToggling((prev) => new Set([...prev, task.id]));
    const optimisticId = `optimistic-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    setRawCompletions((prev) => [
      ...prev,
      { task_id: task.id, date: todayISO, value: amount, optimistic_id: optimisticId },
    ]);

    if (!useMock) {
      const { error } = await supabase
        .from("task_completions")
        .insert({ task_id: task.id, date: todayISO, value: amount, completed_at: new Date().toISOString() });

      if (error) {
        setRawCompletions((prev) => {
          return prev.filter((c) => c.optimistic_id !== optimisticId);
        });
      }
    }

    setToggling((prev) => { const n = new Set(prev); n.delete(task.id); return n; });
  };

  const addTask = async (title: string) => {
    const tempId = `temp-task-${Date.now()}`;
    const newTask: Task = {
      id: tempId,
      title,
      type: "one_time",
      priority: null,
      due_date: todayISO,
      is_completed: false,
      completed_at: null,
      target_value: null,
      unit: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setTasks((prev) => [...prev, newTask]);

    if (!useMock) {
      const { data, error } = await supabase
        .from("tasks")
        .insert({ title, type: "one_time", due_date: todayISO })
        .select()
        .single();

      if (data && !error) {
        setTasks((prev) => prev.map((t) => (t.id === tempId ? (data as Task) : t)));
      } else {
        setTasks((prev) => prev.filter((t) => t.id !== tempId));
      }
    }
  };

  // ── Block interactions ───────────────────────────────────────────────────

  const handleSlotClick = (startMinutes: number) => {
    if (isDesktop) {
      setActiveSlot(startMinutes);
      setPickerSlot(startMinutes);
      return;
    }

    if (activeSlot !== startMinutes) {
      setActiveSlot(startMinutes);
      return;
    }

    setPickerSlot(startMinutes);
  };

  const handleClosePicker = () => {
    setActiveSlot(null);
    setPickerSlot(null);
    setPendingTask(null);
  };

  const handleScheduleTask = (task: TaskWithStatus) => {
    setPendingTask(task);
  };

  const handleCancelPending = () => {
    setPendingTask(null);
  };

  const handleAddBlock = async (
    title: string,
    taskId: string | null,
    taskType: string | null,
    durationMinutes: number
  ) => {
    setErrorMessage(null);
    if (pickerSlot === null) return;
    if (hasOverlap(pickerSlot, durationMinutes, blocks)) return;
    const slotStart = pickerSlot;

    // Newly created tasks use temporary client-only IDs until Supabase returns the real row.
    // Persist block as unlinked instead of failing the entire insert.
    const normalizedTaskId = taskId?.startsWith(TEMP_TASK_ID_PREFIX) ? null : taskId;
    const normalizedTaskType = normalizedTaskId ? taskType : null;

    const tempId = `temp-${Date.now()}`;
    const newBlock: PlannerBlock = {
      id: tempId,
      date: todayISO,
      start_minutes: slotStart,
      duration_minutes: durationMinutes,
      title,
      task_id: normalizedTaskId,
      task_type: normalizedTaskType,
      completion_entry_id: null,
      is_completed: false,
      created_at: new Date().toISOString(),
    };

    setBlocks((prev) => [...prev, newBlock]);
    setActiveSlot(null);
    setPickerSlot(null);
    setPendingTask(null);

    if (!useMock) {
      const baseInsert = {
        date: todayISO,
        start_minutes: slotStart,
        duration_minutes: durationMinutes,
        title,
        is_completed: false,
      };

      const preferredInsert = normalizedTaskId
        ? { ...baseInsert, task_id: normalizedTaskId, task_type: normalizedTaskType }
        : baseInsert;

      const { data, error } = await supabase
        .from("planner_blocks")
        .insert(preferredInsert)
        .select()
        .single();

      if (data && !error) {
        setBlocks((prev) => prev.map((b) => (b.id === tempId ? (data as PlannerBlock) : b)));
      } else {
        console.error("[day-planner] Failed to persist planner block.", error);
        setBlocks((prev) => prev.filter((b) => b.id !== tempId));
        setErrorMessage(formatPersistenceError("Could not save planner block", error));
      }
    }
  };

  const handleCompleteBlock = async (blockId: string) => {
    setErrorMessage(null);
    const block = blocks.find((b) => b.id === blockId);
    if (!block) return;
    const nextCompleted = !block.is_completed;
    const previousBlocks = blocks;
    const previousTasks = tasks;
    const previousRawCompletions = rawCompletions;

    setBlocks((prev) =>
      prev.map((b) =>
        b.id === blockId
          ? { ...b, is_completed: nextCompleted, completion_entry_id: nextCompleted ? b.completion_entry_id : null }
          : b
      )
    );

    try {
      if (block.task_id) {
        const taskType = block.task_type ?? tasks.find((t) => t.id === block.task_id)?.type;
        if (taskType === "daily") {
          const key = `${block.task_id}:${todayISO}`;
          const task = tasks.find((t) => t.id === block.task_id);
          const isMultiOption = !!task && isMultiOptionDailyTask(task);
          const defaultOptionIndex =
            isMultiOption && (task?.daily_options?.length ?? 0) > 0 ? 0 : null;
          if (nextCompleted) {
            let completionEntryId: string | null = null;
            if (!completionSet.has(key)) {
              const optimisticId = `planner-marker-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
              setRawCompletions((prev) => [
                ...prev,
                {
                  id: optimisticId,
                  task_id: block.task_id!,
                  date: todayISO,
                  value: null,
                  daily_option_index: defaultOptionIndex,
                  optimistic_id: optimisticId,
                },
              ]);

              if (!useMock) {
                const { data, error } = await supabase
                  .from("task_completions")
                  .insert({
                    task_id: block.task_id,
                    date: todayISO,
                    completed_at: new Date().toISOString(),
                    value: null,
                    daily_option_index: defaultOptionIndex,
                  })
                  .select("id")
                  .single();

                if (error || !data) {
                  throw error ?? new Error("Failed to insert completion marker");
                }
                const insertedCompletionId = data.id as string;
                completionEntryId = insertedCompletionId;
                setRawCompletions((prev) =>
                  prev.map((c) =>
                    c.id === optimisticId ? { ...c, id: insertedCompletionId, optimistic_id: undefined } : c
                  )
                );
              } else {
                completionEntryId = optimisticId;
              }
            }

            setBlocks((prev) =>
              prev.map((b) => (b.id === blockId ? { ...b, completion_entry_id: completionEntryId } : b))
            );
            if (!useMock) {
              const { error } = await supabase
                .from("planner_blocks")
                .update({ is_completed: true, completion_entry_id: completionEntryId })
                .eq("id", blockId);
              if (error) throw error;
            }
          } else {
            if (block.completion_entry_id) {
              setRawCompletions((prev) => prev.filter((c) => c.id !== block.completion_entry_id));
              if (!useMock) {
                const { error } = await supabase
                  .from("task_completions")
                  .delete()
                  .eq("id", block.completion_entry_id)
                  .is("value", null);
                if (error) throw error;
              }
            }
            if (!useMock) {
              const { error } = await supabase
                .from("planner_blocks")
                .update({ is_completed: false, completion_entry_id: null })
                .eq("id", blockId);
              if (error) throw error;
            }
          }
        } else if (taskType === "one_time") {
          setTasks((prev) =>
            prev.map((t) =>
              t.id === block.task_id
                ? { ...t, is_completed: nextCompleted, completed_at: nextCompleted ? new Date().toISOString() : null }
                : t
            )
          );
          if (!useMock) {
            const { error: tasksUpdateError } = await supabase
              .from("tasks")
              .update({ is_completed: nextCompleted, completed_at: nextCompleted ? new Date().toISOString() : null })
              .eq("id", block.task_id);
            if (tasksUpdateError) throw tasksUpdateError;

            const { error: blockUpdateError } = await supabase
              .from("planner_blocks")
              .update({ is_completed: nextCompleted })
              .eq("id", blockId);
            if (blockUpdateError) throw blockUpdateError;
          }
        } else if (!useMock) {
          const { error } = await supabase
            .from("planner_blocks")
            .update({ is_completed: nextCompleted })
            .eq("id", blockId);
          if (error) throw error;
        }
      } else if (!useMock) {
        const { error } = await supabase
          .from("planner_blocks")
          .update({ is_completed: nextCompleted })
          .eq("id", blockId);
        if (error) throw error;
      }
    } catch (error) {
      console.error("[day-planner] Failed to persist completion change.", error);
      setBlocks(previousBlocks);
      setTasks(previousTasks);
      setRawCompletions(previousRawCompletions);
      setErrorMessage(formatPersistenceError("Could not persist completion change", error));
    }
  };

  const handleDeleteBlock = async (blockId: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== blockId));
    if (!useMock) {
      await supabase.from("planner_blocks").delete().eq("id", blockId);
    }
  };

  const formattedDate = now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const panelProps = {
    tasks: unscheduledTasks,
    today: todayISO,
    toggling,
    onSchedule: handleScheduleTask,
    onToggle: toggleTask,
    onLogValue: logTaskValue,
    onAddTask: addTask,
  };

  return (
    <div className="relative flex flex-col h-[calc(100dvh-3.5rem)] md:h-dvh overflow-hidden">
      {/* Page header */}
      <header className="shrink-0 px-4 pt-4 pb-3 md:px-6 md:pt-5 border-b border-white/[0.04] flex items-center justify-between gap-4">
        <div>
          <p className="text-[14px] text-muted-foreground uppercase tracking-widest">{formattedDate}</p>
          <h1 className="text-[28px] font-bold text-foreground mt-1 tracking-tight">Day Planner</h1>
        </div>
        {loading && (
          <div className="w-4 h-4 border-2 border-accent/30 border-t-accent rounded-full animate-spin shrink-0" />
        )}
      </header>
      {errorMessage && (
        <div className="shrink-0 px-4 md:px-6 py-2 border-b border-red-400/20 bg-red-500/10">
          <p className="text-sm text-red-200">{errorMessage}</p>
        </div>
      )}

      {/* Main layout */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Timeline */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <DayTimeline
            blocks={blocks}
            tasks={tasks}
            now={now}
            activeSlot={activeSlot}
            pendingTask={pendingTask}
            onSlotClick={handleSlotClick}
            onCancelPending={handleCancelPending}
            onCompleteBlock={handleCompleteBlock}
            onDeleteBlock={handleDeleteBlock}
          />
        </div>

        {isDesktop && (
          <div className="scrollbar-subtle w-[30rem] shrink-0 flex flex-col overflow-y-auto border-l border-white/[0.04] px-4 py-4">
            <UnscheduledPanel {...panelProps} />
          </div>
        )}
      </div>

      {!isDesktop && (
        <>
          <div
            className={cn(
              "absolute inset-0 z-10 bg-black/55 transition-opacity duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]",
              isMobileDrawerOpen ? "opacity-100" : "pointer-events-none opacity-0"
            )}
            onClick={() => setIsMobileDrawerOpen(false)}
            aria-hidden="true"
          />
          <div
            className={cn(
              "scrollbar-subtle relative z-20 shrink-0 overflow-y-auto px-4 transition-[max-height,opacity,transform,border-color,padding] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-[max-height,transform]",
              isMobileDrawerOpen
                ? "max-h-[80vh] border-t border-white/[0.04] py-3 opacity-100 translate-y-0"
                : "max-h-0 border-t border-transparent py-0 opacity-0 translate-y-2 pointer-events-none"
            )}
          >
            <div
              className={cn(
                "transition-opacity duration-150",
                isMobileDrawerOpen ? "opacity-100 delay-75" : "opacity-0"
              )}
            >
              <UnscheduledPanel
                {...panelProps}
                onClosePanel={() => {
                  setIsMobileDrawerOpen(false);
                }}
              />
            </div>
          </div>

          <button
            onClick={() => setIsMobileDrawerOpen(true)}
            className={cn(
              "absolute bottom-3 right-4 z-30 flex items-center gap-2 rounded-full border border-white/15 bg-background/90 px-3 py-2 text-xs font-semibold text-foreground shadow-[0_8px_18px_rgba(0,0,0,0.22)] backdrop-blur-sm transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]",
              isMobileDrawerOpen
                ? "pointer-events-none opacity-0 translate-y-2"
                : "cursor-pointer opacity-100 translate-y-0 hover:bg-background"
            )}
          >
            <ChevronUp className="size-3.5" />
            Show today&apos;s tasks
          </button>
        </>
      )}

      {/* Add block modal */}
      {pickerSlot !== null && (
        <AddBlockPicker
          startMinutes={pickerSlot}
          blocks={blocks}
          unscheduledTasks={unscheduledTasks}
          initialTask={pendingTask}
          onAdd={handleAddBlock}
          onClose={handleClosePicker}
        />
      )}
    </div>
  );
}
