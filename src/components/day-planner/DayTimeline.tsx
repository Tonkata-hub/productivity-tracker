"use client";

import { useRef, useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { PlannerBlock, TaskWithStatus } from "@/lib/types";
import { TimeBlock } from "./TimeBlock";

export const START_MINUTES = 0;       // 00:00
export const END_SLOT_MINUTES = 1410; // 23:30 (last slot; ends 24:00)
export const SLOT_HEIGHT = 40;        // px per 30-min slot
export const SLOT_MINUTES = 30;
const TOTAL_SLOTS = (END_SLOT_MINUTES - START_MINUTES) / SLOT_MINUTES + 1; // 36

function minutesToTimeStr(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}:${String(m).padStart(2, "0")}`;
}

interface Props {
  blocks: PlannerBlock[];
  now: Date;
  activeSlot: number | null;
  pendingTask: TaskWithStatus | null;
  onSlotClick: (startMinutes: number) => void;
  onCancelPending: () => void;
  onCompleteBlock: (blockId: string) => void;
  onDeleteBlock: (blockId: string) => void;
}

export function DayTimeline({
  blocks,
  now,
  activeSlot,
  pendingTask,
  onSlotClick,
  onCancelPending,
  onCompleteBlock,
  onDeleteBlock,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const nowTopPx = ((nowMinutes - START_MINUTES) / SLOT_MINUTES) * SLOT_HEIGHT;
  const nowInRange = nowMinutes >= START_MINUTES && nowMinutes <= END_SLOT_MINUTES + SLOT_MINUTES;

  // Scroll to show current time ~1/3 from top on mount
  useEffect(() => {
    if (scrollRef.current && nowInRange) {
      const scrollTarget = nowTopPx - scrollRef.current.clientHeight / 3;
      scrollRef.current.scrollTop = Math.max(0, scrollTarget);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const slots = Array.from({ length: TOTAL_SLOTS }, (_, i) => START_MINUTES + i * SLOT_MINUTES);

  const isSlotOccupied = (slotMin: number) =>
    blocks.some(
      (b) => slotMin >= b.start_minutes && slotMin < b.start_minutes + b.duration_minutes
    );

  return (
    <div
      ref={scrollRef}
      className="scrollbar-subtle h-full overflow-y-auto pr-3"
      style={{ scrollbarGutter: "stable" }}
    >
      {/* Pending task hint banner */}
      {pendingTask && (
        <div className="sticky top-0 z-30 flex items-center justify-between gap-2 px-3 py-2 border-b border-accent/20 bg-accent/10 backdrop-blur-sm">
          <p className="text-sm text-accent font-medium truncate">
            Tap a slot to schedule{" "}
            <span className="font-semibold">&quot;{pendingTask.title}&quot;</span>
          </p>
          <button
            onClick={onCancelPending}
            className="shrink-0 flex items-center justify-center size-5 rounded hover:bg-accent/20 text-accent/70 hover:text-accent transition-colors"
          >
            <X className="size-3" />
          </button>
        </div>
      )}

      <div className="flex">
        {/* Time labels column */}
        <div className="w-12 shrink-0 select-none pointer-events-none">
          {slots.map((slotMin) => (
            <div key={slotMin} className="h-10 flex items-start justify-end pr-2 pt-0.5">
              {slotMin % 60 === 0 && (
                <span
                  className="text-xs font-medium tabular-nums leading-none"
                  style={{ color: "rgba(161,161,170,0.38)" }}
                >
                  {minutesToTimeStr(slotMin)}
                </span>
              )}
            </div>
          ))}
          <div className="h-4 flex items-end justify-end pr-2 pb-0.5">
            <span
              className="text-xs font-medium tabular-nums leading-none"
              style={{ color: "rgba(161,161,170,0.38)" }}
            >
              24:00
            </span>
          </div>
        </div>

        {/* Grid area */}
        <div className="flex-1 relative border-l border-white/[0.04]">
          {/* Slot rows */}
          {slots.map((slotMin) => {
            const occupied = isSlotOccupied(slotMin);
            const isHour = slotMin % 60 === 0;
            const isActive = activeSlot === slotMin;

            return (
              <div
                key={slotMin}
                className={cn(
                  "h-10 border-t transition-colors duration-100",
                  isHour ? "border-white/[0.06]" : "border-white/[0.025]",
                  !occupied && pendingTask && "hover:bg-accent/[0.06] cursor-crosshair",
                  !occupied && !pendingTask && "hover:bg-white/[0.02] cursor-pointer",
                  occupied && "cursor-default",
                  isActive && "bg-accent/[0.04]"
                )}
                onClick={() => !occupied && onSlotClick(slotMin)}
              />
            );
          })}

          {/* Bottom border spacer */}
          <div className="h-4 border-t border-white/[0.025]" />

          {/* Absolutely positioned time blocks */}
          {blocks.map((block) => {
            const top = ((block.start_minutes - START_MINUTES) / SLOT_MINUTES) * SLOT_HEIGHT;
            const height = Math.max(
              SLOT_HEIGHT,
              (block.duration_minutes / SLOT_MINUTES) * SLOT_HEIGHT
            );

            return (
              <div
                key={block.id}
                className="absolute z-10"
                style={{ top: `${top}px`, height: `${height}px`, left: "2px", right: "2px" }}
              >
                <TimeBlock
                  block={block}
                  onComplete={() => onCompleteBlock(block.id)}
                  onDelete={() => onDeleteBlock(block.id)}
                />
              </div>
            );
          })}

          {/* Now indicator */}
          {nowInRange && (
            <div
              className="absolute left-0 right-0 z-20 pointer-events-none flex items-center"
              style={{ top: `${nowTopPx}px` }}
            >
              <div
                className="w-2 h-2 rounded-full bg-accent shrink-0"
                style={{
                  boxShadow:
                    "0 0 0 2px rgba(255,59,59,0.2), 0 0 10px rgba(255,59,59,0.7)",
                }}
              />
              <div
                className="h-px flex-1 bg-accent/60"
                style={{ boxShadow: "0 0 6px rgba(255,59,59,0.25)" }}
              />
              <span
                className="text-xs font-bold tracking-wide tabular-nums px-1.5 mr-1"
                style={{
                  color: "#ff3b3b",
                  textShadow: "0 0 8px rgba(255,59,59,0.5)",
                }}
              >
                {minutesToTimeStr(nowMinutes)}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
