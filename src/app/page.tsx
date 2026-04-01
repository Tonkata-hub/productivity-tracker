"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { getTasksForDate, formatDateISO, getWeekDates } from "@/lib/calendar-utils";
import type { Task, TaskWithStatus } from "@/lib/types";
import { CheckCircle2, Circle, Droplets, Activity, Scale, Utensils, Moon, FileText, Flame } from "lucide-react";
import { cn } from "@/lib/utils";

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const QUICK_ACTIONS = [
  { icon: Droplets, label: "Water +500ml", color: "#60a5fa" },
  { icon: Activity, label: "Steps +1000", color: "#34d399" },
  { icon: Scale, label: "Log Weight", color: "#fbbf24" },
  { icon: Utensils, label: "Log Meal", color: "#f87171" },
  { icon: Moon, label: "Log Sleep", color: "#a78bfa" },
  { icon: FileText, label: "Quick Note", color: "#fb923c" },
];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function HomePage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [todayCompletions, setTodayCompletions] = useState<Set<string>>(new Set());
  const [todayQuantValues, setTodayQuantValues] = useState<Map<string, number>>(new Map());
  const [weekCompletions, setWeekCompletions] = useState<Set<string>>(new Set());
  const [weekQuantValues, setWeekQuantValues] = useState<Map<string, number>>(new Map());
  const [gymSessions, setGymSessions] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [toggling, setToggling] = useState<Set<string>>(new Set());

  const today = formatDateISO(new Date());
  const weekDates = getWeekDates(new Date());
  const formattedDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      const dates = getWeekDates(new Date());
      const from = formatDateISO(dates[0]);
      const to = formatDateISO(dates[6]);
      const todayISO = formatDateISO(new Date());

      const [tasksRes, completionsRes, workoutsRes] = await Promise.all([
        supabase.from("tasks").select("*"),
        supabase.from("task_completions").select("task_id, date, value").gte("date", from).lte("date", to),
        supabase
          .from("workouts")
          .select("id")
          .not("ended_at", "is", null)
          .gte("started_at", `${from}T00:00:00`)
          .lte("started_at", `${to}T23:59:59`),
      ]);

      if (tasksRes.data) setTasks(tasksRes.data as Task[]);

      if (completionsRes.data) {
        const allSet = new Set<string>();
        const allQmap = new Map<string, number>();
        const tSet = new Set<string>();
        const tQmap = new Map<string, number>();

        for (const c of completionsRes.data as { task_id: string; date: string; value: number | null }[]) {
          const key = `${c.task_id}:${c.date}`;
          allSet.add(key);
          if (c.value != null) allQmap.set(key, (allQmap.get(key) ?? 0) + c.value);
          if (c.date === todayISO) {
            tSet.add(key);
            if (c.value != null) tQmap.set(key, (tQmap.get(key) ?? 0) + c.value);
          }
        }

        setWeekCompletions(allSet);
        setWeekQuantValues(allQmap);
        setTodayCompletions(tSet);
        setTodayQuantValues(tQmap);
      }

      if (workoutsRes.data) setGymSessions(workoutsRes.data.length);
      setIsLoading(false);
    }
    load();
  }, []);

  const todayTasks = getTasksForDate(tasks, today, todayCompletions, todayQuantValues);
  const completedCount = todayTasks.filter((t) => t.isCompleted).length;
  const dailyCount = tasks.filter((t) => t.type === "daily").length;
  const upcomingCount = tasks.filter(
    (t) => t.type === "one_time" && !t.is_completed && (!t.due_date || t.due_date >= today)
  ).length;

  const weekStreak = weekDates.map((date, i) => {
    const iso = formatDateISO(date);
    const isFuture = iso > today;
    const isToday = iso === today;
    if (isFuture) return { day: DAY_NAMES[i], fraction: 0, isFuture: true, isToday: false };
    const dayTasks = getTasksForDate(tasks, iso, weekCompletions, weekQuantValues).filter((t) => t.type === "daily");
    if (dayTasks.length === 0) return { day: DAY_NAMES[i], fraction: 1, isFuture: false, isToday };
    const done = dayTasks.filter((t) => t.isCompleted).length;
    return { day: DAY_NAMES[i], fraction: done / dayTasks.length, isFuture: false, isToday };
  });

  const toggleTask = async (task: TaskWithStatus) => {
    if (task.target_value != null) return;
    const key = `${task.id}:${today}`;
    const wasCompleted = task.isCompleted;
    setToggling((prev) => new Set([...prev, task.id]));

    // Optimistic
    setTodayCompletions((prev) => {
      const n = new Set(prev);
      if (wasCompleted) {
        n.delete(key);
      } else {
        n.add(key);
      }
      return n;
    });

    if (task.type === "daily") {
      if (wasCompleted) {
        await supabase.from("task_completions").delete().eq("task_id", task.id).eq("date", today);
      } else {
        await supabase
          .from("task_completions")
          .insert({ task_id: task.id, date: today, completed_at: new Date().toISOString() });
      }
    } else {
      await supabase
        .from("tasks")
        .update({ is_completed: !wasCompleted, completed_at: wasCompleted ? null : new Date().toISOString() })
        .eq("id", task.id);
      setTasks((prev) =>
        prev.map((t) =>
          t.id === task.id
            ? {
                ...t,
                is_completed: !wasCompleted,
                completed_at: wasCompleted ? null : new Date().toISOString(),
              }
            : t
        )
      );
    }

    setToggling((prev) => {
      const n = new Set(prev);
      n.delete(task.id);
      return n;
    });
  };

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center min-h-[80vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-7 h-7 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 pt-6 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
          <div className="space-y-5">
            {/* Header */}
            <div className="calendar-animate-slide-in-up">
              <p className="text-xs text-muted-foreground uppercase tracking-widest">{formattedDate}</p>
              <h1 className="text-3xl font-bold text-foreground mt-1 tracking-tight">{getGreeting()}</h1>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 calendar-animate-slide-in-up" style={{ animationDelay: "60ms" }}>
              <StatCard label="Done today" value={`${completedCount} / ${todayTasks.length}`} sub="tasks" accent />
              <StatCard label="Daily habits" value={dailyCount} sub="active" />
              <StatCard label="Upcoming" value={upcomingCount} sub="one-time tasks" />
              <StatCard label="Gym this week" value={gymSessions} sub="sessions" />
            </div>

            {/* Weekly streak */}
            <div
              className="glass rounded-2xl p-4 space-y-4 calendar-animate-slide-in-up"
              style={{ animationDelay: "110ms" }}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-foreground">This Week</h2>
                <Flame className="w-4 h-4 text-accent" />
              </div>
              <div className="grid grid-cols-7 gap-1">
                {weekStreak.map(({ day, fraction, isFuture, isToday }) => {
                  const circumference = 2 * Math.PI * 11;
                  const dash = fraction * circumference;
                  return (
                    <div key={day} className="flex flex-col items-center gap-1.5">
                      <div className="relative w-9 h-9">
                        <svg viewBox="0 0 28 28" className="w-9 h-9 -rotate-90">
                          <circle cx="14" cy="14" r="11" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="2.5" />
                          {!isFuture && fraction > 0 && (
                            <circle
                              cx="14"
                              cy="14"
                              r="11"
                              fill="none"
                              stroke={fraction >= 1 ? "#ff3b3b" : "rgba(255,59,59,0.45)"}
                              strokeWidth="2.5"
                              strokeDasharray={`${dash} ${circumference}`}
                              strokeLinecap="round"
                            />
                          )}
                        </svg>
                        {fraction >= 1 && !isFuture && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                          </div>
                        )}
                      </div>
                      <span
                        className={cn(
                          "text-[10px] font-medium",
                          isToday ? "text-accent" : isFuture ? "text-muted-foreground/30" : "text-muted-foreground"
                        )}
                      >
                        {day}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick actions */}
            <div className="space-y-3 calendar-animate-slide-in-up" style={{ animationDelay: "210ms" }}>
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-foreground">Quick Actions</h2>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground/40">Coming soon</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {QUICK_ACTIONS.map(({ icon: Icon, label, color }) => (
                  <button
                    key={label}
                    disabled
                    className="glass rounded-xl py-3.5 px-2 flex flex-col items-center gap-2 opacity-50 cursor-not-allowed"
                  >
                    <Icon className="w-5 h-5 shrink-0" style={{ color }} />
                    <span className="text-[10px] text-muted-foreground text-center leading-tight">{label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right column: Today's tasks */}
          <div className="space-y-2 calendar-animate-slide-in-up md:pt-1" style={{ animationDelay: "160ms" }}>
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-foreground">Today</h2>
              <span className="text-xs text-muted-foreground">
                {completedCount} / {todayTasks.length}
              </span>
            </div>
            {todayTasks.length === 0 ? (
              <div className="glass rounded-2xl p-8 text-center">
                <p className="text-muted-foreground text-sm">No tasks for today</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {todayTasks.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    onToggle={() => toggleTask(task)}
                    isToggling={toggling.has(task.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string | number;
  sub: string;
  accent?: boolean;
}) {
  return (
    <div className={cn("glass rounded-2xl p-4 flex flex-col gap-0.5", accent && "border-accent/20")}>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className={cn("text-2xl font-bold tracking-tight", accent ? "text-accent" : "text-foreground")}>{value}</p>
      <p className="text-[10px] text-muted-foreground">{sub}</p>
    </div>
  );
}

function TaskRow({ task, onToggle, isToggling }: { task: TaskWithStatus; onToggle: () => void; isToggling: boolean }) {
  const priorityDot: Record<string, string> = {
    high: "bg-red-500",
    medium: "bg-yellow-500",
    low: "bg-zinc-500",
  };

  return (
    <div
      className={cn(
        "glass rounded-xl px-4 py-3 flex items-center gap-3 transition-opacity",
        task.isCompleted && "opacity-40"
      )}
    >
      <button
        onClick={onToggle}
        disabled={isToggling || task.target_value != null}
        className="shrink-0 transition-transform active:scale-90 disabled:cursor-default"
        aria-label={task.isCompleted ? "Mark incomplete" : "Mark complete"}
      >
        {task.isCompleted ? (
          <CheckCircle2 className="w-5 h-5 text-accent" />
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
        {task.isOverdue && <p className="text-[10px] text-red-400 font-medium">Overdue</p>}
        {task.target_value != null && (
          <p className="text-[10px] text-muted-foreground">
            {task.currentValue} / {task.target_value} {task.unit}
          </p>
        )}
      </div>

      {task.priority && (
        <div
          className={cn("w-1.5 h-1.5 rounded-full shrink-0", priorityDot[task.priority] ?? "")}
          title={task.priority}
        />
      )}
    </div>
  );
}
