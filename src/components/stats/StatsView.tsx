"use client";

import { useState, useEffect, useMemo } from "react";
import {
  subDays,
  startOfMonth,
  parseISO,
  eachDayOfInterval,
  format,
  startOfWeek,
} from "date-fns";
import { supabase } from "@/lib/supabase";
import { formatDateISO } from "@/lib/calendar-utils";
import { mockTaskCompletions, mockTasks, mockWorkouts } from "@/lib/mock-data";
import type { Task, Workout } from "@/lib/types";

import { TimeRangePicker, type TimeRange } from "./TimeRangePicker";
import { HeroSummary } from "./HeroSummary";
import { DailyHabitsChart, type HabitRow } from "./DailyHabitsChart";
import { TrackedGoalChart, type TrackedDataPoint } from "./TrackedGoalChart";
import { HabitLeaderboard, type HabitStat } from "./HabitLeaderboard";
import { OneTimeTasksChart, type OneTimeStats } from "./OneTimeTasksChart";
import { GymVolumeChart, type GymVolumePoint } from "./GymVolumeChart";
import { GymFrequencyChart, type GymFreqPoint } from "./GymFrequencyChart";

type RawCompletion = { task_id: string; date: string; value: number | null };
const useMock = process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true";

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground px-1">{children}</p>
  );
}

function Divider() {
  return <div className="border-t border-white/5 my-1" />;
}

export function StatsView() {
  const [timeRange, setTimeRange] = useState<TimeRange>("W");
  const [tasks, setTasks] = useState<Task[]>(useMock ? mockTasks : []);
  const [completions, setCompletions] = useState<RawCompletion[]>([]);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(!useMock);

  // ── Date range computation ──────────────────────────────────────────────
  const today = useMemo(() => new Date(), []);
  const todayISO = useMemo(() => formatDateISO(today), [today]);

  const { fromISO, toISO } = useMemo(() => {
    const to = todayISO;
    if (timeRange === "W") return { fromISO: formatDateISO(subDays(today, 6)), toISO: to };
    if (timeRange === "M") return { fromISO: formatDateISO(startOfMonth(today)), toISO: to };
    return { fromISO: null, toISO: to }; // All
  }, [timeRange, today, todayISO]);

  // ── Data fetching ───────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      if (useMock) {
        setTasks(mockTasks);
        setCompletions(
          fromISO
            ? mockTaskCompletions.filter((entry) => entry.date >= fromISO && entry.date <= toISO)
            : mockTaskCompletions
        );
        setWorkouts(
          fromISO
            ? mockWorkouts.filter((workout) => {
                const workoutDate = workout.started_at.slice(0, 10);
                return workoutDate >= fromISO && workoutDate <= toISO;
              })
            : mockWorkouts
        );
        setLoading(false);
        return;
      }

      setLoading(true);

      const completionsQuery = supabase
        .from("task_completions")
        .select("task_id, date, value");
      if (fromISO) completionsQuery.gte("date", fromISO).lte("date", toISO);

      const workoutsQuery = supabase
        .from("workouts")
        .select("id, name, started_at, duration_seconds, total_sets, total_volume_kg")
        .not("ended_at", "is", null)
        .order("started_at", { ascending: true });
      if (fromISO) {
        workoutsQuery.gte("started_at", `${fromISO}T00:00:00`).lte("started_at", `${toISO}T23:59:59`);
      }

      const [tasksRes, completionsRes, workoutsRes] = await Promise.all([
        supabase.from("tasks").select("*"),
        completionsQuery,
        workoutsQuery,
      ]);

      if (tasksRes.data) setTasks(tasksRes.data as Task[]);
      if (completionsRes.data) setCompletions(completionsRes.data as RawCompletion[]);
      if (workoutsRes.data) setWorkouts(workoutsRes.data as Workout[]);
      setLoading(false);
    }
    load();
  }, [fromISO, toISO]);

  // ── Derived date list ───────────────────────────────────────────────────
  const datesInRange = useMemo((): string[] => {
    let startDate: Date;
    if (fromISO) {
      startDate = parseISO(fromISO);
    } else if (completions.length > 0) {
      const minDate = completions.reduce(
        (min, c) => (c.date < min ? c.date : min),
        completions[0].date
      );
      startDate = parseISO(minDate);
    } else {
      startDate = subDays(today, 6);
    }
    return eachDayOfInterval({ start: startDate, end: today }).map((d) => formatDateISO(d));
  }, [fromISO, completions, today]);

  // ── Completion lookup ───────────────────────────────────────────────────
  const completionSet = useMemo(() => {
    const set = new Set<string>();
    for (const c of completions) set.add(`${c.task_id}:${c.date}`);
    return set;
  }, [completions]);

  const valuesByKey = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of completions) {
      if (c.value == null) continue;
      const key = `${c.task_id}:${c.date}`;
      map.set(key, (map.get(key) ?? 0) + c.value);
    }
    return map;
  }, [completions]);

  // ── Task segmentation ───────────────────────────────────────────────────
  const dailyTasks = useMemo(() => tasks.filter((t) => t.type === "daily"), [tasks]);
  const trackedTasks = useMemo(
    () => dailyTasks.filter((t) => t.target_value != null),
    [dailyTasks]
  );
  const regularDailyTasks = useMemo(
    () => dailyTasks.filter((t) => t.target_value == null),
    [dailyTasks]
  );
  const oneTimeTasks = useMemo(() => tasks.filter((t) => t.type === "one_time"), [tasks]);

  // Days that are not in the future
  const pastDatesInRange = useMemo(
    () => datesInRange.filter((d) => d <= todayISO),
    [datesInRange, todayISO]
  );

  // ── Habit rows ──────────────────────────────────────────────────────────
  const habitRows = useMemo((): HabitRow[] => {
    return regularDailyTasks.map((task) => {
      const dots = datesInRange.map((date) => ({
        date,
        completed: completionSet.has(`${task.id}:${date}`),
        isFuture: date > todayISO,
      }));
      const completedCount = dots.filter((d) => !d.isFuture && d.completed).length;
      const totalDays = pastDatesInRange.length;
      const rate = totalDays > 0 ? completedCount / totalDays : 0;
      return { task, dots, rate, completedCount, totalDays };
    });
  }, [regularDailyTasks, datesInRange, completionSet, todayISO, pastDatesInRange]);

  // ── Habit leaderboard ───────────────────────────────────────────────────
  const { bestHabits, worstHabits } = useMemo(() => {
    const sorted = [...habitRows].sort((a, b) => b.rate - a.rate);
    const stats: HabitStat[] = sorted.map((h) => ({
      id: h.task.id,
      title: h.task.title,
      rate: h.rate,
      completedDays: h.completedCount,
      totalDays: h.totalDays,
    }));
    const best = stats.slice(0, 3);
    const worst = stats.length > 3 ? stats.slice(-3).reverse() : [];
    return { bestHabits: best, worstHabits: worst };
  }, [habitRows]);

  // ── Tracked goal data ───────────────────────────────────────────────────
  const trackedGoalData = useMemo(() => {
    return trackedTasks.map((task) => {
      const points: TrackedDataPoint[] = pastDatesInRange.map((date) => {
        const key = `${task.id}:${date}`;
        const value = valuesByKey.has(key) ? valuesByKey.get(key)! : null;
        return {
          date,
          label: format(parseISO(date), datesInRange.length <= 14 ? "EEE d" : "MMM d"),
          value,
        };
      });
      return { task, points };
    });
  }, [trackedTasks, pastDatesInRange, valuesByKey, datesInRange.length]);

  // ── One-time task stats ─────────────────────────────────────────────────
  const oneTimeStats = useMemo((): OneTimeStats => {
    const now = todayISO;
    const fromFilter = fromISO;

    const completed = oneTimeTasks.filter((t) => {
      if (!t.is_completed || !t.completed_at) return false;
      const completedDate = t.completed_at.slice(0, 10);
      if (fromFilter && completedDate < fromFilter) return false;
      return true;
    });

    const overdue = oneTimeTasks.filter(
      (t) => !t.is_completed && t.due_date && t.due_date < now
    );
    const pending = oneTimeTasks.filter(
      (t) => !t.is_completed && (!t.due_date || t.due_date >= now)
    );

    const recentTitles = [...completed]
      .sort((a, b) => (b.completed_at ?? "").localeCompare(a.completed_at ?? ""))
      .slice(0, 5)
      .map((t) => t.title);

    return {
      completed: completed.length,
      pending: pending.length,
      overdue: overdue.length,
      recentTitles,
    };
  }, [oneTimeTasks, todayISO, fromISO]);

  // ── Overall completion rate ─────────────────────────────────────────────
  const overallRate = useMemo(() => {
    if (dailyTasks.length === 0 || pastDatesInRange.length === 0) return 0;
    let total = 0;
    let completed = 0;
    for (const task of regularDailyTasks) {
      for (const date of pastDatesInRange) {
        total++;
        if (completionSet.has(`${task.id}:${date}`)) completed++;
      }
    }
    return total > 0 ? completed / total : 0;
  }, [regularDailyTasks, pastDatesInRange, completionSet, dailyTasks.length]);

  const topHabit = useMemo(() => {
    if (bestHabits.length === 0) return null;
    return { title: bestHabits[0].title, rate: bestHabits[0].rate };
  }, [bestHabits]);

  // ── Gym data ────────────────────────────────────────────────────────────
  const gymVolumeData = useMemo((): GymVolumePoint[] => {
    return workouts.map((w) => ({
      label: format(parseISO(w.started_at), "MMM d"),
      volume: w.total_volume_kg,
      sets: w.total_sets,
    }));
  }, [workouts]);

  const gymFreqData = useMemo((): GymFreqPoint[] => {
    if (workouts.length === 0) return [];
    const weekMap = new Map<string, number>();
    for (const w of workouts) {
      const wStart = startOfWeek(parseISO(w.started_at), { weekStartsOn: 1 });
      const key = formatDateISO(wStart);
      weekMap.set(key, (weekMap.get(key) ?? 0) + 1);
    }
    return Array.from(weekMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, sessions]) => ({
        week: format(parseISO(date), "MMM d"),
        sessions,
      }));
  }, [workouts]);

  // ── Loading state ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center min-h-[80vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-7 h-7 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground text-sm">Loading stats…</p>
        </div>
      </div>
    );
  }

  const hasGymData = workouts.length > 0;
  const hasTrackedGoals = trackedGoalData.length > 0;
  const hasDailyHabits = habitRows.length > 0 || trackedGoalData.length > 0;
  const hasOneTimeTasks = oneTimeTasks.length > 0;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 pt-6 pb-24 space-y-6">
        {/* ── Page header ─────────────────────────────────────── */}
        <div
          className="flex items-start justify-between flex-wrap gap-3 calendar-animate-slide-in-up"
        >
          <h1 className="text-2xl font-bold text-foreground tracking-tight stats-heading">
            Stats
          </h1>
          <TimeRangePicker value={timeRange} onChange={setTimeRange} />
        </div>

        {/* ── Hero summary ─────────────────────────────────────── */}
        <div className="calendar-animate-slide-in-up" style={{ animationDelay: "40ms" }}>
          <HeroSummary
            overallRate={overallRate}
            gymSessions={workouts.length}
            topHabit={topHabit}
            timeRange={timeRange}
          />
        </div>

        {/* ── Tasks section ─────────────────────────────────────── */}
        {(hasDailyHabits || hasOneTimeTasks) && (
          <div
            className="space-y-3 calendar-animate-slide-in-up"
            style={{ animationDelay: "80ms" }}
          >
            <SectionHeader>Tasks</SectionHeader>

            {/* Daily habits dot/heatmap grid */}
            {hasDailyHabits && habitRows.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground px-1">Daily habits</p>
                <DailyHabitsChart
                  habitRows={habitRows}
                  datesInRange={datesInRange}
                  timeRange={timeRange}
                />
              </div>
            )}

            {/* Tracked goals */}
            {hasTrackedGoals && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground px-1">Tracked goals</p>
                {trackedGoalData.map(({ task, points }) => (
                  <TrackedGoalChart key={task.id} task={task} points={points} />
                ))}
              </div>
            )}

            {/* Habit leaderboard */}
            {habitRows.length >= 2 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground px-1">Habit performance</p>
                <HabitLeaderboard best={bestHabits} worst={worstHabits} />
              </div>
            )}

            {/* One-time tasks */}
            {hasOneTimeTasks && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground px-1">One-time tasks</p>
                <OneTimeTasksChart stats={oneTimeStats} />
              </div>
            )}
          </div>
        )}

        {/* ── Gym section ─────────────────────────────────────── */}
        {hasGymData && (
          <div
            className="space-y-3 calendar-animate-slide-in-up"
            style={{ animationDelay: "120ms" }}
          >
            <Divider />
            <SectionHeader>Gym</SectionHeader>

            <GymVolumeChart data={gymVolumeData} />
            {gymFreqData.length > 1 && <GymFrequencyChart data={gymFreqData} />}
          </div>
        )}

        {/* ── Empty state ─────────────────────────────────────── */}
        {!hasDailyHabits && !hasOneTimeTasks && !hasGymData && (
          <div className="glass rounded-2xl p-12 text-center space-y-2">
            <p className="text-foreground font-medium">No data yet</p>
            <p className="text-muted-foreground text-sm">
              Start tracking tasks and workouts to see your stats here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
