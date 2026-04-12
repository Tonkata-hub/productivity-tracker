"use client";

import { useRef, useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { PlannerBlock, Task, TaskWithStatus } from "@/lib/types";
import { formatPlannerTaskTitle, minutesToClockTimeStrPadded, minutesToTimeStr } from "@/lib/planner-utils";
import { TimeBlock } from "./TimeBlock";

export const START_MINUTES = 0;       // 00:00
export const END_SLOT_MINUTES = 1410; // 23:30 (last visible row; bottom-half click supports 23:45)
export const SLOT_HEIGHT = 40;        // px per 30-min row
export const SLOT_MINUTES = 30;
const DEFAULT_CLICK_STEP_MINUTES = 15;
const MIN_BLOCK_HEIGHT = 12;
const DAY_END_MINUTES = 24 * 60;

interface Props {
  blocks: PlannerBlock[];
  tasks: Task[];
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
  tasks,
  now,
  activeSlot,
  pendingTask,
  onSlotClick,
  onCancelPending,
  onCompleteBlock,
  onDeleteBlock,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const tasksById = new Map(tasks.map((task) => [task.id, task]));

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

  const latestBlockEndMinutes = blocks.reduce(
    (maxEnd, block) => Math.max(maxEnd, block.start_minutes + block.duration_minutes),
    DAY_END_MINUTES
  );
  const dynamicEndSlotStart = Math.max(
    END_SLOT_MINUTES,
    Math.floor((latestBlockEndMinutes - 1) / SLOT_MINUTES) * SLOT_MINUTES
  );
  const slotCount = (dynamicEndSlotStart - START_MINUTES) / SLOT_MINUTES + 1;
  const slots = Array.from({ length: slotCount }, (_, i) => START_MINUTES + i * SLOT_MINUTES);

  const isStartOccupied = (slotMin: number) =>
    blocks.some(
      (b) => slotMin >= b.start_minutes && slotMin < b.start_minutes + b.duration_minutes
    );

  const getRowSegments = (rowStart: number) => {
    const rowEnd = rowStart + SLOT_MINUTES;
    const breakpoints = new Set<number>([rowStart, rowEnd]);

    for (const block of blocks) {
      const blockStart = Math.max(rowStart, block.start_minutes);
      const blockEnd = Math.min(rowEnd, block.start_minutes + block.duration_minutes);
      if (blockStart < blockEnd) {
        breakpoints.add(blockStart);
        breakpoints.add(blockEnd);
      }
    }

    const points = Array.from(breakpoints).sort((a, b) => a - b);
    const segments: Array<{ start: number; end: number; occupied: boolean }> = [];

    for (let i = 0; i < points.length - 1; i += 1) {
      const start = points[i];
      const end = points[i + 1];
      if (end <= start) continue;
      segments.push({ start, end, occupied: isStartOccupied(start) });
    }

    return segments;
  };

  const splitSelectableSegment = (segment: { start: number; end: number; occupied: boolean }) => {
    if (segment.occupied) return [segment];

    const breakpoints = new Set<number>([segment.start, segment.end]);
    const firstBoundary = Math.ceil(segment.start / DEFAULT_CLICK_STEP_MINUTES) * DEFAULT_CLICK_STEP_MINUTES;

    for (let minute = firstBoundary; minute < segment.end; minute += DEFAULT_CLICK_STEP_MINUTES) {
      if (minute > segment.start) breakpoints.add(minute);
    }

    const points = Array.from(breakpoints).sort((a, b) => a - b);
    const parts: Array<{ start: number; end: number; occupied: boolean }> = [];

    for (let i = 0; i < points.length - 1; i += 1) {
      const start = points[i];
      const end = points[i + 1];
      if (end <= start) continue;
      parts.push({ start, end, occupied: false });
    }

    return parts;
  };

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
            className="shrink-0 flex cursor-pointer items-center justify-center size-5 rounded hover:bg-accent/20 text-accent/70 hover:text-accent transition-colors"
          >
            <X className="size-3" />
          </button>
        </div>
      )}

      <div className="flex">
        {/* Time labels column */}
        <div className="w-12 shrink-0 select-none pointer-events-none">
          {slots.map((slotMin) => (
            <div key={slotMin} className="flex items-start justify-end pr-2 pt-0.5" style={{ height: `${SLOT_HEIGHT}px` }}>
              {slotMin % 60 === 0 && (
                <span
                  className="text-xs font-medium tabular-nums leading-none"
                  style={{ color: "rgba(161,161,170,0.38)" }}
                >
                  {minutesToClockTimeStrPadded(slotMin)}
                </span>
              )}
            </div>
          ))}
          <div className="h-4" />
        </div>

        {/* Grid area */}
        <div className="flex-1 relative border-l border-white/[0.04]">
          {/* Slot rows */}
          {slots.map((slotMin) => {
            const isHour = slotMin % 60 === 0;
            const rowSegments = getRowSegments(slotMin);

            return (
              <div
                key={slotMin}
                className={cn(
                  "border-t transition-colors duration-100",
                  isHour ? "border-white/[0.06]" : "border-white/[0.025]"
                )}
                style={{ height: `${SLOT_HEIGHT}px` }}
              >
                {rowSegments.map((segment, index) => {
                  const parts = splitSelectableSegment(segment);

                  return parts.map((part, partIndex) => {
                    const partMinutes = part.end - part.start;
                    const partHeightPct = (partMinutes / SLOT_MINUTES) * 100;
                    const selectable = !part.occupied && part.start < DAY_END_MINUTES;
                    const isActive = activeSlot != null && activeSlot >= part.start && activeSlot < part.end;

                    return (
                      <div
                        key={`${slotMin}-${segment.start}-${segment.end}-${index}-${partIndex}`}
                        className={cn(
                          "w-full transition-colors duration-100",
                          !selectable && "cursor-default",
                          selectable && "cursor-pointer",
                          selectable && pendingTask && "hover:bg-accent/[0.06]",
                          selectable && !pendingTask && "hover:bg-white/[0.02]",
                          isActive && "bg-accent/[0.04]"
                        )}
                        style={{ height: `${partHeightPct}%` }}
                        onClick={() => {
                          if (!selectable) return;
                          onSlotClick(part.start);
                        }}
                      />
                    );
                  });
                })}
              </div>
            );
          })}

          {/* Bottom border spacer */}
          <div className="h-4 border-t border-white/[0.025]" />

          {/* Absolutely positioned time blocks */}
          {blocks.map((block) => {
            const top = ((block.start_minutes - START_MINUTES) / SLOT_MINUTES) * SLOT_HEIGHT;
            const height = Math.max(
              MIN_BLOCK_HEIGHT,
              (block.duration_minutes / SLOT_MINUTES) * SLOT_HEIGHT
            );
            const linkedTask = block.task_id ? tasksById.get(block.task_id) : undefined;
            const displayTitle = linkedTask
              ? formatPlannerTaskTitle(linkedTask.title, linkedTask.target_value, linkedTask.unit)
              : block.title;

            return (
              <div
                key={block.id}
                className="absolute z-10"
                style={{ top: `${top}px`, height: `${height}px`, left: "2px", right: "2px" }}
              >
                <TimeBlock
                  block={block}
                  displayTitle={displayTitle}
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
