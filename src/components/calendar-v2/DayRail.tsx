"use client";

import { DayTasks } from "@/lib/types";
import { cn } from "@/lib/utils";

const RING_R = 8;
const RING_C = 2 * Math.PI * RING_R;
const DAY_ABBR = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

interface DayRailProps {
  weekData: DayTasks[];
  selectedIndex: number;
  onSelectDay: (index: number) => void;
}

export function DayRail({ weekData, selectedIndex, onSelectDay }: DayRailProps) {
  return (
    <div className="hidden lg:flex lg:flex-col lg:gap-1 lg:w-16 lg:shrink-0">
      {weekData.map((day, index) => {
        const isSelected = selectedIndex === index;
        const fraction = day.tasks.length > 0
          ? day.tasks.reduce((sum, t) => {
              if (t.target_value != null) return sum + Math.min(t.currentValue / t.target_value, 1);
              return sum + (t.isCompleted ? 1 : 0);
            }, 0) / day.tasks.length
          : 0;
        const dash = fraction * RING_C;

        return (
          <button
            key={day.date}
            onClick={() => onSelectDay(index)}
            className={cn(
              "relative flex flex-col items-center gap-0.5 rounded-xl py-2 px-1 transition-all duration-200",
              isSelected
                ? "bg-white/[0.08] before:absolute before:left-0 before:top-2 before:bottom-2 before:w-[3px] before:rounded-full before:bg-accent"
                : "hover:bg-white/[0.04]",
              day.isFuture && "opacity-35"
            )}
            aria-label={`${day.dayName}, ${day.dayNumber}`}
          >
            {/* Completion ring */}
            <svg viewBox="0 0 24 24" className="size-6 -rotate-90">
              <circle
                cx="12" cy="12" r={RING_R}
                fill="none"
                stroke={day.isToday ? "rgba(255,59,59,0.2)" : "rgba(255,255,255,0.06)"}
                strokeWidth="2.5"
              />
              {fraction > 0 && (
                <circle
                  cx="12" cy="12" r={RING_R}
                  fill="none"
                  stroke={fraction >= 1 ? "#34d399" : "rgba(255,59,59,0.45)"}
                  strokeWidth="2.5"
                  strokeDasharray={`${dash} ${RING_C}`}
                  strokeLinecap="round"
                />
              )}
            </svg>

            {/* Day abbreviation */}
            <span
              className={cn(
                "text-[10px] font-semibold uppercase leading-none tracking-wide",
                day.isToday ? "text-accent" : isSelected ? "text-foreground" : "text-muted-foreground"
              )}
            >
              {DAY_ABBR[index]}
            </span>

            {/* Date number */}
            <span
              className={cn(
                "text-xs font-medium leading-none tabular-nums",
                day.isToday ? "text-accent font-bold" : "text-muted-foreground"
              )}
            >
              {day.dayNumber}
            </span>
          </button>
        );
      })}
    </div>
  );
}
