"use client";

import { useState, useEffect, useSyncExternalStore } from "react";
import { formatDateISO, getTasksForDate } from "@/lib/calendar-utils";
import { supabase } from "@/lib/supabase";
import { Task, TaskWithStatus, PlannerBlock } from "@/lib/types";
import { mockTasks, mockTaskCompletions, mockPlannerBlocks } from "@/lib/mock-data";
import { DayTimeline } from "@/components/day-planner/DayTimeline";
import { UnscheduledPanel } from "@/components/day-planner/UnscheduledPanel";
import { AddBlockPicker } from "@/components/day-planner/AddBlockPicker";

const useMock = process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true";
const DAY_END_MINUTES = 24 * 60;
const DESKTOP_MEDIA_QUERY = "(min-width: 768px)";

type RawCompletion = {
  id?: string;
  task_id: string;
  date: string;
  value: number | null;
  optimistic_id?: string;
};

function hasOverlap(startMinutes: number, durationMinutes: number, existingBlocks: PlannerBlock[]) {
  const candidateEnd = startMinutes + durationMinutes;
  if (candidateEnd > DAY_END_MINUTES) return true;
  return existingBlocks.some((block) => {
    const blockStart = block.start_minutes;
    const blockEnd = block.start_minutes + block.duration_minutes;
    return startMinutes < blockEnd && candidateEnd > blockStart;
  });
}

function buildSets(completions: RawCompletion[], dateISO: string) {
  const completionSet = new Set<string>();
  const quantMap = new Map<string, number>();
  for (const c of completions) {
    if (c.date === dateISO) {
      const key = `${c.task_id}:${c.date}`;
      completionSet.add(key);
      if (c.value != null) quantMap.set(key, (quantMap.get(key) ?? 0) + c.value);
    }
  }
  return { completionSet, quantMap };
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
  const [pendingTask, setPendingTask] = useState<TaskWithStatus | null>(null);
  const [loading, setLoading] = useState(!useMock);
  const isDesktop = useSyncExternalStore(subscribeDesktopQuery, getDesktopSnapshot, () => false);

  // Task interaction state (mirrors homepage)
  const [toggling, setToggling] = useState<Set<string>>(new Set());
  const [openQuantInputTaskId, setOpenQuantInputTaskId] = useState<string | null>(null);
  const [quantInputValue, setQuantInputValue] = useState("");

  // Derive today's tasks with completion status
  const { completionSet, quantMap } = buildSets(rawCompletions, todayISO);
  const todayTasks = getTasksForDate(tasks, todayISO, completionSet, quantMap);

  // Tasks not yet placed on the timeline
  const scheduledTaskIds = new Set(blocks.map((b) => b.task_id).filter(Boolean));
  const unscheduledTasks = todayTasks.filter((t) => !scheduledTaskIds.has(t.id));

  // Clock tick every 60s
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(interval);
  }, []);

  // Data load for current date
  useEffect(() => {
    if (useMock) return;
    let isCancelled = false;

    async function load() {
      setLoading(true);
      const [tasksRes, completionsRes, blocksRes] = await Promise.all([
        supabase.from("tasks").select("*"),
        supabase.from("task_completions").select("id, task_id, date, value").eq("date", todayISO),
        supabase.from("planner_blocks").select("*").eq("date", todayISO),
      ]);

      if (isCancelled) return;
      if (tasksRes.data) setTasks(tasksRes.data as Task[]);
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

  const toggleTask = async (task: TaskWithStatus) => {
    if (task.target_value != null) return; // quantitative tasks use logTaskValue
    const wasCompleted = task.isCompleted;
    setToggling((prev) => new Set([...prev, task.id]));

    // Optimistic
    if (task.type === "daily") {
      setRawCompletions((prev) =>
        wasCompleted
          ? prev.filter((c) => !(c.task_id === task.id && c.date === todayISO))
          : [...prev, { task_id: task.id, date: todayISO, value: null }]
      );
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
        if (wasCompleted) {
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
    // Close quant input if open for this task
    if (openQuantInputTaskId === task.id) setOpenQuantInputTaskId(null);
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
    setActiveSlot(startMinutes);
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
    if (activeSlot === null) return;
    if (hasOverlap(activeSlot, durationMinutes, blocks)) return;

    const tempId = `temp-${Date.now()}`;
    const newBlock: PlannerBlock = {
      id: tempId,
      date: todayISO,
      start_minutes: activeSlot,
      duration_minutes: durationMinutes,
      title,
      task_id: taskId,
      task_type: taskType,
      completion_entry_id: null,
      is_completed: false,
      created_at: new Date().toISOString(),
    };

    setBlocks((prev) => [...prev, newBlock]);
    setActiveSlot(null);
    setPendingTask(null);

    if (!useMock) {
      const { data, error } = await supabase
        .from("planner_blocks")
        .insert({
          date: todayISO,
          start_minutes: activeSlot,
          duration_minutes: durationMinutes,
          title,
          task_id: taskId,
          task_type: taskType,
          completion_entry_id: null,
          is_completed: false,
        })
        .select()
        .single();

      if (data && !error) {
        setBlocks((prev) => prev.map((b) => (b.id === tempId ? (data as PlannerBlock) : b)));
      } else {
        setBlocks((prev) => prev.filter((b) => b.id !== tempId));
      }
    }
  };

  const handleCompleteBlock = async (blockId: string) => {
    const block = blocks.find((b) => b.id === blockId);
    if (!block) return;
    const nextCompleted = !block.is_completed;

    setBlocks((prev) =>
      prev.map((b) =>
        b.id === blockId
          ? { ...b, is_completed: nextCompleted, completion_entry_id: nextCompleted ? b.completion_entry_id : null }
          : b
      )
    );

    if (block.task_id) {
      const taskType = block.task_type ?? tasks.find((t) => t.id === block.task_id)?.type;
      if (taskType === "daily") {
        const key = `${block.task_id}:${todayISO}`;
        if (nextCompleted) {
          let completionEntryId: string | null = null;
          if (!completionSet.has(key)) {
            const optimisticId = `planner-marker-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
            setRawCompletions((prev) => [
              ...prev,
              { id: optimisticId, task_id: block.task_id!, date: todayISO, value: null, optimistic_id: optimisticId },
            ]);

            if (!useMock) {
              const { data, error } = await supabase
                .from("task_completions")
                .insert({
                  task_id: block.task_id,
                  date: todayISO,
                  completed_at: new Date().toISOString(),
                  value: null,
                })
                .select("id")
                .single();

              if (error || !data) {
                setRawCompletions((prev) => prev.filter((c) => c.id !== optimisticId));
              } else {
                const insertedCompletionId = data.id as string;
                completionEntryId = insertedCompletionId;
                setRawCompletions((prev) =>
                  prev.map((c) =>
                    c.id === optimisticId ? { ...c, id: insertedCompletionId, optimistic_id: undefined } : c
                  )
                );
              }
            } else {
              completionEntryId = optimisticId;
            }
          }

          setBlocks((prev) =>
            prev.map((b) => (b.id === blockId ? { ...b, completion_entry_id: completionEntryId } : b))
          );
          if (!useMock) {
            await supabase
              .from("planner_blocks")
              .update({ is_completed: true, completion_entry_id: completionEntryId })
              .eq("id", blockId);
          }
        } else {
          if (block.completion_entry_id) {
            setRawCompletions((prev) => prev.filter((c) => c.id !== block.completion_entry_id));
            if (!useMock) {
              await supabase.from("task_completions").delete().eq("id", block.completion_entry_id).is("value", null);
            }
          }
          if (!useMock) {
            await supabase
              .from("planner_blocks")
              .update({ is_completed: false, completion_entry_id: null })
              .eq("id", blockId);
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
          await supabase
            .from("tasks")
            .update({ is_completed: nextCompleted, completed_at: nextCompleted ? new Date().toISOString() : null })
            .eq("id", block.task_id);
          await supabase
            .from("planner_blocks")
            .update({ is_completed: nextCompleted })
            .eq("id", blockId);
        }
      } else if (!useMock) {
        await supabase.from("planner_blocks").update({ is_completed: nextCompleted }).eq("id", blockId);
      }
    } else if (!useMock) {
      await supabase.from("planner_blocks").update({ is_completed: nextCompleted }).eq("id", blockId);
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
    openQuantInputTaskId,
    quantInputValue,
    onSchedule: handleScheduleTask,
    onToggle: toggleTask,
    onLogValue: logTaskValue,
    onToggleQuantInput: (taskId: string) => {
      setOpenQuantInputTaskId((prev) => (prev === taskId ? null : taskId));
      setQuantInputValue("");
    },
    onQuantInputChange: setQuantInputValue,
    onCloseQuantInput: () => { setOpenQuantInputTaskId(null); setQuantInputValue(""); },
    onAddTask: addTask,
  };

  return (
    <div className="flex flex-col h-[calc(100dvh-3.5rem)] md:h-dvh overflow-hidden">
      {/* Page header */}
      <header className="shrink-0 px-4 pt-4 pb-3 md:px-6 md:pt-5 border-b border-white/[0.04] flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground tracking-tight">Day Planner</h1>
          <p className="text-base font-medium mt-0.5" style={{ color: "rgba(244,244,245,0.92)" }}>
            {formattedDate}
          </p>
        </div>
        {loading && (
          <div className="w-4 h-4 border-2 border-accent/30 border-t-accent rounded-full animate-spin shrink-0" />
        )}
      </header>

      {/* Main layout */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Timeline */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <DayTimeline
            blocks={blocks}
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
          <div className="scrollbar-subtle w-80 shrink-0 flex flex-col overflow-y-auto border-l border-white/[0.04] px-4 py-4">
            <UnscheduledPanel {...panelProps} />
          </div>
        )}
      </div>

      {!isDesktop && (
        <div
          className="scrollbar-subtle shrink-0 border-t border-white/[0.04] overflow-y-auto px-4 py-3"
          style={{ maxHeight: "40vh" }}
        >
          <UnscheduledPanel {...panelProps} />
        </div>
      )}

      {/* Add block modal */}
      {activeSlot !== null && (
        <AddBlockPicker
          startMinutes={activeSlot}
          blocks={blocks}
          unscheduledTasks={unscheduledTasks}
          initialTask={pendingTask}
          onAdd={handleAddBlock}
          onClose={() => { setActiveSlot(null); setPendingTask(null); }}
        />
      )}
    </div>
  );
}
