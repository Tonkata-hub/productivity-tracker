"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { Workout, WorkoutWithExercises } from "@/lib/types";
import { WorkoutSession } from "@/components/gym/WorkoutSession";
import { WorkoutHistory } from "@/components/gym/WorkoutHistory";
import { WorkoutCalendar } from "@/components/gym/WorkoutCalendar";
import { formatDuration } from "@/lib/gym-utils";
import { mockWorkouts } from "@/lib/mock-data";
import { Dumbbell, Plus, History, TrendingUp, CalendarDays, AlertCircle, Loader2, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type View = "home" | "history" | "calendar";
const useMock = process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true";
const mockRecentWorkouts = [...mockWorkouts].sort(
  (a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
);

// const NAME_CHIPS = ["Push", "Pull", "Upper", "Lower"];
const NAME_CHIPS = [
  "Push Day",
  "Pull Day",
  "Upper Body",
  "Lower Body",
  "Leg Day",
  "Full Body",
  "Cardio",
  "Arms & Core",
];

export default function GymPage() {
  const [activeWorkout, setActiveWorkout] = useState<WorkoutWithExercises | null>(null);
  const [recentWorkouts, setRecentWorkouts] = useState<Workout[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isStartingWorkout, setIsStartingWorkout] = useState(false);
  const [view, setView] = useState<View>("home");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Name-before-start sheet
  const [nameSheetVisible, setNameSheetVisible] = useState(false);
  const [nameSheetAnimated, setNameSheetAnimated] = useState(false);
  const [nameSheetExiting, setNameSheetExiting] = useState(false);
  const [pendingName, setPendingName] = useState("");

  useEffect(() => {
    if (!nameSheetVisible) return;
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setNameSheetAnimated(true)));
    return () => cancelAnimationFrame(id);
  }, [nameSheetVisible]);

  const fetchActiveWorkout = useCallback(async () => {
    if (useMock) {
      setActiveWorkout(null);
      return;
    }

    const { data, error } = await supabase
      .from("workouts")
      .select(
        `
        *,
        workout_exercises (
          *,
          exercise:exercises (*),
          sets:exercise_sets (*)
        )
      `
      )
      .is("ended_at", null)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      setErrorMessage(`Could not load active workout: ${error.message}`);
      setActiveWorkout(null);
      return;
    }

    if (data) {
      const workout = data as WorkoutWithExercises;
      workout.workout_exercises = workout.workout_exercises
        .sort((a, b) => a.exercise_order - b.exercise_order)
        .map((we) => ({ ...we, sets: we.sets.sort((a, b) => a.set_order - b.set_order) }));
      setActiveWorkout(workout);
    } else {
      setActiveWorkout(null);
    }
  }, []);

  const fetchRecentWorkouts = useCallback(async () => {
    if (useMock) {
      setRecentWorkouts(mockRecentWorkouts);
      return;
    }

    const { data, error } = await supabase
      .from("workouts")
      .select("*")
      .not("ended_at", "is", null)
      .order("started_at", { ascending: false })
      .limit(20);

    if (error) {
      setErrorMessage(`Could not load workout history: ${error.message}`);
      return;
    }
    if (data) setRecentWorkouts(data);
  }, []);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setErrorMessage(null);
      await Promise.all([fetchActiveWorkout(), fetchRecentWorkouts()]);
      setIsLoading(false);
    };
    load();
  }, [fetchActiveWorkout, fetchRecentWorkouts]);

  // Open the name sheet
  const openNameSheet = () => {
    setNameSheetAnimated(false);
    setPendingName("");
    setNameSheetExiting(false);
    setNameSheetVisible(true);
  };

  const closeNameSheet = () => {
    setNameSheetExiting(true);
    setTimeout(() => {
      setNameSheetVisible(false);
      setNameSheetExiting(false);
      setPendingName("");
    }, 300);
  };

  // Create the workout after name is confirmed
  const confirmStartWorkout = async () => {
    if (!pendingName.trim()) return;
    if (useMock) {
      setErrorMessage("Mock mode is enabled. Starting workouts is disabled.");
      closeNameSheet();
      return;
    }

    setIsStartingWorkout(true);
    setErrorMessage(null);

    const { data, error } = await supabase
      .from("workouts")
      .insert({
        started_at: new Date().toISOString(),
        total_sets: 0,
        total_volume_kg: 0,
        name: pendingName.trim(),
      })
      .select()
      .single();

    setIsStartingWorkout(false);
    if (error) {
      setErrorMessage(`Could not start workout: ${error.message}`);
      closeNameSheet();
      return;
    }
    if (data) {
      closeNameSheet();
      // Small delay so the sheet closes before the session mounts
      setTimeout(() => setActiveWorkout({ ...data, workout_exercises: [] }), 180);
    }
  };

  const endWorkout = async () => {
    if (!activeWorkout) return;
    if (useMock) return;
    setErrorMessage(null);

    let totalSets = 0;
    let totalVolume = 0;
    activeWorkout.workout_exercises.forEach((we) => {
      we.sets.forEach((set) => {
        totalSets++;
        totalVolume += set.reps * set.weight_kg;
      });
    });

    const startedAt = new Date(activeWorkout.started_at);
    const endedAt = new Date();
    const durationSeconds = Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000);

    const { error } = await supabase
      .from("workouts")
      .update({
        ended_at: endedAt.toISOString(),
        duration_seconds: durationSeconds,
        total_sets: totalSets,
        total_volume_kg: totalVolume,
      })
      .eq("id", activeWorkout.id);

    if (error) {
      setErrorMessage(`Could not save workout: ${error.message}`);
      return;
    }

    setActiveWorkout(null);
    fetchRecentWorkouts();
  };

  // Discard the in-progress workout entirely
  const abortWorkout = async () => {
    if (!activeWorkout) return;
    if (useMock) return;
    await supabase.from("workouts").delete().eq("id", activeWorkout.id);
    setActiveWorkout(null);
  };

  // ── Loading ───────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen md:flex md:items-center md:justify-center">
        <div className="w-full max-w-lg px-4 pt-6 md:pt-0">
          <div className="glass rounded-2xl flex items-center justify-center gap-3 p-10">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Loading gym…</span>
          </div>
        </div>
      </div>
    );
  }

  // ── Active workout ────────────────────────────────────────
  if (activeWorkout) {
    return (
      <WorkoutSession
        workout={activeWorkout}
        onEndWorkout={endWorkout}
        onRefresh={fetchActiveWorkout}
        onAbortWorkout={abortWorkout}
      />
    );
  }

  // Stats
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekWorkouts = recentWorkouts.filter((w) => new Date(w.started_at) >= weekAgo);
  const totalVolumeAll = recentWorkouts.reduce((sum, w) => sum + (w.total_volume_kg || 0), 0);

  return (
    <>
      <div className="min-h-screen md:flex md:items-center md:justify-center">
        <div className="w-full max-w-lg px-4 pt-6 pb-10 md:pt-0 md:pb-0 space-y-5 md:overflow-y-auto">
          {/* Header */}
          <div className="calendar-animate-slide-in-up">
            <p className="text-xs text-muted-foreground uppercase tracking-widest">Fitness</p>
            <h1 className="text-3xl font-bold tracking-tight text-foreground mt-1">Gym</h1>
          </div>

          {useMock && (
            <div className="rounded-xl border border-accent/30 bg-accent/10 px-3 py-2 text-xs text-accent">
              Showing mock gym data. Editing is disabled.
            </div>
          )}

          {/* View toggle */}
          <div
            className="relative grid grid-cols-3 rounded-xl bg-white/5 p-0.5 calendar-animate-slide-in-up"
            style={{ animationDelay: "40ms" }}
          >
            <div
              className="absolute top-0.5 bottom-0.5 rounded-lg bg-white/8 border border-white/10 transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]"
              style={{
                width: "calc(33.333% - 2px)",
                transform:
                  view === "home"
                    ? "translateX(2px)"
                    : view === "history"
                      ? "translateX(calc(100% + 2px))"
                      : "translateX(calc(200% + 2px))",
              }}
            />
            {(
              [
                { key: "home", icon: TrendingUp, label: "Overview" },
                { key: "history", icon: History, label: "History" },
                { key: "calendar", icon: CalendarDays, label: "Calendar" },
              ] as const
            ).map(({ key, icon: Icon, label }) => (
              <button
                key={key}
                onClick={() => setView(key)}
                className={cn(
                  "relative z-10 flex cursor-pointer items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-semibold transition-colors duration-150",
                  view === key ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="size-3.5" />
                {label}
              </button>
            ))}
          </div>

          {/* Error */}
          {errorMessage && (
            <div className="flex items-start gap-2 rounded-xl border border-accent/30 bg-accent/10 p-3 text-sm text-accent">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <p>{errorMessage}</p>
            </div>
          )}

          {view === "home" ? (
            <>
              {/* Start workout CTA */}
              <button
                onClick={openNameSheet}
                disabled={useMock}
                className={cn(
                  "flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl px-6 py-4 text-sm font-semibold",
                  "bg-accent text-white shadow-lg shadow-accent/30",
                  "transition-all hover:bg-accent/90 active:scale-[0.98]",
                  "calendar-animate-slide-in-up",
                  useMock && "cursor-not-allowed opacity-60 hover:bg-accent"
                )}
                style={{ animationDelay: "80ms" }}
              >
                <Plus className="size-5" />
                {useMock ? "Start Disabled (Mock Mode)" : "Start Workout"}
              </button>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3 calendar-animate-slide-in-up" style={{ animationDelay: "120ms" }}>
                <div className="glass rounded-2xl p-4">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">This week</p>
                  <p className="text-2xl font-bold text-foreground">
                    {weekWorkouts.length}
                    <span className="text-sm font-normal text-muted-foreground ml-1">workouts</span>
                  </p>
                </div>
                <div className="glass rounded-2xl p-4">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Total volume</p>
                  <p className="text-2xl font-bold text-foreground">
                    {Math.round(totalVolumeAll).toLocaleString()}
                    <span className="text-sm font-normal text-muted-foreground ml-1">kg</span>
                  </p>
                </div>
              </div>

              {/* Recent workouts */}
              {recentWorkouts.length > 0 ? (
                <div className="space-y-2 calendar-animate-slide-in-up" style={{ animationDelay: "160ms" }}>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold px-1">
                    Recent
                  </p>
                  <div className="glass rounded-2xl overflow-hidden divide-y divide-border">
                    {recentWorkouts.slice(0, 3).map((w) => (
                      <RecentWorkoutRow key={w.id} workout={w} />
                    ))}
                    {recentWorkouts.length > 3 && (
                      <button
                        onClick={() => setView("history")}
                        className="flex w-full cursor-pointer items-center justify-center gap-1 py-3 text-xs text-muted-foreground transition-colors hover:text-foreground"
                      >
                        View all {recentWorkouts.length} workouts
                        <ChevronRight className="size-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div
                  className="glass rounded-2xl flex flex-col items-center justify-center gap-3 p-12 text-center calendar-animate-slide-in-up"
                  style={{ animationDelay: "160ms" }}
                >
                  <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center">
                    <Dumbbell className="size-5 text-muted-foreground/40" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">No workouts yet.</p>
                    <p className="text-xs text-muted-foreground/60 mt-0.5">
                      Start your first workout to track progress.
                    </p>
                  </div>
                </div>
              )}
            </>
          ) : view === "history" ? (
            <div className="calendar-animate-slide-in-up" style={{ animationDelay: "40ms" }}>
              <WorkoutHistory workouts={recentWorkouts} onWorkoutDeleted={fetchRecentWorkouts} readOnly={useMock} />
            </div>
          ) : (
            <div className="calendar-animate-slide-in-up" style={{ animationDelay: "40ms" }}>
              <WorkoutCalendar workouts={recentWorkouts} onWorkoutDeleted={fetchRecentWorkouts} readOnly={useMock} />
            </div>
          )}
        </div>
      </div>

      {/* ── Name-before-start sheet ───────────────────────────── */}
      {nameSheetVisible && (
        <>
          {/* Backdrop */}
          <div
            className={cn(
              "fixed inset-0 z-40 cursor-pointer bg-black/70 backdrop-blur-sm transition-opacity duration-300",
              nameSheetAnimated && !nameSheetExiting ? "opacity-100" : "opacity-0"
            )}
            onClick={closeNameSheet}
          />

          {/* Positioning wrapper */}
          <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center md:p-6 pointer-events-none">
            <div
              className={cn(
                "w-full md:max-w-sm pointer-events-auto",
                "bg-[#0f1117] border-t border-x md:border border-white/10",
                "rounded-t-3xl md:rounded-2xl px-5 pt-5",
                "transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
                nameSheetAnimated && !nameSheetExiting
                  ? "translate-y-0 md:opacity-100 md:scale-100"
                  : "max-md:translate-y-full md:opacity-0 md:scale-95"
              )}
              style={{ paddingBottom: "max(2rem, env(safe-area-inset-bottom))" }}
            >
              {/* Drag handle */}
              <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mb-6" />

              {/* Icon + heading */}
              <div className="flex flex-col items-center gap-2 text-center mb-6">
                <div className="flex size-12 items-center justify-center rounded-2xl bg-accent/15">
                  <Dumbbell className="size-5 text-accent" />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">New workout</p>
                  <p className="text-lg font-bold text-foreground mt-0.5">What&apos;s today&apos;s session?</p>
                </div>
              </div>

              {/* Quick chips */}
              <div className="flex flex-wrap gap-2 mb-4 justify-center">
                {NAME_CHIPS.map((chip) => (
                  <button
                    key={chip}
                    onClick={() => setPendingName(chip)}
                    className={cn(
                      "cursor-pointer rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all duration-150",
                      pendingName === chip
                        ? "border-accent/40 bg-accent/20 text-accent shadow-sm shadow-accent/20"
                        : "border-white/8 bg-white/5 text-muted-foreground hover:bg-white/8 hover:text-foreground"
                    )}
                  >
                    {chip}
                  </button>
                ))}
              </div>

              {/* Custom name input */}
              <div className="glass rounded-2xl px-4 py-3.5 mb-4">
                <input
                  type="text"
                  value={pendingName}
                  onChange={(e) => setPendingName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && pendingName.trim()) confirmStartWorkout();
                  }}
                  placeholder="Or type a custom name…"
                  maxLength={60}
                  autoFocus
                  className="w-full bg-transparent text-base font-medium text-foreground placeholder-muted-foreground/35 outline-none caret-accent"
                />
              </div>

              {/* CTA */}
              <button
                onClick={confirmStartWorkout}
                disabled={!pendingName.trim() || isStartingWorkout}
                className={cn(
                  "flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-sm font-semibold transition-all active:scale-[0.98]",
                  pendingName.trim()
                    ? cn(
                        "bg-accent text-white shadow-lg shadow-accent/30 hover:bg-accent/90",
                        isStartingWorkout ? "cursor-wait" : "cursor-pointer"
                      )
                    : "cursor-not-allowed bg-white/5 text-muted-foreground"
                )}
              >
                {isStartingWorkout ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Starting…
                  </>
                ) : (
                  <>
                    Let&apos;s go <span className="ml-0.5">→</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}

function RecentWorkoutRow({ workout }: { workout: Workout }) {
  const date = new Date(workout.started_at);
  const dateStr = date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{workout.name || dateStr}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          {workout.name ? dateStr + " · " : ""}
          {workout.total_sets} sets · {Math.round(workout.total_volume_kg)} kg
        </p>
      </div>
      <span className="text-sm font-semibold text-accent shrink-0">{formatDuration(workout.duration_seconds)}</span>
    </div>
  );
}
