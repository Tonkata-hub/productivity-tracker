"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

export interface GymFreqPoint {
  week: string;
  sessions: number;
}

interface GymFrequencyChartProps {
  data: GymFreqPoint[];
}

interface TooltipEntry {
  value?: number;
}
interface ChartTooltipProps {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string;
}

function GlassTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  const sessions = payload[0]?.value ?? 0;
  return (
    <div className="glass rounded-xl px-3 py-2 text-xs shadow-lg">
      <p className="text-muted-foreground mb-1">Week of {label}</p>
      <p className="text-accent font-semibold tabular-nums">
        {sessions} session{sessions !== 1 ? "s" : ""}
      </p>
    </div>
  );
}

export function GymFrequencyChart({ data }: GymFrequencyChartProps) {
  if (data.length === 0) return null;

  const maxSessions = Math.max(...data.map((d) => d.sessions));

  return (
    <div className="glass rounded-2xl p-4 space-y-3">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Sessions per week</p>

      <div className="w-full min-w-0" style={{ height: 140 }}>
        <ResponsiveContainer
          width="100%"
          height="100%"
          minWidth={0}
          minHeight={140}
          aspect={undefined}
          initialDimension={{ width: 700, height: 140 }}
        >
          <BarChart data={data} margin={{ top: 4, right: 12, bottom: 0, left: 8 }} barCategoryGap="30%">
            <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="week"
              tick={{ fill: "#a1a1aa", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              tickMargin={8}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fill: "#a1a1aa", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              width={32}
              tickMargin={8}
            />
            <Tooltip content={<GlassTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
            <Bar dataKey="sessions" radius={[4, 4, 0, 0]}>
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.sessions === maxSessions ? "#ff3b3b" : "rgba(255,59,59,0.35)"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
