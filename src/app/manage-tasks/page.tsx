"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { mockTasks } from "@/lib/mock-data";
import { Task, TaskPriority } from "@/lib/types";
import { Trash2, Repeat, Clock, Calendar, BarChart2, AlertTriangle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";

const priorityConfig: Record<NonNullable<TaskPriority>, { dot: string; label: string; badge: string }> = {
  high: { dot: "bg-accent", label: "High", badge: "bg-accent/15 text-accent" },
  medium: { dot: "bg-yellow-400", label: "Med", badge: "bg-yellow-400/15 text-yellow-300" },
  low: { dot: "bg-zinc-400", label: "Low", badge: "bg-zinc-400/15 text-zinc-400" },
};

const useMock = process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true";

type Filter = "all" | "daily" | "one_time";

export default function ManageTasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [sheetExiting, setSheetExiting] = useState(false);
  const [sheetAnimated, setSheetAnimated] = useState(false);

  useEffect(() => {
    if (!sheetVisible) return;
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setSheetAnimated(true)));
    return () => cancelAnimationFrame(id);
  }, [sheetVisible]);

  useEffect(() => {
    async function fetchTasks() {
      if (useMock) {
        setTasks(mockTasks);
        setLoading(false);
        return;
      }
      const { data, error } = await supabase.from("tasks").select("*").order("created_at", { ascending: false });
      if (!error && data) setTasks(data as Task[]);
      setLoading(false);
    }
    fetchTasks();
  }, []);

  function openSheet(id: string) {
    setSheetAnimated(false);
    setPendingDeleteId(id);
    setSheetExiting(false);
    setSheetVisible(true);
  }

  function closeSheet() {
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

    if (!useMock) {
      const { error: ce } = await supabase.from("task_completions").delete().eq("task_id", pendingDeleteId);
      if (ce) {
        setDeleting(false);
        closeSheet();
        return;
      }
      const { error: te } = await supabase.from("tasks").delete().eq("id", pendingDeleteId);
      if (te) {
        setDeleting(false);
        closeSheet();
        return;
      }
    }

    setTasks((prev) => prev.filter((t) => t.id !== pendingDeleteId));
    setDeleting(false);
    closeSheet();
  }

  const dailyTasks = tasks.filter((t) => t.type === "daily");
  const oneTimeTasks = tasks.filter((t) => t.type === "one_time");
  const filtered = filter === "daily" ? dailyTasks : filter === "one_time" ? oneTimeTasks : tasks;
  const pendingTask = tasks.find((t) => t.id === pendingDeleteId) ?? null;

  const FILTERS: { value: Filter; label: string; count: number }[] = [
    { value: "all", label: "All", count: tasks.length },
    { value: "daily", label: "Daily", count: dailyTasks.length },
    { value: "one_time", label: "One-time", count: oneTimeTasks.length },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-lg px-4 pt-6 pb-10 space-y-5">
        {/* Header */}
        <div className="calendar-animate-slide-in-up">
          <p className="text-xs text-muted-foreground uppercase tracking-widest">Library</p>
          <h1 className="text-3xl font-bold tracking-tight text-foreground mt-1">Manage Tasks</h1>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 calendar-animate-slide-in-up" style={{ animationDelay: "50ms" }}>
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150",
                filter === f.value
                  ? "bg-accent/15 text-accent border border-accent/25"
                  : "bg-white/5 text-muted-foreground border border-transparent hover:text-foreground hover:bg-white/8"
              )}
            >
              {f.label}
              <span
                className={cn(
                  "text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center",
                  filter === f.value ? "bg-accent/20 text-accent" : "bg-white/8 text-muted-foreground"
                )}
              >
                {f.count}
              </span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="space-y-2 calendar-animate-slide-in-up" style={{ animationDelay: "100ms" }}>
          {/* Loading */}
          {loading && (
            <div className="glass rounded-2xl flex items-center justify-center gap-3 p-10">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
              <span className="text-base text-muted-foreground">Loading tasks…</span>
            </div>
          )}

          {/* Empty */}
          {!loading && filtered.length === 0 && (
            <div className="glass rounded-2xl flex flex-col items-center justify-center gap-3 p-14 text-center">
              <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center">
                <BarChart2 className="size-6 text-muted-foreground/40" />
              </div>
              <p className="text-base text-muted-foreground">
                {filter === "all" ? "No tasks yet." : `No ${filter === "daily" ? "daily" : "one-time"} tasks.`}
              </p>
            </div>
          )}

          {/* Task list — individual cards */}
          {!loading &&
            filtered.map((task) => (
              <TaskRow key={task.id} task={task} onDelete={() => openSheet(task.id)} />
            ))}
        </div>
      </div>

      {/* Confirmation sheet */}
      {sheetVisible && (
        <>
          <div
            className={cn(
              "fixed inset-0 z-40 bg-black/70 backdrop-blur-sm transition-opacity duration-300",
              sheetAnimated && !sheetExiting ? "opacity-100" : "opacity-0"
            )}
            onClick={closeSheet}
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
                  className="w-full rounded-2xl bg-accent py-4 text-sm font-semibold text-white shadow-lg shadow-accent/30 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
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
                  onClick={closeSheet}
                  disabled={deleting}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 py-4 text-sm font-medium text-foreground transition-all hover:bg-white/8 disabled:opacity-50"
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

function TaskRow({ task, onDelete }: { task: Task; onDelete: () => void }) {
  const today = new Date().toISOString().split("T")[0];
  const isOverdue = task.type === "one_time" && !!task.due_date && task.due_date < today && !task.is_completed;
  const isDaily = task.type === "daily";
  const hasMeta = !!task.priority || (!!task.due_date && task.type === "one_time");

  return (
    <div className="glass rounded-2xl px-4 py-4 flex items-center gap-3.5 group">
      {/* Type icon */}
      <div
        className={cn(
          "shrink-0 flex size-10 items-center justify-center rounded-xl",
          isDaily ? "bg-accent/10" : "bg-white/5"
        )}
      >
        {isDaily ? (
          <Repeat className="size-4 text-accent/70" />
        ) : (
          <Clock className="size-4 text-muted-foreground/60" />
        )}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-semibold text-foreground">{task.title}</p>

        {/* Target value subtitle */}
        {task.target_value != null && (
          <p className="mt-0.5 text-sm tabular-nums text-muted-foreground">
            {task.target_value} {task.unit}
          </p>
        )}

        {/* Meta row */}
        {hasMeta && (
          <div className="mt-1 flex items-center gap-2 flex-wrap">
            {task.priority && (
              <span
                className={cn(
                  "flex items-center gap-1.5 text-sm font-medium px-2 py-0.5 rounded-md",
                  priorityConfig[task.priority].badge
                )}
              >
                <span className={cn("w-1.5 h-1.5 rounded-full", priorityConfig[task.priority].dot)} />
                {priorityConfig[task.priority].label}
              </span>
            )}

            {task.due_date && task.type === "one_time" && (
              <span
                className={cn(
                  "inline-flex items-center gap-1 text-sm font-medium",
                  isOverdue
                    ? "rounded-md bg-accent/15 px-2 py-0.5 text-accent"
                    : "text-muted-foreground"
                )}
              >
                <Calendar className="size-3 shrink-0" />
                {format(parseISO(task.due_date), "MMM d")}
                {isOverdue && " · Overdue"}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Delete */}
      <button
        onClick={onDelete}
        className="shrink-0 flex size-10 items-center justify-center rounded-xl text-muted-foreground/40 transition-all hover:bg-accent/10 hover:text-accent active:scale-90"
        aria-label={`Delete "${task.title}"`}
      >
        <Trash2 className="size-4" />
      </button>
    </div>
  );
}
