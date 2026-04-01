"use client";

import type { WorkoutWithExercises } from "@/lib/types";
import { formatDuration } from "@/lib/gym-utils";
import { Trophy, Clock, Dumbbell, TrendingUp, Check, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface WorkoutSummaryProps {
  workout: WorkoutWithExercises;
  duration: number;
  totalSets: number;
  totalVolume: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export function WorkoutSummary({
  workout,
  duration,
  totalSets,
  totalVolume,
  onConfirm,
  onCancel,
}: WorkoutSummaryProps) {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-lg px-4 pt-6 pb-10">
        {/* Back */}
        <button
          onClick={onCancel}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="size-4" />
          Back to workout
        </button>

        {/* Trophy */}
        <div className="flex flex-col items-center text-center mb-8 calendar-animate-slide-in-up">
          <div className="flex size-16 items-center justify-center rounded-2xl bg-accent/15 mb-4">
            <Trophy className="size-8 text-accent" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Workout complete!</h1>
          <p className="text-sm text-muted-foreground mt-1">Great job pushing through.</p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-3 mb-5 calendar-animate-slide-in-up" style={{ animationDelay: "60ms" }}>
          {[
            { icon: Clock, label: "Duration", value: formatDuration(duration) },
            { icon: Dumbbell, label: "Sets", value: totalSets.toString() },
            { icon: TrendingUp, label: "Volume", value: `${Math.round(totalVolume)} kg` },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="glass rounded-2xl p-4 text-center">
              <Icon className="size-4 text-accent mx-auto mb-2" />
              <p className="text-base font-bold text-foreground">{value}</p>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Exercise breakdown */}
        {workout.workout_exercises.length > 0 && (
          <div
            className="glass rounded-2xl overflow-hidden divide-y divide-border mb-6 calendar-animate-slide-in-up"
            style={{ animationDelay: "110ms" }}
          >
            <div className="px-4 py-3">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
                Exercise breakdown
              </p>
            </div>
            {workout.workout_exercises.map((we) => {
              const vol = we.sets.reduce((sum, s) => sum + s.reps * s.weight_kg, 0);
              return (
                <div key={we.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">{we.exercise.name}</p>
                    <p className="text-[11px] text-muted-foreground">{we.sets.length} sets</p>
                  </div>
                  <p className="text-sm font-semibold text-accent">{Math.round(vol)} kg</p>
                </div>
              );
            })}
          </div>
        )}

        {/* CTA */}
        <button
          onClick={onConfirm}
          className={cn(
            "w-full rounded-2xl px-6 py-4 text-sm font-semibold",
            "bg-accent text-white shadow-lg shadow-accent/30",
            "flex items-center justify-center gap-2",
            "transition-all active:scale-[0.98] hover:bg-accent/90",
            "calendar-animate-slide-in-up"
          )}
          style={{ animationDelay: "150ms" }}
        >
          <Check className="size-4" />
          Save Workout
        </button>
      </div>
    </div>
  );
}
