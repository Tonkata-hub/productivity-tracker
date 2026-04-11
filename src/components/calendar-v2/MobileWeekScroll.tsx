"use client";

import { forwardRef } from "react";
import { DayTasks } from "@/lib/types";
import { DayPanel } from "./DayPanel";

interface MobileWeekScrollProps {
  weekData: DayTasks[];
  highlightedDate: string | null;
  onScroll: () => void;
  onToggleTask: (taskId: string, date: string) => void;
  onLogQuantitative: (taskId: string, date: string, amount: number) => void;
}

export const MobileWeekScroll = forwardRef<HTMLDivElement, MobileWeekScrollProps>(
  function MobileWeekScroll(
    { weekData, highlightedDate, onScroll, onToggleTask, onLogQuantitative },
    ref
  ) {
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
              />
            </div>
          ))}
        </div>
      </div>
    );
  }
);
