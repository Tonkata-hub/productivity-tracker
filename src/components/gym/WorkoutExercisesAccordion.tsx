"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import type { WorkoutWithExercises } from "@/lib/types";
import { cn } from "@/lib/utils";

interface WorkoutExercisesAccordionProps {
  exercises: WorkoutWithExercises["workout_exercises"];
}

export function WorkoutExercisesAccordion({ exercises }: WorkoutExercisesAccordionProps) {
  const [expandedExercises, setExpandedExercises] = useState<Set<string>>(new Set());

  const toggleExercise = (id: string) => {
    setExpandedExercises((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (exercises.length === 0) return null;

  return (
    <div className="rounded-2xl border border-white/8 overflow-hidden divide-y divide-border mb-4">
      {exercises.map((we) => {
        const vol = we.sets.reduce((s, set) => s + set.reps * set.weight_kg, 0);
        const bestSet =
          we.sets.length > 0
            ? we.sets.reduce((best, s) => (s.reps * s.weight_kg > best.reps * best.weight_kg ? s : best), we.sets[0])
            : null;
        const isExpanded = expandedExercises.has(we.id);

        return (
          <div key={we.id}>
            <button
              onClick={() => toggleExercise(we.id)}
              className="group flex w-full cursor-pointer items-center justify-between px-4 py-3 text-left transition-colors hover:bg-white/3"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">{we.exercise.name}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {we.sets.length} {we.sets.length === 1 ? "set" : "sets"} · {Math.round(vol)} kg
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0 pl-3">
                {bestSet && (
                  <div className="text-right">
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Best set</p>
                    <p className="text-sm font-semibold text-foreground">
                      {bestSet.weight_kg} kg × {bestSet.reps}
                    </p>
                  </div>
                )}
                <ChevronRight
                  className={cn(
                    "size-4 text-muted-foreground/40 shrink-0 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
                    isExpanded && "rotate-90"
                  )}
                />
              </div>
            </button>

            <div
              className="grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
              style={{ gridTemplateRows: isExpanded ? "1fr" : "0fr" }}
            >
              <div className="overflow-hidden">
                <div className="border-t border-white/5">
                  {we.sets.map((set, i) => {
                    const isBest = bestSet?.id === set.id;
                    return (
                      <div
                        key={set.id}
                        className={cn(
                          "flex items-center gap-3 px-4 py-2.5 transition-all duration-200",
                          isBest ? "bg-accent/8 border-l-2 border-accent/50" : "border-l-2 border-transparent",
                          isExpanded ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-1"
                        )}
                        style={{ transitionDelay: isExpanded ? `${i * 40}ms` : "0ms" }}
                      >
                        <span className="flex size-5 items-center justify-center rounded-md bg-white/6 text-[10px] font-bold text-muted-foreground shrink-0">
                          {set.set_order}
                        </span>
                        <span className="flex-1 text-sm text-foreground">
                          <span className="font-semibold">{set.weight_kg}</span>
                          <span className="text-muted-foreground/60 text-xs"> kg</span>
                          <span className="text-muted-foreground/40 mx-1.5">×</span>
                          <span className="font-semibold">{set.reps}</span>
                        </span>
                        {isBest && (
                          <span className="text-[9px] font-bold uppercase tracking-widest text-accent shrink-0">
                            Best
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
