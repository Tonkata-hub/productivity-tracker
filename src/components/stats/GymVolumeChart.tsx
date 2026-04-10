"use client";

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export interface GymVolumePoint {
  label: string;
  volume: number;
  sets: number;
}

interface GymVolumeChartProps {
  data: GymVolumePoint[];
}

interface TooltipEntry {
  value?: number;
  name?: string;
}
interface ChartTooltipProps {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string;
}

function GlassTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass rounded-xl px-3 py-2 text-xs shadow-lg space-y-1">
      <p className="text-muted-foreground">{label}</p>
      <p className="text-accent font-semibold tabular-nums">{payload[0]?.value?.toLocaleString()} kg</p>
      {payload[1] && <p className="text-muted-foreground tabular-nums">{payload[1]?.value} sets</p>}
    </div>
  );
}

export function GymVolumeChart({ data }: GymVolumeChartProps) {
  if (data.length === 0) {
    return (
      <div className="glass rounded-2xl p-8 text-center">
        <p className="text-muted-foreground text-sm">No workouts logged yet</p>
      </div>
    );
  }

  const totalVolume = data.reduce((sum, d) => sum + d.volume, 0);
  const tickInterval = data.length <= 10 ? 0 : data.length <= 20 ? 2 : Math.floor(data.length / 7);

  return (
    <div className="glass rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Total volume</p>
          <p className="text-2xl font-bold text-foreground tabular-nums stat-num">
            {totalVolume >= 1000 ? `${(totalVolume / 1000).toFixed(1)}t` : `${totalVolume.toLocaleString()}kg`}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-muted-foreground">sessions</p>
          <p className="text-lg font-bold text-muted-foreground tabular-nums">{data.length}</p>
        </div>
      </div>

      <div style={{ height: 160 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
            <defs>
              <linearGradient id="volumeGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ff3b3b" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#ff3b3b" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: "#a1a1aa", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              interval={tickInterval}
            />
            <YAxis
              tick={{ fill: "#a1a1aa", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              width={40}
              tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v))}
            />
            <Tooltip content={<GlassTooltip />} cursor={{ stroke: "rgba(255,255,255,0.08)" }} />
            <Area
              type="monotone"
              dataKey="volume"
              stroke="#ff3b3b"
              strokeWidth={2}
              fill="url(#volumeGrad)"
              dot={{ fill: "#ff3b3b", r: 3, strokeWidth: 0 }}
              activeDot={{ r: 5, fill: "#ff3b3b", strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
