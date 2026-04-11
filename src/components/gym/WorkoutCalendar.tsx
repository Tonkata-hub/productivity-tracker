"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/lib/supabase";
import type { Workout, WorkoutWithExercises } from "@/lib/types";
import { mockWorkoutsWithExercises } from "@/lib/mock-data";
import { WorkoutExercisesAccordion } from "./WorkoutExercisesAccordion";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Clock,
  Dumbbell,
  TrendingUp,
  X,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDuration } from "@/lib/gym-utils";

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface WorkoutCalendarProps {
  workouts?: Workout[];
  onWorkoutDeleted: () => void;
  readOnly?: boolean;
}

export function WorkoutCalendar({ workouts = [], onWorkoutDeleted, readOnly = false }: WorkoutCalendarProps) {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [monthWorkouts, setMonthWorkouts] = useState<Workout[]>([]);

  // Detail sheet
  const [sheetWorkout, setSheetWorkout] = useState<WorkoutWithExercises | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [sheetAnimated, setSheetAnimated] = useState(false);
  const [sheetExiting, setSheetExiting] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Fetch workouts for the displayed month
  useEffect(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const fetchMonth = async () => {
      // Show the month grid immediately; hydrate workout dots when data arrives.
      setMonthWorkouts([]);

      if (readOnly) {
        const monthFiltered = workouts.filter((workout) => {
          const workoutDate = new Date(workout.started_at);
          return workoutDate.getFullYear() === year && workoutDate.getMonth() === month;
        });
        setMonthWorkouts(monthFiltered);
        return;
      }

      const start = new Date(year, month, 1).toISOString();
      const end = new Date(year, month + 1, 0, 23, 59, 59).toISOString();
      const { data } = await supabase
        .from("workouts")
        .select("*")
        .not("ended_at", "is", null)
        .gte("started_at", start)
        .lte("started_at", end)
        .order("started_at", { ascending: true });
      setMonthWorkouts((data as Workout[]) ?? []);
    };
    fetchMonth();
  }, [currentDate, readOnly, workouts]);

  // Sheet enter animation
  useEffect(() => {
    if (!sheetVisible) return;
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setSheetAnimated(true)));
    return () => cancelAnimationFrame(id);
  }, [sheetVisible]);

  // ── Calendar calculations ──────────────────────────────────
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startOffset = (new Date(year, month, 1).getDay() + 6) % 7; // Mon = 0

  const today = new Date();
  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth();

  const isToday = (d: number) => isCurrentMonth && d === today.getDate();
  const isFuture = (d: number) => {
    const cellDate = new Date(year, month, d);
    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return cellDate > todayMidnight;
  };

  // Build map: day-of-month → Workout[]
  const workoutMap: Record<number, Workout[]> = {};
  monthWorkouts.forEach((w) => {
    const d = new Date(w.started_at).getDate();
    if (!workoutMap[d]) workoutMap[d] = [];
    workoutMap[d].push(w);
  });

  // Pad cells with leading nulls
  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  // ── Sheet logic ────────────────────────────────────────────
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
        const selectedWorkout = monthWorkouts.find((workout) => workout.id === workoutId);
        if (selectedWorkout) {
          setSheetWorkout({ ...selectedWorkout, workout_exercises: [] });
        }
      }
      setIsLoadingDetail(false);
      return;
    }

    const { data } = await supabase
      .from("workouts")
      .select(`*, workout_exercises (*, exercise:exercises (*), sets:exercise_sets (*))`)
      .eq("id", workoutId)
      .single();

    if (data) {
      const w = data as WorkoutWithExercises;
      w.workout_exercises = w.workout_exercises
        .sort((a, b) => a.exercise_order - b.exercise_order)
        .map((we) => ({ ...we, sets: we.sets.sort((a, b) => a.set_order - b.set_order) }));
      setSheetWorkout(w);
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
    setMonthWorkouts((prev) => prev.filter((w) => w.id !== sheetWorkout.id));
    closeSheet();
    onWorkoutDeleted();
  };

  const monthTotalVolume = monthWorkouts.reduce((sum, w) => sum + (w.total_volume_kg || 0), 0);

  return (
    <>
      <div className="mx-auto max-w-lg px-4 pt-2 pb-6 space-y-5">
        {/* ── Month navigation ──────────────────────────────── */}
        <div className="flex items-center justify-between px-1">
          <button
            onClick={() => setCurrentDate(new Date(year, month - 1))}
            className="flex size-10 cursor-pointer items-center justify-center rounded-2xl border border-white/6 bg-white/3 text-muted-foreground transition-all duration-150 hover:border-white/10 hover:bg-white/6 hover:text-foreground active:scale-95"
          >
            <ChevronLeft className="size-4" />
          </button>

          <div className="text-center select-none">
            <p className="text-base font-bold tracking-tight text-foreground leading-none">
              {currentDate.toLocaleDateString("en-US", { month: "long" })}
              <span className="text-muted-foreground/50 font-normal ml-2 text-sm">{year}</span>
            </p>
            {!isCurrentMonth && (
              <button
                onClick={() => setCurrentDate(new Date())}
                className="mt-1 cursor-pointer text-[10px] font-semibold uppercase tracking-widest text-accent/60 transition-colors hover:text-accent"
              >
                → today
              </button>
            )}
          </div>

          <button
            onClick={() => setCurrentDate(new Date(year, month + 1))}
            className="flex size-10 cursor-pointer items-center justify-center rounded-2xl border border-white/6 bg-white/3 text-muted-foreground transition-all duration-150 hover:border-white/10 hover:bg-white/6 hover:text-foreground active:scale-95"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>

        {/* ── Calendar card ─────────────────────────────────── */}
        <div className="glass rounded-2xl overflow-hidden">
          {/* Weekday header row */}
          <div className="grid grid-cols-7 border-b border-white/5 px-3 py-2.5">
            {WEEKDAY_LABELS.map((label) => (
              <div key={label} className="flex items-center justify-center">
                <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-white/20">{label}</span>
              </div>
            ))}
          </div>

          {/* Day grid (render immediately; workout markers hydrate after fetch) */}
          <div className="grid grid-cols-7 px-3 py-3">
            {cells.map((day, idx) => {
              if (day === null) {
                return <div key={`pad-${idx}`} className="h-12" />;
              }

              const workouts = workoutMap[day] ?? [];
              const hasW = workouts.length > 0;
              const todayDay = isToday(day);
              const futureDay = isFuture(day);

              return (
                <div key={day} className="flex flex-col items-center justify-center h-12">
                  <button
                    onClick={() => (hasW ? openSheet(workouts[0].id) : undefined)}
                    disabled={!hasW && !todayDay}
                    className={cn(
                      "relative flex size-9 select-none items-center justify-center rounded-full",
                      "text-[13px] font-semibold transition-all duration-150",
                      "cursor-pointer disabled:cursor-not-allowed",
                      todayDay && "border border-white/15 bg-white/6 text-foreground",
                      !todayDay && hasW && ["text-white/90 hover:bg-white/8 active:bg-white/12"],
                      !todayDay && !hasW && futureDay && "text-white/15",
                      !todayDay && !hasW && !futureDay && "text-white/30"
                    )}
                  >
                    {day}
                  </button>

                  {/* Trained dot — always reserve the space so grid rows stay uniform */}
                  <div
                    className={cn(
                      "mt-0.5 size-1 rounded-full transition-opacity duration-150",
                      hasW ? "bg-accent opacity-100" : "opacity-0 bg-transparent"
                    )}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Month stats ───────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3">
          <div className="glass rounded-2xl px-4 py-4">
            <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-white/25 mb-2">Sessions</p>
            <p className="text-2xl font-bold text-foreground leading-none">{monthWorkouts.length}</p>
            <p className="text-[11px] text-white/30 mt-1">this month</p>
          </div>
          <div className="glass rounded-2xl px-4 py-4">
            <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-white/25 mb-2">Volume</p>
            <p className="text-2xl font-bold text-foreground leading-none">
              {Math.round(monthTotalVolume).toLocaleString()}
            </p>
            <p className="text-[11px] text-white/30 mt-1">kilograms</p>
          </div>
        </div>
      </div>

      {/* ── Detail sheet ──────────────────────────────────────── */}
      {sheetVisible &&
        createPortal(
          <>
          {/* Backdrop */}
          <div
            className={cn(
              "fixed inset-0 z-40 cursor-pointer bg-black/75 backdrop-blur-sm transition-opacity duration-300",
              sheetAnimated && !sheetExiting ? "opacity-100" : "opacity-0"
            )}
            onClick={closeSheet}
          />

          {/* Sheet */}
          <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center md:p-6 pointer-events-none">
            <div
              className={cn(
                "w-full md:max-w-sm pointer-events-auto flex flex-col",
                "bg-[#0f1117] border-t border-x md:border border-white/10",
                "rounded-t-3xl md:rounded-2xl",
                "transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
                sheetAnimated && !sheetExiting
                  ? "translate-y-0 md:opacity-100 md:scale-100"
                  : "max-md:translate-y-full md:opacity-0 md:scale-95"
              )}
              style={{ maxHeight: "85dvh", paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
            >
              {/* Sheet header */}
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
                            "mt-0.5",
                            sheetWorkout.name
                              ? "text-xs text-muted-foreground"
                              : "text-base font-semibold text-foreground"
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

              {/* Scrollable body */}
              <div className="flex-1 overflow-y-auto px-5 min-h-0">
                {isLoadingDetail && (
                  <div className="flex items-center justify-center gap-2 py-8">
                    <Loader2 className="size-4 animate-spin text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Loading…</span>
                  </div>
                )}

                {!isLoadingDetail && sheetWorkout && (
                  <>
                    <div className="flex gap-2 mb-4">
                      {[
                        { icon: Clock, label: formatDuration(sheetWorkout.duration_seconds) },
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

              {/* Footer — delete */}
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
                          className="flex-1 cursor-pointer rounded-2xl border border-white/10 bg-white/5 py-3 text-sm font-medium text-foreground transition-colors disabled:cursor-not-allowed disabled:opacity-50"
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
