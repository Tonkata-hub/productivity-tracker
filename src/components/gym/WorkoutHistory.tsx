"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/lib/supabase";
import type { Workout, WorkoutWithExercises } from "@/lib/types";
import { mockWorkoutsWithExercises } from "@/lib/mock-data";
import { formatDuration } from "@/lib/gym-utils";
import { WorkoutExercisesAccordion } from "./WorkoutExercisesAccordion";
import { Calendar, Clock, Dumbbell, TrendingUp, ChevronRight, X, Trash2, Loader2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface WorkoutHistoryProps {
  workouts: Workout[];
  onWorkoutDeleted: () => void;
  readOnly?: boolean;
}

export function WorkoutHistory({ workouts, onWorkoutDeleted, readOnly = false }: WorkoutHistoryProps) {
  const [sheetWorkout, setSheetWorkout] = useState<WorkoutWithExercises | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [sheetAnimated, setSheetAnimated] = useState(false);
  const [sheetExiting, setSheetExiting] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Enter animation — two RAF frames after sheet mounts
  useEffect(() => {
    if (!sheetVisible) return;
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setSheetAnimated(true)));
    return () => cancelAnimationFrame(id);
  }, [sheetVisible]);

  // Lock page scroll while the detail sheet is open.
  useEffect(() => {
    if (!sheetVisible) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [sheetVisible]);

  const openSheet = async (workoutId: string) => {
    setSheetAnimated(false);
    setConfirmDelete(false);
    setIsLoadingDetail(true);
    setSheetExiting(false);
    setSheetVisible(true);

    if (readOnly) {
      const detailedWorkout = mockWorkoutsWithExercises.find((workout) => workout.id === workoutId);
      if (detailedWorkout) {
        setSheetWorkout(detailedWorkout);
      } else {
        const selectedWorkout = workouts.find((workout) => workout.id === workoutId);
        if (selectedWorkout) {
          setSheetWorkout({ ...selectedWorkout, workout_exercises: [] });
        }
      }
      setIsLoadingDetail(false);
      return;
    }

    const { data } = await supabase
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
      .eq("id", workoutId)
      .single();

    if (data) {
      const workout = data as WorkoutWithExercises;
      workout.workout_exercises = workout.workout_exercises
        .sort((a, b) => a.exercise_order - b.exercise_order)
        .map((we) => ({ ...we, sets: we.sets.sort((a, b) => a.set_order - b.set_order) }));
      setSheetWorkout(workout);
    }
    setIsLoadingDetail(false);
  };

  const closeSheet = () => {
    setSheetExiting(true);
    setConfirmDelete(false);
    setTimeout(() => {
      setSheetVisible(false);
      setSheetExiting(false);
      setSheetWorkout(null);
    }, 300);
  };

  const deleteWorkout = async () => {
    if (!sheetWorkout) return;
    if (readOnly) return;
    setIsDeleting(true);

    const { error } = await supabase.from("workouts").delete().eq("id", sheetWorkout.id);

    setIsDeleting(false);
    if (error) {
      setConfirmDelete(false);
      return;
    }

    closeSheet();
    onWorkoutDeleted();
  };

  const groupByMonth = (ws: Workout[]) => {
    const groups: Record<string, Workout[]> = {};
    ws.forEach((w) => {
      const key = new Date(w.started_at).toLocaleDateString("en-US", { month: "long", year: "numeric" });
      if (!groups[key]) groups[key] = [];
      groups[key].push(w);
    });
    return groups;
  };

  const grouped = groupByMonth(workouts);

  if (workouts.length === 0) {
    return (
      <div className="mx-auto max-w-lg px-4 pt-6 calendar-animate-slide-in-up">
        <div className="glass rounded-2xl flex flex-col items-center justify-center gap-3 p-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center">
            <Calendar className="size-5 text-muted-foreground/40" />
          </div>
          <p className="text-sm text-muted-foreground">No workout history yet.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="mx-auto max-w-lg px-4 pt-4 space-y-5">
        {Object.entries(grouped).map(([monthYear, monthWorkouts], groupIdx) => (
          <div
            key={monthYear}
            className="calendar-animate-slide-in-up"
            style={{ animationDelay: `${groupIdx * 60}ms` }}
          >
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-2 px-1">
              {monthYear}
            </p>
            <div className="glass rounded-2xl overflow-hidden divide-y divide-border">
              {monthWorkouts.map((workout) => {
                const date = new Date(workout.started_at);
                const dateStr = date.toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                });
                return (
                  <button
                    key={workout.id}
                    onClick={() => openSheet(workout.id)}
                    className="group flex w-full cursor-pointer items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-white/3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground">{workout.name || dateStr}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {workout.name ? dateStr + " · " : ""}
                        {workout.total_sets} sets · {Math.round(workout.total_volume_kg)} kg
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-sm font-semibold text-accent">
                        {formatDuration(workout.duration_seconds)}
                      </span>
                      <ChevronRight className="size-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* ── Detail sheet ──────────────────────────────────────── */}
      {sheetVisible &&
        createPortal(
          <>
            {/* Backdrop */}
            <div
              className={cn(
                "fixed inset-0 z-60 cursor-pointer bg-black/70 backdrop-blur-sm transition-opacity duration-300",
                sheetAnimated && !sheetExiting ? "opacity-100" : "opacity-0"
              )}
              onClick={closeSheet}
            />

            {/* Positioning wrapper */}
            <div className="fixed inset-0 z-70 flex items-end md:items-center justify-center md:p-6 pointer-events-none">
              <div
                className={cn(
                  "w-full md:max-w-sm pointer-events-auto",
                  "bg-[#0f1117] border-t border-x md:border border-white/10",
                  "rounded-t-3xl md:rounded-2xl",
                  "transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
                  "flex flex-col",
                  sheetAnimated && !sheetExiting
                    ? "translate-y-0 md:opacity-100 md:scale-100"
                    : "max-md:translate-y-full md:opacity-0 md:scale-95"
                )}
                style={{
                  maxHeight: "85dvh",
                  paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))",
                }}
              >
                {/* Fixed sheet header */}
                <div className="px-5 pt-5 pb-4 shrink-0">
                  <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mb-4" />

                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Workout</p>
                      {sheetWorkout && (
                        <>
                          {sheetWorkout.name && (
                            <p className="text-base font-semibold text-foreground mt-0.5">{sheetWorkout.name}</p>
                          )}
                          <p
                            className={cn(
                              "text-foreground mt-0.5",
                              sheetWorkout.name ? "text-xs text-muted-foreground" : "text-base font-semibold"
                            )}
                          >
                            {new Date(sheetWorkout.started_at).toLocaleDateString("en-US", {
                              weekday: "long",
                              month: "long",
                              day: "numeric",
                            })}
                          </p>
                        </>
                      )}
                    </div>
                    <button
                      onClick={closeSheet}
                      className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                </div>

                {/* Scrollable content */}
                <div className="flex-1 overflow-y-auto px-5 min-h-0">
                  {isLoadingDetail && (
                    <div className="flex items-center justify-center gap-2 py-8">
                      <Loader2 className="size-4 animate-spin text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Loading…</span>
                    </div>
                  )}

                  {!isLoadingDetail && sheetWorkout && (
                    <>
                      {/* Stats row */}
                      <div className="flex gap-2 mb-4">
                        {[
                          {
                            icon: Clock,
                            label: formatDuration(sheetWorkout.duration_seconds),
                          },
                          { icon: Dumbbell, label: `${sheetWorkout.total_sets} sets` },
                          {
                            icon: TrendingUp,
                            label: `${Math.round(sheetWorkout.total_volume_kg)} kg`,
                          },
                        ].map(({ icon: Icon, label }) => (
                          <div
                            key={label}
                            className="flex flex-1 items-center justify-center gap-1.5 bg-white/5 rounded-xl px-3 py-2 text-center min-w-0"
                          >
                            <Icon className="size-3.5 text-muted-foreground shrink-0" />
                            <span className="text-xs font-medium text-foreground truncate">{label}</span>
                          </div>
                        ))}
                      </div>

                      <WorkoutExercisesAccordion exercises={sheetWorkout.workout_exercises} />
                    </>
                  )}
                </div>

                {/* Fixed sheet footer — delete */}
                {!readOnly && (
                  <div className="px-5 pt-4 shrink-0 border-t border-white/5 mt-2">
                    {confirmDelete ? (
                      <div className="space-y-2.5">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <AlertTriangle className="size-4 text-accent shrink-0" />
                          <span>This will permanently delete the workout and all its data.</span>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={deleteWorkout}
                            disabled={isDeleting}
                            className="flex-1 cursor-pointer rounded-2xl bg-accent py-3 text-sm font-semibold text-white shadow-lg shadow-accent/30 transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {isDeleting ? (
                              <span className="flex items-center justify-center gap-2">
                                <Loader2 className="size-4 animate-spin" />
                                Deleting…
                              </span>
                            ) : (
                              "Yes, delete"
                            )}
                          </button>
                          <button
                            onClick={() => setConfirmDelete(false)}
                            disabled={isDeleting}
                            className="flex-1 cursor-pointer rounded-2xl border border-white/10 bg-white/5 py-3 text-sm font-medium text-foreground transition-colors hover:bg-white/8 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDelete(true)}
                        disabled={isLoadingDetail}
                        className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border border-white/8 bg-white/3 py-3 text-sm font-medium text-muted-foreground transition-all hover:border-accent/25 hover:bg-accent/5 hover:text-accent disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        <Trash2 className="size-4" />
                        Delete workout
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </>,
          document.body
        )}
    </>
  );
}
