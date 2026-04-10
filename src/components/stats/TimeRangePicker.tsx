"use client";

import { cn } from "@/lib/utils";

export type TimeRange = "W" | "M" | "All";

const RANGES: { label: string; value: TimeRange }[] = [
  { label: "Week", value: "W" },
  { label: "Month", value: "M" },
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
            "cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold tracking-wide transition-all duration-150",
            value === rv
              ? "bg-accent text-white shadow-sm shadow-accent/40"
              : "text-muted-foreground hover:bg-white/6 hover:text-foreground"
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
