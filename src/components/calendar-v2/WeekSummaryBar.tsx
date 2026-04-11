"use client";

import { DayTasks } from "@/lib/types";
import { cn } from "@/lib/utils";

interface WeekSummaryBarProps {
  weekData: DayTasks[];
  selectedIndex: number;
  onSelectDay: (index: number) => void;
}

export function WeekSummaryBar({ weekData, selectedIndex, onSelectDay }: WeekSummaryBarProps) {
  return (
    <div className="hidden lg:grid lg:grid-cols-7 lg:gap-2">
      {weekData.map((day, index) => {
        const isSelected = selectedIndex === index;
        const totalCount = day.tasks.length;
        const completedCount = day.tasks.filter((t) => t.isCompleted).length;
        const fraction =
          totalCount > 0
            ? day.tasks.reduce((sum, t) => {
                if (t.target_value != null) return sum + Math.min(t.currentValue / t.target_value, 1);
                return sum + (t.isCompleted ? 1 : 0);
              }, 0) / totalCount
            : 0;

        return (
          <button
            key={day.date}
            onClick={() => onSelectDay(index)}
            className={cn(
              "flex cursor-pointer flex-col items-center gap-1 rounded-xl px-2 py-2 transition-all duration-200",
              isSelected ? "bg-white/8 ring-1 ring-white/10" : "hover:bg-white/4",
              day.isFuture && "opacity-35"
            )}
          >
            <span
              className={cn(
                "text-[10px] font-semibold uppercase tracking-wider",
                day.isToday ? "text-accent" : "text-muted-foreground"
              )}
            >
              {day.dayName}
            </span>

            {totalCount > 0 ? (
              <>
                <span className="text-xs font-medium tabular-nums text-foreground">
                  {completedCount}/{totalCount}
                </span>
                {/* Progress bar */}
                <div className="w-full h-[2px] rounded-full bg-white/10 overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      fraction >= 1 ? "bg-completed-green" : "bg-accent/50"
                    )}
                    style={{ width: `${fraction * 100}%` }}
                  />
                </div>
              </>
            ) : (
              <span className="text-[10px] text-muted-foreground/40">—</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
