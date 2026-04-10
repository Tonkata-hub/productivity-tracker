"use client";

import { cn } from "@/lib/utils";
import type { TimeRange } from "./TimeRangePicker";

interface HeroSummaryProps {
  overallRate: number; // 0–1
  gymSessions: number;
  topHabit: { title: string; rate: number } | null;
  timeRange: TimeRange;
}

const RANGE_LABEL: Record<TimeRange, string> = {
  W: "this week",
  M: "this month",
  All: "all time",
};

export function HeroSummary({ overallRate, gymSessions, topHabit, timeRange }: HeroSummaryProps) {
  const pct = Math.round(overallRate * 100);
  const rateColor = pct >= 80 ? "text-accent" : pct >= 50 ? "text-yellow-400" : "text-muted-foreground";

  return (
    <div className="grid grid-cols-3 gap-3">
      <HeroChip
        label="Habit rate"
        sub={RANGE_LABEL[timeRange]}
        accent={pct >= 80}
      >
        <span className={cn("text-3xl font-bold tabular-nums stat-num", rateColor)}>{pct}%</span>
      </HeroChip>

      <HeroChip label="Gym sessions" sub={RANGE_LABEL[timeRange]}>
        <span className="text-3xl font-bold tabular-nums stat-num text-foreground">{gymSessions}</span>
      </HeroChip>

      <HeroChip label="Top habit" sub={topHabit ? `${Math.round(topHabit.rate * 100)}% rate` : "—"}>
        {topHabit ? (
          <span className="text-sm font-semibold text-foreground leading-tight line-clamp-2">{topHabit.title}</span>
        ) : (
          <span className="text-sm text-muted-foreground">No habits yet</span>
        )}
      </HeroChip>
    </div>
  );
}

function HeroChip({
  label,
  sub,
  accent,
  children,
}: {
  label: string;
  sub: string;
  accent?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("glass rounded-2xl p-4 flex flex-col gap-1.5", accent && "border-accent/25 glow-accent")}>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
      <div className="flex-1 flex items-center min-h-[2rem]">{children}</div>
      <p className="text-[10px] text-muted-foreground/60">{sub}</p>
    </div>
  );
}
