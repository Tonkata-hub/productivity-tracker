"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/lib/supabase";
import { Task, TaskType, TaskPriority } from "@/lib/types";
import { formatDateISO } from "@/lib/calendar-utils";
import {
  Check,
  Plus,
  Trash2,
  Pencil,
  Repeat,
  Clock,
  Calendar,
  AlertTriangle,
  Loader2,
  ListChecks,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";

// ─── Constants ───────────────────────────────────────────────────────────────

const PRIORITIES: { value: TaskPriority | ""; label: string; on: string }[] = [
  { value: "", label: "None", on: "bg-white/10 text-foreground border-white/20" },
  { value: "low", label: "Low", on: "bg-zinc-500/20 text-zinc-300 border-zinc-400/40" },
  { value: "medium", label: "Med", on: "bg-yellow-500/20 text-yellow-300 border-yellow-400/40" },
  { value: "high", label: "High", on: "bg-accent/20 text-accent border-accent/40" },
];

const PRIORITY_DOT: Record<string, string> = {
  high: "bg-red-500",
  medium: "bg-yellow-500",
  low: "bg-zinc-500",
};

const PRIORITY_BADGE: Record<NonNullable<TaskPriority>, { dot: string; label: string; badge: string }> = {
  high: { dot: "bg-accent", label: "High", badge: "bg-accent/15 text-accent" },
  medium: { dot: "bg-yellow-400", label: "Med", badge: "bg-yellow-400/15 text-yellow-300" },
  low: { dot: "bg-zinc-400", label: "Low", badge: "bg-zinc-400/15 text-zinc-400" },
};

type Filter = "all" | "daily" | "one_time";
type FormStatus = "idle" | "submitting" | "success" | "error";

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TasksPage() {
  // List state
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");

  // Form state
  const [formMode, setFormMode] = useState<"add" | "edit">("add");
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [formOpen, setFormOpen] = useState(false); // mobile only
  const [title, setTitle] = useState("");
  const [type, setType] = useState<TaskType>("daily");
  const [priority, setPriority] = useState<TaskPriority | "">("");
  const [dueDate, setDueDate] = useState("");
  const [targetValue, setTargetValue] = useState("");
  const [unit, setUnit] = useState("");

  // Delete sheet state
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [sheetExiting, setSheetExiting] = useState(false);
  const [sheetAnimated, setSheetAnimated] = useState(false);

  const formRef = useRef<HTMLDivElement>(null);
  const today = formatDateISO(new Date());

  // ── Sheet animation
  useEffect(() => {
    if (!sheetVisible) return;
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setSheetAnimated(true)));
    return () => cancelAnimationFrame(id);
  }, [sheetVisible]);

  // ── Pre-fill form when editing
  useEffect(() => {
    if (editingTask) {
      setTitle(editingTask.title);
      setType(editingTask.type);
      setPriority(editingTask.priority ?? "");
      setDueDate(editingTask.due_date ?? "");
      setTargetValue(editingTask.target_value != null ? String(editingTask.target_value) : "");
      setUnit(editingTask.unit ?? "");
    }
  }, [editingTask?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Data fetch
  useEffect(() => {
    async function fetchTasks() {
      const { data, error } = await supabase.from("tasks").select("*").order("created_at", { ascending: false });
      if (!error && data) setTasks(data as Task[]);
      setIsLoading(false);
    }
    fetchTasks();
  }, []);

  // ── Derived
  const sortedTasks = useMemo(() => {
    const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
    const getPriority = (task: Task) => priorityOrder[task.priority ?? ""] ?? 3;

    return [...tasks].sort((a, b) => {
      const aOverdue = a.type === "one_time" && !!a.due_date && a.due_date < today ? 0 : 1;
      const bOverdue = b.type === "one_time" && !!b.due_date && b.due_date < today ? 0 : 1;
      if (aOverdue !== bOverdue) return aOverdue - bOverdue;

      const aDueToday = a.type === "one_time" && a.due_date === today ? 0 : 1;
      const bDueToday = b.type === "one_time" && b.due_date === today ? 0 : 1;
      if (aDueToday !== bDueToday) return aDueToday - bDueToday;

      const aType = a.type === "daily" ? 0 : 1;
      const bType = b.type === "daily" ? 0 : 1;
      if (aType !== bType) return aType - bType;

      return getPriority(a) - getPriority(b);
    });
  }, [tasks, today]);

  const dailyTasks = sortedTasks.filter((t) => t.type === "daily");
  const oneTimeTasks = sortedTasks.filter((t) => t.type === "one_time");
  const filtered = filter === "daily" ? dailyTasks : filter === "one_time" ? oneTimeTasks : sortedTasks;
  const firstOneTimeTaskIndex = filtered.findIndex((task) => task.type === "one_time");
  const endOfFirstOneTimeBlockIndex = (() => {
    if (firstOneTimeTaskIndex < 0) return -1;
    let end = firstOneTimeTaskIndex;
    while (end + 1 < filtered.length && filtered[end + 1]?.type === "one_time") {
      end += 1;
    }
    return end;
  })();
  const firstFutureOneTimeTaskIndex = filtered.findIndex(
    (task) => task.type === "one_time" && (!task.due_date || task.due_date > today)
  );
  const hasDailyBeforeFutureOneTime =
    firstFutureOneTimeTaskIndex > 0 &&
    filtered.slice(0, firstFutureOneTimeTaskIndex).some((task) => task.type === "daily");
  const pendingTask = tasks.find((t) => t.id === pendingDeleteId) ?? null;

  const hasChanges = editingTask
    ? title !== editingTask.title ||
      type !== editingTask.type ||
      (priority || null) !== (editingTask.priority ?? null) ||
      (type === "one_time" ? dueDate || null : null) !== (editingTask.due_date ?? null) ||
      (targetValue ? Number(targetValue) : null) !== (editingTask.target_value ?? null) ||
      (unit || null) !== (editingTask.unit ?? null)
    : true;

  // ── Reset form to add mode
  function resetForm() {
    setFormMode("add");
    setEditingTask(null);
    setTitle("");
    setType("daily");
    setPriority("");
    setDueDate("");
    setTargetValue("");
    setUnit("");
  }

  // ── Start editing a task (clicking again cancels)
  function startEdit(task: Task) {
    if (editingTask?.id === task.id) {
      resetForm();
      return;
    }
    setFormMode("edit");
    setEditingTask(task);
    setFormOpen(true);
    // Scroll to form on mobile
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  }

  // ── Form save — returns result so TaskForm can drive its own button flash
  async function handleSave(): Promise<"success" | "error"> {
    const payload = {
      title,
      type,
      priority: priority || null,
      due_date: type === "one_time" ? dueDate || null : null,
      target_value: targetValue ? Number(targetValue) : null,
      unit: unit || null,
    };

    if (formMode === "edit" && editingTask) {
      const { error } = await supabase.from("tasks").update(payload).eq("id", editingTask.id);
      if (error) return "error";
      setTasks((prev) => prev.map((t) => (t.id === editingTask.id ? { ...t, ...payload } : t)));
      resetForm();
      setFormOpen(false);
      return "success";
    } else {
      const { data, error } = await supabase.from("tasks").insert(payload).select().single();
      if (error) return "error";
      if (data) setTasks((prev) => [data as Task, ...prev]);
      resetForm();
      return "success";
    }
  }

  // ── Delete sheet
  function openDeleteSheet(id: string) {
    setSheetAnimated(false);
    setPendingDeleteId(id);
    setSheetExiting(false);
    setSheetVisible(true);
  }

  function closeDeleteSheet() {
    setSheetExiting(true);
    setTimeout(() => {
      setSheetVisible(false);
      setSheetExiting(false);
      setPendingDeleteId(null);
    }, 280);
  }

  async function handleDelete() {
    if (!pendingDeleteId) return;
    setDeleting(true);
    await supabase.from("task_completions").delete().eq("task_id", pendingDeleteId);
    await supabase.from("tasks").delete().eq("id", pendingDeleteId);
    setTasks((prev) => prev.filter((t) => t.id !== pendingDeleteId));
    if (editingTask?.id === pendingDeleteId) resetForm();
    setDeleting(false);
    closeDeleteSheet();
  }

  // ── Toggle mobile form
  function toggleMobileForm() {
    if (formOpen && formMode === "edit") {
      resetForm();
    }
    setFormOpen((prev) => !prev);
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-6xl mx-auto px-4 pt-6 pb-24">
        {/* Header */}
        <div className="calendar-animate-slide-in-up">
          <p className="text-xs text-muted-foreground uppercase tracking-widest">Library</p>
          <h1 className="text-3xl font-bold tracking-tight text-foreground mt-1">Tasks</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_400px] gap-5 md:gap-8 mt-5">
          {/* ── Left: list */}
          <div className="space-y-3 min-w-0">
            {/* Filter bar */}
            <FilterBar
              filter={filter}
              onFilterChange={setFilter}
              counts={{ all: tasks.length, daily: dailyTasks.length, oneTime: oneTimeTasks.length }}
            />

            {/* Mobile: new task / cancel edit toggle */}
            <div ref={formRef} className="md:hidden calendar-animate-slide-in-up" style={{ animationDelay: "60ms" }}>
              <button
                onClick={toggleMobileForm}
                className={cn(
                  "flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-sm font-semibold transition-all duration-200",
                  formOpen
                    ? "border border-white/10 bg-white/5 text-muted-foreground hover:bg-white/8"
                    : "bg-accent text-white shadow-lg shadow-accent/30 hover:bg-accent/90"
                )}
              >
                {formOpen ? (
                  <>
                    <X className="w-4 h-4" />
                    {formMode === "edit" ? "Cancel edit" : "Cancel"}
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    New Task
                  </>
                )}
              </button>

              {/* Collapsible form */}
              <div
                style={{
                  display: "grid",
                  gridTemplateRows: formOpen ? "1fr" : "0fr",
                  transition: "grid-template-rows 0.28s cubic-bezier(0.22, 1, 0.36, 1)",
                }}
              >
                <div className="overflow-hidden">
                  <div className="pt-3">
                    <TaskForm
                      mode={formMode}
                      title={title}
                      type={type}
                      priority={priority}
                      dueDate={dueDate}
                      targetValue={targetValue}
                      unit={unit}
                      hasChanges={hasChanges}
                      onTitleChange={setTitle}
                      onTypeChange={setType}
                      onPriorityChange={setPriority}
                      onDueDateChange={setDueDate}
                      onTargetValueChange={setTargetValue}
                      onUnitChange={setUnit}
                      onSave={handleSave}
                      onCancel={formMode === "edit" ? () => { resetForm(); setFormOpen(false); } : undefined}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Task list */}
            <div className="space-y-2 calendar-animate-slide-in-up" style={{ animationDelay: "100ms" }}>
              {isLoading && (
                <div className="glass rounded-2xl flex items-center justify-center gap-3 p-10">
                  <Loader2 className="size-5 animate-spin text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Loading tasks…</span>
                </div>
              )}

              {!isLoading && filtered.length === 0 && (
                <div className="glass rounded-2xl flex flex-col items-center justify-center gap-3 p-14 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center">
                    <ListChecks className="size-6 text-muted-foreground/40" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {filter === "all"
                      ? "No tasks yet."
                      : `No ${filter === "daily" ? "daily" : "one-time"} tasks.`}
                  </p>
                </div>
              )}

              {!isLoading &&
                filtered.map((task, index) => (
                  <Fragment key={task.id}>
                    {index === endOfFirstOneTimeBlockIndex + 1 &&
                      endOfFirstOneTimeBlockIndex >= 0 &&
                      endOfFirstOneTimeBlockIndex < filtered.length - 1 && (
                        <div className="my-2.5 h-px bg-white/14" aria-hidden="true" />
                      )}
                    {index === firstFutureOneTimeTaskIndex && hasDailyBeforeFutureOneTime && (
                      <div className="my-2.5 h-px bg-white/14" aria-hidden="true" />
                    )}
                    <TaskCard
                      task={task}
                      index={index}
                      isEditing={editingTask?.id === task.id}
                      onEdit={() => startEdit(task)}
                      onDelete={() => openDeleteSheet(task.id)}
                    />
                  </Fragment>
                ))}
            </div>
          </div>

          {/* ── Right: form (desktop only) */}
          <div className="hidden md:block">
            <div className="sticky top-6 space-y-4 calendar-animate-slide-in-up" style={{ animationDelay: "60ms" }}>
              <TaskForm
                mode={formMode}
                title={title}
                type={type}
                priority={priority}
                dueDate={dueDate}
                targetValue={targetValue}
                unit={unit}
                hasChanges={hasChanges}
                onTitleChange={setTitle}
                onTypeChange={setType}
                onPriorityChange={setPriority}
                onDueDateChange={setDueDate}
                onTargetValueChange={setTargetValue}
                onUnitChange={setUnit}
                onSave={handleSave}
                onCancel={formMode === "edit" ? resetForm : undefined}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Delete confirmation sheet */}
      {sheetVisible && (
        <>
          <div
            className={cn(
              "fixed inset-0 z-40 cursor-pointer bg-black/70 backdrop-blur-sm transition-opacity duration-300",
              sheetAnimated && !sheetExiting ? "opacity-100" : "opacity-0"
            )}
            onClick={closeDeleteSheet}
          />
          <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center md:p-6 pointer-events-none">
            <div
              className={cn(
                "w-full md:max-w-sm pointer-events-auto",
                "bg-[#0f1117] border-t border-x md:border border-white/10",
                "rounded-t-3xl md:rounded-2xl px-5 pt-5",
                "transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
                sheetAnimated && !sheetExiting
                  ? "translate-y-0 md:opacity-100 md:scale-100"
                  : "max-md:translate-y-full md:opacity-0 md:scale-95"
              )}
              style={{ paddingBottom: "max(2rem, env(safe-area-inset-bottom))" }}
            >
              <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mb-5" />
              <div className="flex flex-col items-center gap-3 text-center mb-5">
                <div className="flex size-12 items-center justify-center rounded-2xl bg-accent/15">
                  <AlertTriangle className="size-5 text-accent" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Delete task</p>
                  <p className="text-base font-semibold text-foreground">&ldquo;{pendingTask?.title}&rdquo;</p>
                </div>
              </div>
              <p className="text-center text-sm text-muted-foreground mb-6">
                This will permanently remove the task and{" "}
                <span className="text-foreground font-medium">all its completion history</span>.
              </p>
              <div className="flex flex-col gap-2.5">
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="w-full cursor-pointer rounded-2xl bg-accent py-4 text-sm font-semibold text-white shadow-lg shadow-accent/30 transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {deleting ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="size-4 animate-spin" />
                      Deleting…
                    </span>
                  ) : (
                    "Delete permanently"
                  )}
                </button>
                <button
                  onClick={closeDeleteSheet}
                  disabled={deleting}
                  className="w-full cursor-pointer rounded-2xl border border-white/10 bg-white/5 py-4 text-sm font-medium text-foreground transition-all hover:bg-white/8 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Filter Bar ───────────────────────────────────────────────────────────────

function FilterBar({
  filter,
  onFilterChange,
  counts,
}: {
  filter: Filter;
  onFilterChange: (f: Filter) => void;
  counts: { all: number; daily: number; oneTime: number };
}) {
  const FILTERS: { value: Filter; label: string; count: number }[] = [
    { value: "all", label: "All", count: counts.all },
    { value: "daily", label: "Daily", count: counts.daily },
    { value: "one_time", label: "One-time", count: counts.oneTime },
  ];

  return (
    <div className="flex gap-2 calendar-animate-slide-in-up" style={{ animationDelay: "50ms" }}>
      {FILTERS.map((f) => (
        <button
          key={f.value}
          onClick={() => onFilterChange(f.value)}
          className={cn(
            "flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-150",
            filter === f.value
              ? "border border-accent/25 bg-accent/15 text-accent"
              : "border border-transparent bg-white/5 text-muted-foreground hover:bg-white/8 hover:text-foreground"
          )}
        >
          {f.label}
          <span
            className={cn(
              "text-xs font-bold px-1.5 py-0.5 rounded-full min-w-5 text-center",
              filter === f.value ? "bg-accent/20 text-accent" : "bg-white/8 text-muted-foreground"
            )}
          >
            {f.count}
          </span>
        </button>
      ))}
    </div>
  );
}

// ─── Task Card ────────────────────────────────────────────────────────────────

function TaskCard({
  task,
  index,
  isEditing,
  onEdit,
  onDelete,
}: {
  task: Task;
  index: number;
  isEditing: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [isPressed, setIsPressed] = useState(false);
  const today = formatDateISO(new Date());
  const isOverdue = task.type === "one_time" && !!task.due_date && task.due_date < today && !task.is_completed;
  const isDueToday = task.type === "one_time" && task.due_date === today && !task.is_completed;
  const isDaily = task.type === "daily";

  return (
    <div
      className={cn(
        "glass rounded-xl px-4 py-3.5 flex items-center gap-3.5 select-none transition-all duration-150 ease-out",
        "hover:bg-white/[0.07]!",
        isEditing && "ring-1 ring-accent/40 bg-accent/[0.04]!",
        isPressed && "translate-y-px scale-[0.985] bg-white/12! shadow-[0_8px_18px_rgba(0,0,0,0.22)]",
        task.is_completed && task.type === "one_time" && "opacity-40"
      )}
      style={{ animationDelay: `${index * 30}ms` }}
      onPointerDown={() => setIsPressed(true)}
      onPointerUp={() => setIsPressed(false)}
      onPointerLeave={() => setIsPressed(false)}
      onPointerCancel={() => setIsPressed(false)}
    >
      {/* Type icon */}
      {isDaily ? (
        <Repeat className="size-4 shrink-0 text-muted-foreground/50" />
      ) : (
        <Clock className="size-4 shrink-0 text-muted-foreground/50" />
      )}

      {/* Info */}
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "truncate text-sm font-medium",
            task.is_completed && task.type === "one_time" ? "line-through text-muted-foreground" : "text-foreground"
          )}
        >
          {task.title}
        </p>

        {task.target_value != null && (
          <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">
            {task.target_value} {task.unit}
          </p>
        )}

        {(isOverdue || isDueToday || (task.due_date && task.type === "one_time" && !isOverdue && !isDueToday)) && (
          <div className="mt-0.5 flex items-center gap-1">
            <Calendar className="size-3 shrink-0 text-muted-foreground/60" />
            <span
              className={cn(
                "text-xs font-medium",
                isOverdue ? "text-accent" : isDueToday ? "text-accent" : "text-muted-foreground"
              )}
            >
              {task.due_date && format(parseISO(task.due_date), "MMM d")}
              {isOverdue && " · Overdue"}
              {isDueToday && " · Due today"}
            </span>
          </div>
        )}
      </div>

      {/* Priority dot */}
      {task.priority && (
        <div
          className={cn("w-1.5 h-1.5 rounded-full shrink-0", PRIORITY_DOT[task.priority] ?? "")}
          title={PRIORITY_BADGE[task.priority]?.label}
        />
      )}

      {/* Actions */}
      <div className="flex items-center gap-0.5 shrink-0">
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
          onPointerDown={(e) => e.stopPropagation()}
          className={cn(
            "flex size-9 cursor-pointer items-center justify-center rounded-xl transition-all",
            isEditing
              ? "bg-accent/15 text-accent"
              : "text-muted-foreground/40 hover:bg-white/8 hover:text-foreground active:scale-90"
          )}
          aria-label={`Edit "${task.title}"`}
        >
          <Pencil className="size-3.5" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          onPointerDown={(e) => e.stopPropagation()}
          className="flex size-9 cursor-pointer items-center justify-center rounded-xl text-muted-foreground/40 transition-all hover:bg-accent/10 hover:text-accent active:scale-90"
          aria-label={`Delete "${task.title}"`}
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

// ─── Task Form ────────────────────────────────────────────────────────────────

function TaskForm({
  mode,
  title,
  type,
  priority,
  dueDate,
  targetValue,
  unit,
  hasChanges,
  onTitleChange,
  onTypeChange,
  onPriorityChange,
  onDueDateChange,
  onTargetValueChange,
  onUnitChange,
  onSave,
  onCancel,
}: {
  mode: "add" | "edit";
  title: string;
  type: TaskType;
  priority: TaskPriority | "";
  dueDate: string;
  targetValue: string;
  unit: string;
  hasChanges: boolean;
  onTitleChange: (v: string) => void;
  onTypeChange: (v: TaskType) => void;
  onPriorityChange: (v: TaskPriority | "") => void;
  onDueDateChange: (v: string) => void;
  onTargetValueChange: (v: string) => void;
  onUnitChange: (v: string) => void;
  onSave: () => Promise<"success" | "error">;
  onCancel?: () => void;
}) {
  const isEdit = mode === "edit";
  const [status, setStatus] = useState<FormStatus>("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "submitting" || status === "success") return;
    setStatus("submitting");
    const result = await onSave();
    if (result === "error") {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 3000);
    } else {
      setStatus("success");
      setTimeout(() => setStatus("idle"), 1800);
    }
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-widest">
          {isEdit ? "Edit task" : "New task"}
        </p>
        <h2 className="text-2xl font-bold tracking-tight text-foreground mt-1">
          {isEdit ? "Update details" : "What needs doing?"}
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Unified glass card */}
        <div className="glass rounded-2xl overflow-hidden w-full">
          {/* Title */}
          <div className="px-5 pt-5 pb-4">
            <input
              className="w-full bg-transparent text-xl font-medium text-foreground placeholder-muted-foreground/35 outline-none caret-accent"
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder="Task title…"
              required
            />
          </div>

          <div className="border-t border-border" />

          {/* Type toggle */}
          <div className="px-5 py-3.5 flex items-center justify-between gap-4">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Type</span>
            <div className="relative grid grid-cols-2 rounded-lg bg-white/5 p-0.5">
              <div
                className="absolute top-0.5 bottom-0.5 rounded-md bg-accent transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]"
                style={{
                  width: "calc(50% - 2px)",
                  transform: type === "daily" ? "translateX(2px)" : "translateX(calc(100% + 2px))",
                }}
              />
              {(["daily", "one_time"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => onTypeChange(t)}
                  className={cn(
                    "relative z-10 cursor-pointer rounded-md px-4 py-1.5 text-center text-xs font-semibold whitespace-nowrap transition-colors duration-150",
                    type === t ? "text-white" : "text-muted-foreground"
                  )}
                >
                  {t === "daily" ? "Daily" : "One-time"}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-border" />

          {/* Priority */}
          <div className="px-5 py-3.5 flex items-center justify-between gap-4">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Priority</span>
            <div className="flex gap-1.5">
              {PRIORITIES.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => onPriorityChange(p.value)}
                  className={cn(
                    "cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all duration-150",
                    priority === p.value
                      ? p.on
                      : "border-transparent bg-white/5 text-muted-foreground hover:bg-white/8 hover:text-foreground"
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-border" />

          {/* Target */}
          <div className="px-5 py-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Target</span>
              <span className="text-[11px] text-muted-foreground/50">optional</span>
            </div>
            <div className="flex gap-2">
              <input
                type="number"
                min="1"
                step="any"
                className="no-spinner w-28 min-w-0 rounded-lg border border-glass-border bg-white/5 px-3 py-2.5 text-base text-foreground placeholder-muted-foreground/40 outline-none focus:border-accent/50 transition-colors"
                value={targetValue}
                onChange={(e) => onTargetValueChange(e.target.value)}
                placeholder="e.g. 2000"
              />
              <input
                type="text"
                className="flex-1 min-w-0 rounded-lg border border-glass-border bg-white/5 px-3 py-2.5 text-base text-foreground placeholder-muted-foreground/40 outline-none focus:border-accent/50 transition-colors"
                value={unit}
                onChange={(e) => onUnitChange(e.target.value)}
                placeholder="unit (ml, steps…)"
              />
            </div>
          </div>

          {/* Due date — animated */}
          <div
            style={{
              display: "grid",
              gridTemplateRows: type === "one_time" ? "1fr" : "0fr",
              transition: "grid-template-rows 0.25s cubic-bezier(0.22, 1, 0.36, 1)",
            }}
          >
            <div className="overflow-hidden">
              <div
                style={{
                  opacity: type === "one_time" ? 1 : 0,
                  transform: type === "one_time" ? "translateY(0)" : "translateY(-6px)",
                  transition: "opacity 0.2s, transform 0.2s",
                }}
              >
                <div className="border-t border-border" />
                <div className="px-5 py-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                      Due date
                    </span>
                    <span className="text-[11px] text-muted-foreground/50">optional</span>
                  </div>
                  <DatePicker value={dueDate} onChange={onDueDateChange} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={status === "submitting" || status === "success" || !title.trim() || !hasChanges}
          className={cn(
            "flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl px-6 py-4 text-sm font-semibold transition-all duration-300",
            status === "success"
              ? "bg-green-500 text-white shadow-lg shadow-green-500/25"
              : status === "error"
                ? "bg-accent/70 text-white"
                : "bg-accent text-white shadow-lg shadow-accent/30 hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
          )}
        >
          {status === "submitting" ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              {isEdit ? "Saving…" : "Adding…"}
            </>
          ) : status === "success" ? (
            <>
              <Check className="w-4 h-4" />
              {isEdit ? "Saved!" : "Added!"}
            </>
          ) : status === "error" ? (
            "Something went wrong — try again"
          ) : (
            <>
              {isEdit ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {isEdit ? "Save Changes" : "Add Task"}
            </>
          )}
        </button>

        {/* Cancel (edit mode only) */}
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-6 py-3.5 text-sm font-medium text-foreground transition-all hover:bg-white/8"
          >
            <X className="w-4 h-4" />
            Cancel
          </button>
        )}
      </form>
    </div>
  );
}

// ─── Date Picker ──────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DAY_HEADERS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

function DatePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({});
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const today = new Date();
  const todayISO = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const initialDate = value ? new Date(value + "T00:00:00") : today;
  const [viewYear, setViewYear] = useState(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialDate.getMonth());

  // Sync view when value changes externally (edit pre-fill)
  useEffect(() => {
    if (value) {
      const d = new Date(value + "T00:00:00");
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
    }
  }, [value]);

  // Position the portal panel relative to the trigger button
  function updatePosition() {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const panelWidth = Math.max(rect.width, 300);
    const spaceBelow = window.innerHeight - rect.bottom;
    const panelHeight = 360; // approximate
    const placeAbove = spaceBelow < panelHeight + 16 && rect.top > panelHeight + 16;

    setPanelStyle({
      position: "fixed",
      width: panelWidth,
      left: Math.min(rect.left, window.innerWidth - panelWidth - 8),
      ...(placeAbove
        ? { bottom: window.innerHeight - rect.top + 8 }
        : { top: rect.bottom + 8 }),
      zIndex: 9999,
    });
  }

  function openPicker() {
    if (open) { setOpen(false); return; }
    updatePosition();
    setOpen(true);
  }

  // Close on outside click / scroll
  useEffect(() => {
    if (!open) return;
    function onPointer(e: MouseEvent | TouchEvent) {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
    }
    function onScroll() { updatePosition(); }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("touchstart", onPointer, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true, capture: true });
    window.addEventListener("resize", onScroll);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("touchstart", onPointer);
      window.removeEventListener("scroll", onScroll, { capture: true });
      window.removeEventListener("resize", onScroll);
    };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  }

  // Build Monday-first grid
  const firstDay = new Date(viewYear, viewMonth, 1);
  const lastDay = new Date(viewYear, viewMonth + 1, 0);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const totalCells = Math.ceil((startOffset + lastDay.getDate()) / 7) * 7;
  const cells: (number | null)[] = [];
  for (let i = 0; i < totalCells; i++) {
    const day = i - startOffset + 1;
    cells.push(day >= 1 && day <= lastDay.getDate() ? day : null);
  }

  function selectDay(day: number) {
    const m = String(viewMonth + 1).padStart(2, "0");
    const d = String(day).padStart(2, "0");
    const iso = `${viewYear}-${m}-${d}`;
    onChange(iso === value ? "" : iso);
    setOpen(false);
  }

  function clearDate(e: React.MouseEvent) {
    e.stopPropagation();
    onChange("");
  }

  const displayLabel = value
    ? new Date(value + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : null;

  const panel = open ? (
    <div
      ref={panelRef}
      style={panelStyle}
      className="rounded-2xl border border-white/10 bg-[#0f1117] p-4 shadow-2xl shadow-black/60 animate-[slide-in-up_0.18s_cubic-bezier(0.22,1,0.36,1)_both]"
    >
      {/* Month navigation */}
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={prevMonth}
          className="flex size-8 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-white/8 hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
        </button>
        <span className="text-sm font-semibold text-foreground">
          {MONTH_NAMES[viewMonth]} {viewYear}
        </span>
        <button
          type="button"
          onClick={nextMonth}
          className="flex size-8 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-white/8 hover:text-foreground"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      {/* Day headers */}
      <div className="mb-1 grid grid-cols-7">
        {DAY_HEADERS.map((h) => (
          <div key={h} className="py-1 text-center text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/50">
            {h}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-y-0.5">
        {cells.map((day, i) => {
          if (!day) return <div key={i} />;
          const m = String(viewMonth + 1).padStart(2, "0");
          const d = String(day).padStart(2, "0");
          const iso = `${viewYear}-${m}-${d}`;
          const isSelected = iso === value;
          const isToday = iso === todayISO;
          const isPast = iso < todayISO;

          return (
            <button
              key={i}
              type="button"
              onClick={() => selectDay(day)}
              className={cn(
                "mx-auto flex size-9 cursor-pointer items-center justify-center rounded-xl text-sm font-medium transition-all duration-100",
                isSelected
                  ? "bg-accent text-white shadow-md shadow-accent/30"
                  : isToday
                    ? "bg-white/10 text-foreground ring-1 ring-white/20"
                    : isPast
                      ? "text-muted-foreground/40 hover:bg-white/6 hover:text-muted-foreground"
                      : "text-foreground hover:bg-white/8"
              )}
            >
              {day}
            </button>
          );
        })}
      </div>

      {/* Today shortcut */}
      <div className="mt-3 border-t border-white/8 pt-3">
        <button
          type="button"
          onClick={() => { onChange(todayISO); setOpen(false); }}
          className="w-full cursor-pointer rounded-xl py-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-white/6 hover:text-foreground"
        >
          Today
        </button>
      </div>
    </div>
  ) : null;

  return (
    <>
      {/* Trigger */}
      <button
        ref={triggerRef}
        type="button"
        onClick={openPicker}
        className={cn(
          "flex w-full cursor-pointer items-center gap-3 rounded-lg border bg-white/5 px-3 py-2.5 text-base transition-all duration-150",
          open ? "border-accent/50 bg-white/8" : "border-glass-border hover:border-white/20 hover:bg-white/8"
        )}
      >
        <Calendar className={cn("size-4 shrink-0 transition-colors", value ? "text-accent" : "text-muted-foreground/50")} />
        <span className={cn("flex-1 text-left", value ? "text-foreground" : "text-muted-foreground/40")}>
          {displayLabel ?? "Pick a date…"}
        </span>
        {value && (
          <span
            role="button"
            onClick={clearDate}
            className="flex size-5 cursor-pointer items-center justify-center rounded-full text-muted-foreground/50 transition-colors hover:bg-white/10 hover:text-foreground"
          >
            <X className="size-3" />
          </span>
        )}
      </button>

      {/* Portal: renders outside all overflow containers */}
      {typeof document !== "undefined" &&
        open &&
        createPortal(panel, document.body)}
    </>
  );
}
