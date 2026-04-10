"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from "recharts";
import type { Task } from "@/lib/types";

export interface TrackedDataPoint {
  date: string;
  label: string;
  value: number | null;
}

interface TrackedGoalChartProps {
  task: Task;
  points: TrackedDataPoint[];
}

interface TooltipEntry {
  value?: number;
  name?: string;
  color?: string;
}
interface ChartTooltipProps {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string;
}

function GlassTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  const val = payload[0]?.value;
  return (
    <div className="glass rounded-xl px-3 py-2 text-xs shadow-lg">
      <p className="text-muted-foreground mb-1">{label}</p>
      <p className="text-accent font-semibold tabular-nums">
        {val != null ? val : "—"} {payload[0]?.name}
      </p>
    </div>
  );
}

export function TrackedGoalChart({ task, points }: TrackedGoalChartProps) {
  const hasData = points.some((p) => p.value != null);
  const maxVal = Math.max(task.target_value ?? 0, ...points.map((p) => p.value ?? 0));
  const hitCount = points.filter(
    (p) => p.value != null && task.target_value != null && p.value >= task.target_value
  ).length;
  const loggedCount = points.filter((p) => p.value != null).length;
  const hitRate = loggedCount > 0 ? Math.round((hitCount / loggedCount) * 100) : 0;

  // For the chart, show every Nth label to avoid crowding
  const totalPoints = points.length;
  const tickInterval = totalPoints <= 14 ? 0 : totalPoints <= 30 ? 3 : Math.floor(totalPoints / 8);

  return (
    <div className="glass rounded-2xl p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">{task.title}</h3>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Target: {task.target_value} {task.unit}
          </p>
        </div>
        {loggedCount > 0 && (
          <div className="text-right">
            <p className="text-sm font-bold text-accent tabular-nums">{hitRate}%</p>
            <p className="text-[10px] text-muted-foreground">hit rate</p>
          </div>
        )}
      </div>

      {!hasData ? (
        <div className="h-[140px] flex items-center justify-center">
          <p className="text-muted-foreground text-xs">No data logged yet</p>
        </div>
      ) : (
        <div style={{ height: 160 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={points} margin={{ top: 4, right: 24, bottom: 0, left: 8 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: "#a1a1aa", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                interval={tickInterval}
                tickMargin={8}
              />
              <YAxis
                domain={[0, Math.ceil(maxVal * 1.1)]}
                tick={{ fill: "#a1a1aa", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                width={52}
                tickMargin={8}
                tickFormatter={(v: number) => v.toLocaleString()}
              />
              <Tooltip content={<GlassTooltip />} cursor={{ stroke: "rgba(255,255,255,0.08)" }} />
              {task.target_value != null && (
                <ReferenceLine
                  y={task.target_value}
                  stroke="rgba(255,59,59,0.4)"
                  strokeDasharray="6 3"
                  label={{ value: `Goal`, position: "insideTopRight", fill: "rgba(255,59,59,0.6)", fontSize: 10 }}
                />
              )}
              <Line
                type="monotone"
                dataKey="value"
                name={task.unit ?? "value"}
                stroke="#ff3b3b"
                strokeWidth={2}
                dot={{ fill: "#ff3b3b", r: 3, strokeWidth: 0 }}
                activeDot={{ r: 5, fill: "#ff3b3b", strokeWidth: 0 }}
                connectNulls={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
