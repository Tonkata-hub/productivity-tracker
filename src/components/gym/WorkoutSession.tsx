"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import type { WorkoutWithExercises, Exercise, LastExercisePerformance, ExerciseSet } from "@/lib/types";
import { ExerciseCard } from "./ExerciseCard";
import { WorkoutSummary } from "./WorkoutSummary";
import { formatTime } from "@/lib/gym-utils";
import { Plus, Check, X, Timer, AlertTriangle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface WorkoutSessionProps {
  workout: WorkoutWithExercises;
  onEndWorkout: () => void;
  onRefresh: () => void;
  onAbortWorkout: () => Promise<void>;
}

type WorkoutRelation = { started_at: string } | { started_at: string }[];

export function WorkoutSession({ workout, onEndWorkout, onRefresh, onAbortWorkout }: WorkoutSessionProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [newExerciseName, setNewExerciseName] = useState("");
  const [isAddingExercise, setIsAddingExercise] = useState(false);
  const [exerciseSuggestions, setExerciseSuggestions] = useState<Exercise[]>([]);
  const [showSummary, setShowSummary] = useState(false);
  const [lastPerformances, setLastPerformances] = useState<Record<string, LastExercisePerformance>>({});
  const [workoutName, setWorkoutName] = useState(workout.name ?? "");
  const isFirstRender = useRef(true);
  const inputRef = useRef<HTMLInputElement>(null);

  // Abort confirmation sheet
  const [abortSheetVisible, setAbortSheetVisible] = useState(false);
  const [abortSheetAnimated, setAbortSheetAnimated] = useState(false);
  const [abortSheetExiting, setAbortSheetExiting] = useState(false);
  const [isAborting, setIsAborting] = useState(false);

  useEffect(() => {
    if (!abortSheetVisible) return;
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setAbortSheetAnimated(true)));
    return () => cancelAnimationFrame(id);
  }, [abortSheetVisible]);

  const openAbortSheet = () => {
    setAbortSheetAnimated(false);
    setAbortSheetExiting(false);
    setAbortSheetVisible(true);
  };

  const closeAbortSheet = () => {
    setAbortSheetExiting(true);
    setTimeout(() => {
      setAbortSheetVisible(false);
      setAbortSheetExiting(false);
    }, 300);
  };

  const confirmAbort = async () => {
    setIsAborting(true);
    await onAbortWorkout();
    // Parent unmounts this component — no further state needed
  };

  // Auto-save name to DB (debounced, skips initial render)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const t = setTimeout(async () => {
      await supabase
        .from("workouts")
        .update({ name: workoutName.trim() || null })
        .eq("id", workout.id);
    }, 800);
    return () => clearTimeout(t);
  }, [workoutName, workout.id]);

  // Timer
  useEffect(() => {
    const startTime = new Date(workout.started_at).getTime();
    const update = () => setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [workout.started_at]);

  // Search exercises with debounce
  useEffect(() => {
    const search = async () => {
      if (newExerciseName.trim().length < 1) {
        setExerciseSuggestions([]);
        return;
      }
      const { data } = await supabase
        .from("exercises")
        .select("*")
        .ilike("name_lower", `%${newExerciseName.toLowerCase()}%`)
        .limit(5);
      if (data) setExerciseSuggestions(data);
    };
    const t = setTimeout(search, 200);
    return () => clearTimeout(t);
  }, [newExerciseName]);

  // Fetch last performance for all exercises — single query (fixes N+1)
  useEffect(() => {
    const fetchLastPerformances = async () => {
      const exerciseIds = workout.workout_exercises.map((we) => we.exercise_id);
      if (exerciseIds.length === 0) return;

      const { data } = await supabase
        .from("workout_exercises")
        .select(
          `
          exercise_id,
          workout_id,
          workout:workouts!inner(started_at, ended_at),
          sets:exercise_sets(set_order, reps, weight_kg)
        `
        )
        .in("exercise_id", exerciseIds)
        .neq("workout_id", workout.id)
        .not("workout.ended_at", "is", null)
        .order("workout(started_at)", { ascending: false });

      if (!data) return;

      const performances: Record<string, LastExercisePerformance> = {};
      for (const row of data) {
        if (!performances[row.exercise_id]) {
          const workoutRelation = row.workout as WorkoutRelation;
          const startedAt = Array.isArray(workoutRelation)
            ? workoutRelation[0]?.started_at
            : workoutRelation?.started_at;
          if (!startedAt) continue;

          performances[row.exercise_id] = {
            workout_date: startedAt,
            sets: (row.sets as ExerciseSet[]).sort((a, b) => a.set_order - b.set_order),
          };
        }
      }
      setLastPerformances(performances);
    };

    fetchLastPerformances();
  }, [workout.workout_exercises, workout.id]);

  const addExercise = async (exerciseName: string) => {
    const nameTrimmed = exerciseName.trim().slice(0, 100);
    const nameLower = nameTrimmed.toLowerCase();
    if (!nameLower) return;

    let exercise: Exercise | null = null;

    const { data: existing } = await supabase.from("exercises").select("*").eq("name_lower", nameLower).single();

    if (existing) {
      exercise = existing;
    } else {
      const { data: created } = await supabase
        .from("exercises")
        .insert({ name: nameTrimmed, name_lower: nameLower })
        .select()
        .single();
      if (created) exercise = created;
    }

    if (!exercise) return;

    await supabase.from("workout_exercises").insert({
      workout_id: workout.id,
      exercise_id: exercise.id,
      exercise_order: workout.workout_exercises.length + 1,
    });

    setNewExerciseName("");
    setIsAddingExercise(false);
    setExerciseSuggestions([]);
    onRefresh();
  };

  const totalSets = workout.workout_exercises.reduce((sum, we) => sum + we.sets.length, 0);
  const totalVolume = workout.workout_exercises.reduce(
    (sum, we) => sum + we.sets.reduce((s, set) => s + set.reps * set.weight_kg, 0),
    0
  );

  if (showSummary) {
    return (
      <WorkoutSummary
        workout={workout}
        duration={elapsedSeconds}
        totalSets={totalSets}
        totalVolume={totalVolume}
        onConfirm={onEndWorkout}
        onCancel={() => setShowSummary(false)}
      />
    );
  }

  return (
    <>
      <div className="min-h-screen pb-24">
        {/* Sticky header */}
        <div className="sticky top-0 z-10 glass-strong border-b border-white/5">
          {/* ① Workout name — the identity, at the top */}
          <div className="flex items-center gap-2 px-4 pt-4 pb-2">
            <input
              type="text"
              value={workoutName}
              onChange={(e) => setWorkoutName(e.target.value)}
              placeholder="Workout name…"
              maxLength={60}
              className="min-w-0 flex-1 bg-transparent text-xl font-bold tracking-tight text-foreground placeholder-white/15 outline-none caret-accent"
            />
          </div>

          {/* ② Controls — abort · timer · finish */}
          <div className="flex items-center justify-between px-4 pb-2">
            {/* Abort */}
            <button
              onClick={openAbortSheet}
              className="flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground/50 transition-colors hover:text-accent/70"
            >
              <X className="size-3.5" />
              Abort
            </button>

            {/* Timer */}
            <div className="flex items-center gap-2 bg-accent/10 border border-accent/20 px-3 py-1.5 rounded-full">
              <Timer className="size-3.5 text-accent" />
              <span className="font-mono font-semibold text-accent tracking-wider text-sm">
                {formatTime(elapsedSeconds)}
              </span>
            </div>

            {/* Finish */}
            <button
              onClick={() => setShowSummary(true)}
              className="flex cursor-pointer items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white shadow-md shadow-accent/25 transition-all hover:bg-accent/90 active:scale-95"
            >
              <Check className="size-4" />
              Finish
            </button>
          </div>

          {/* ③ Live stats */}
          <div className="flex items-center px-4 pb-3 gap-3">
            {[
              { label: "Exercises", value: workout.workout_exercises.length },
              { label: "Sets", value: totalSets },
              { label: "Volume", value: `${Math.round(totalVolume)} kg` },
            ].map((stat) => (
              <div key={stat.label} className="flex-1 bg-white/5 rounded-xl px-3 py-2 text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest">{stat.label}</p>
                <p className="text-sm font-semibold text-foreground">{stat.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Exercise list */}
        <div className="mx-auto max-w-lg px-4 pt-4 space-y-3">
          {workout.workout_exercises.map((we) => (
            <ExerciseCard
              key={we.id}
              workoutExercise={we}
              lastPerformance={lastPerformances[we.exercise_id]}
              onUpdate={onRefresh}
            />
          ))}

          {/* Add exercise */}
          {isAddingExercise ? (
            <div className="glass rounded-2xl overflow-hidden">
              <div className="flex items-center gap-2 p-4">
                <input
                  ref={inputRef}
                  type="text"
                  value={newExerciseName}
                  onChange={(e) => setNewExerciseName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newExerciseName.trim()) addExercise(newExerciseName);
                  }}
                  placeholder="Exercise name…"
                  maxLength={100}
                  className="flex-1 bg-transparent text-base text-foreground placeholder-muted-foreground/40 outline-none caret-accent"
                  autoFocus
                />
                <button
                  onClick={() => {
                    setIsAddingExercise(false);
                    setNewExerciseName("");
                    setExerciseSuggestions([]);
                  }}
                  className="cursor-pointer p-1 text-muted-foreground transition-colors hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              </div>

              {exerciseSuggestions.length > 0 && (
                <div className="border-t border-border divide-y divide-border/40">
                  {exerciseSuggestions.map((ex) => (
                    <button
                      key={ex.id}
                      onClick={() => addExercise(ex.name)}
                      className="w-full cursor-pointer px-4 py-2.5 text-left text-sm text-foreground transition-colors hover:bg-white/5"
                    >
                      {ex.name}
                    </button>
                  ))}
                </div>
              )}

              {newExerciseName.trim() && (
                <div className="border-t border-border p-3">
                  <button
                    onClick={() => addExercise(newExerciseName)}
                    className="w-full cursor-pointer rounded-xl bg-accent py-2.5 text-sm font-semibold text-white transition-all active:scale-[0.98]"
                  >
                    Add &quot;{newExerciseName.trim()}&quot;
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => setIsAddingExercise(true)}
              className={cn(
                "flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border p-4",
                "text-sm text-muted-foreground transition-colors hover:border-accent/40 hover:text-accent"
              )}
            >
              <Plus className="size-5" />
              Add Exercise
            </button>
          )}
        </div>
      </div>

      {/* ── Abort confirmation sheet ──────────────────────────── */}
      {abortSheetVisible && (
        <>
          {/* Backdrop */}
          <div
            className={cn(
              "fixed inset-0 z-40 cursor-pointer bg-black/70 backdrop-blur-sm transition-opacity duration-300",
              abortSheetAnimated && !abortSheetExiting ? "opacity-100" : "opacity-0"
            )}
            onClick={closeAbortSheet}
          />

          {/* Positioning wrapper */}
          <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center md:p-6 pointer-events-none">
            <div
              className={cn(
                "w-full md:max-w-sm pointer-events-auto",
                "bg-[#0f1117] border-t border-x md:border border-white/10",
                "rounded-t-3xl md:rounded-2xl px-5 pt-5",
                "transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
                abortSheetAnimated && !abortSheetExiting
                  ? "translate-y-0 md:opacity-100 md:scale-100"
                  : "max-md:translate-y-full md:opacity-0 md:scale-95"
              )}
              style={{ paddingBottom: "max(2rem, env(safe-area-inset-bottom))" }}
            >
              {/* Drag handle */}
              <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mb-5" />

              {/* Icon + message */}
              <div className="flex flex-col items-center gap-3 text-center mb-5">
                <div className="flex size-12 items-center justify-center rounded-2xl bg-accent/15">
                  <AlertTriangle className="size-5 text-accent" />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Abort workout</p>
                  <p className="text-base font-semibold text-foreground">
                    {workoutName ? `"${workoutName}"` : "This workout"}
                  </p>
                </div>
              </div>

              <p className="text-center text-sm text-muted-foreground mb-6">
                All progress —{" "}
                <span className="text-foreground font-medium">
                  {totalSets} {totalSets === 1 ? "set" : "sets"} across {workout.workout_exercises.length}{" "}
                  {workout.workout_exercises.length === 1 ? "exercise" : "exercises"}
                </span>{" "}
                — will be permanently lost.
              </p>

              {/* Actions */}
              <div className="flex flex-col gap-2.5">
                <button
                  onClick={confirmAbort}
                  disabled={isAborting}
                  className="w-full cursor-pointer rounded-2xl bg-accent py-4 text-sm font-semibold text-white shadow-lg shadow-accent/30 transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isAborting ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="size-4 animate-spin" />
                      Aborting…
                    </span>
                  ) : (
                    "Yes, abort workout"
                  )}
                </button>
                <button
                  onClick={closeAbortSheet}
                  disabled={isAborting}
                  className="w-full cursor-pointer rounded-2xl border border-white/10 bg-white/5 py-4 text-sm font-medium text-foreground transition-colors hover:bg-white/8 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Keep going
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
