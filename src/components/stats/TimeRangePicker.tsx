"use client";

import { cn } from "@/lib/utils";

export type TimeRange = "W" | "M" | "30d" | "All";

const RANGES: { label: string; value: TimeRange }[] = [
  { label: "Week", value: "W" },
  { label: "This month", value: "M" },
  { label: "30 days", value: "30d" },
  { label: "All time", value: "All" },
];

interface TimeRangePickerProps {
  value: TimeRange;
  onChange: (range: TimeRange) => void;
}

export function TimeRangePicker({ value, onChange }: TimeRangePickerProps) {
  return (
    <div className="flex gap-1.5 p-1 glass rounded-xl">
      {RANGES.map(({ label, value: rv }) => (
        <button
          key={rv}
          onClick={() => onChange(rv)}
          className={cn(
            "px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all duration-150",
            value === rv
              ? "bg-accent text-white shadow-sm shadow-accent/40"
              : "text-muted-foreground hover:text-foreground hover:bg-white/6"
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
