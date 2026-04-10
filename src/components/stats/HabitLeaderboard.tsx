"use client";

import { cn } from "@/lib/utils";

export interface HabitStat {
  id: string;
  title: string;
  rate: number;
  completedDays: number;
  totalDays: number;
}

interface HabitLeaderboardProps {
  best: HabitStat[];
  worst: HabitStat[];
}

export function HabitLeaderboard({ best, worst }: HabitLeaderboardProps) {
  if (best.length === 0 && worst.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {best.length > 0 && (
        <div className="glass rounded-2xl p-4 space-y-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Top habits
          </p>
          <div className="space-y-2.5">
            {best.map((h) => (
              <HabitBar key={h.id} habit={h} variant="best" />
            ))}
          </div>
        </div>
      )}

      {worst.length > 0 && (
        <div className="glass rounded-2xl p-4 space-y-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Needs work
          </p>
          <div className="space-y-2.5">
            {worst.map((h) => (
              <HabitBar key={h.id} habit={h} variant="worst" />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function HabitBar({ habit, variant }: { habit: HabitStat; variant: "best" | "worst" }) {
  const pct = Math.round(habit.rate * 100);
  const isBest = variant === "best";

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-foreground/80 truncate max-w-[75%]">{habit.title}</span>
        <span
          className={cn(
            "text-xs font-bold tabular-nums shrink-0",
            isBest ? "text-accent" : "text-muted-foreground/60"
          )}
        >
          {pct}%
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            isBest ? "bg-accent" : "bg-white/20"
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-[10px] text-muted-foreground/40">
        {habit.completedDays} / {habit.totalDays} days
      </p>
    </div>
  );
}
