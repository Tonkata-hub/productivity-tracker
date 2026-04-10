"use client";

import { CheckCircle2, Clock, AlertCircle } from "lucide-react";

export interface OneTimeStats {
  completed: number;
  pending: number;
  overdue: number;
  recentTitles: string[];
}

interface OneTimeTasksChartProps {
  stats: OneTimeStats;
}

export function OneTimeTasksChart({ stats }: OneTimeTasksChartProps) {
  const total = stats.completed + stats.pending + stats.overdue;

  if (total === 0) {
    return (
      <div className="glass rounded-2xl p-8 text-center">
        <p className="text-muted-foreground text-sm">No one-time tasks</p>
      </div>
    );
  }

  const completedPct = total > 0 ? (stats.completed / total) * 100 : 0;
  const overduePct = total > 0 ? (stats.overdue / total) * 100 : 0;
  const pendingPct = 100 - completedPct - overduePct;

  return (
    <div className="glass rounded-2xl p-4 space-y-4">
      {/* Summary row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-accent shrink-0" />
            <span className="text-xl font-bold text-accent tabular-nums stat-num">{stats.completed}</span>
          </div>
          <p className="text-[10px] text-muted-foreground">Completed</p>
        </div>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <span className="text-xl font-bold text-foreground tabular-nums stat-num">{stats.pending}</span>
          </div>
          <p className="text-[10px] text-muted-foreground">Pending</p>
        </div>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-yellow-500 shrink-0" />
            <span className="text-xl font-bold text-yellow-500 tabular-nums stat-num">{stats.overdue}</span>
          </div>
          <p className="text-[10px] text-muted-foreground">Overdue</p>
        </div>
      </div>

      {/* Segmented bar */}
      <div className="h-2 w-full rounded-full overflow-hidden flex">
        {completedPct > 0 && (
          <div
            className="h-full bg-accent transition-all duration-500"
            style={{ width: `${completedPct}%` }}
          />
        )}
        {overduePct > 0 && (
          <div
            className="h-full bg-yellow-500/60 transition-all duration-500"
            style={{ width: `${overduePct}%` }}
          />
        )}
        {pendingPct > 0 && (
          <div
            className="h-full bg-white/10 transition-all duration-500"
            style={{ width: `${pendingPct}%` }}
          />
        )}
      </div>

      {/* Recent completions */}
      {stats.recentTitles.length > 0 && (
        <div className="space-y-1.5 pt-1 border-t border-white/5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
            Recently completed
          </p>
          {stats.recentTitles.map((title, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-accent/60 shrink-0" />
              <p className="text-xs text-foreground/70 truncate">{title}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
