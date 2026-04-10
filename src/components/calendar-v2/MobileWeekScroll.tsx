"use client";

import { forwardRef } from "react";
import { DayTasks } from "@/lib/types";
import { DayPanel } from "./DayPanel";
import { cn } from "@/lib/utils";
import { CalendarDays } from "lucide-react";

interface MobileWeekScrollProps {
  weekData: DayTasks[];
  currentDayIndex: number;
  todayIndex: number;
  highlightedDate: string | null;
  onScroll: () => void;
  onToggleTask: (taskId: string, date: string) => void;
  onLogQuantitative: (taskId: string, date: string, amount: number) => void;
  onScrollToToday: () => void;
}

export const MobileWeekScroll = forwardRef<HTMLDivElement, MobileWeekScrollProps>(
  function MobileWeekScroll(
    { weekData, currentDayIndex, todayIndex, highlightedDate, onScroll, onToggleTask, onLogQuantitative, onScrollToToday },
    ref
  ) {
    const showTodayBtn = currentDayIndex !== todayIndex && weekData.some((d) => d.isToday);

    return (
      <div className="sm:hidden relative">
        {/* Snap-scroll container */}
        <div
          ref={ref}
          onScroll={onScroll}
          className="flex snap-x snap-mandatory gap-4 overflow-x-auto scrollbar-none"
        >
          {weekData.map((dayData) => (
            <div key={dayData.date} className="w-full shrink-0 snap-center px-1 py-1">
              <DayPanel
                dayData={dayData}
                onToggleTask={onToggleTask}
                onLogQuantitative={onLogQuantitative}
                isHighlighted={highlightedDate === dayData.date}
                className="h-[58svh] min-h-[400px] max-h-[560px]"
              />
            </div>
          ))}
        </div>

        {/* Page dots */}
        <div className="flex justify-center gap-1.5 mt-3">
          {weekData.map((day, i) => (
            <div
              key={day.date}
              className={cn(
                "rounded-full transition-all duration-200",
                i === currentDayIndex
                  ? "w-5 h-1.5 bg-accent"
                  : "w-1.5 h-1.5 bg-white/15"
              )}
            />
          ))}
        </div>

        {/* "Today" floating button */}
        {showTodayBtn && (
          <button
            onClick={onScrollToToday}
            className={cn(
              "absolute bottom-10 left-1/2 -translate-x-1/2 z-10",
              "flex items-center gap-1.5 rounded-full px-3.5 py-2",
              "bg-accent/90 text-white text-xs font-semibold",
              "shadow-lg shadow-accent/30 backdrop-blur-sm",
              "transition-all active:scale-95",
              "calendar-animate-slide-in-up"
            )}
          >
            <CalendarDays className="size-3.5" />
            Today
          </button>
        )}
      </div>
    );
  }
);
