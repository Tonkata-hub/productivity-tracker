"use client";

import { Check, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { PlannerBlock } from "@/lib/types";
import { minutesToTimeStr } from "@/lib/planner-utils";

interface Props {
  block: PlannerBlock;
  onComplete: () => void;
  onDelete: () => void;
}

export function TimeBlock({ block, onComplete, onDelete }: Props) {
  const endMinutes = block.start_minutes + block.duration_minutes;
  const timeRange = `${minutesToTimeStr(block.start_minutes)} - ${minutesToTimeStr(endMinutes)}`;
  const isTaskLinked = block.task_id != null;
  const isShort = block.duration_minutes <= 30;

  return (
    <div
      className={cn(
        "h-full w-full rounded-lg glass overflow-hidden border-l-2 flex",
        isShort ? "items-center px-2 py-1 gap-1" : "items-start px-2 py-1.5",
        isTaskLinked ? "border-accent" : "border-white/20",
        block.is_completed && "opacity-50"
      )}
    >
      <div
        className={cn(
          "flex flex-1 min-h-0 min-w-0",
          isShort ? "items-center justify-between gap-1" : "items-start justify-between gap-1"
        )}
      >
        <div className={cn("min-w-0 overflow-hidden", isShort ? "flex-1" : "flex-1 flex flex-col justify-center")}>
          {isShort ? (
            <div className="flex items-center gap-1.5 min-w-0">
              <p
                className={cn(
                  "text-sm font-medium text-foreground truncate",
                  block.is_completed && "line-through text-muted-foreground"
                )}
              >
                {block.title}
              </p>
              <span
                className="inline-flex shrink-0 items-center rounded-md border border-white/15 bg-white/8 px-1.5 py-0.5 text-xs font-semibold tabular-nums text-foreground/90"
                style={{ letterSpacing: "0.01em" }}
              >
                {timeRange}
              </span>
            </div>
          ) : (
            <p
              className={cn(
                "text-sm font-medium text-foreground leading-snug",
                block.is_completed && "line-through text-muted-foreground"
              )}
              style={{
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {block.title}
            </p>
          )}
          {!isShort && (
            <div className="mt-1 shrink-0">
              <span
                className="inline-flex items-center rounded-md border border-white/15 bg-white/8 px-1.5 py-0.5 text-xs font-semibold tabular-nums text-foreground/90"
                style={{ letterSpacing: "0.01em" }}
              >
                {timeRange}
              </span>
            </div>
          )}
        </div>

        <div className={cn("flex shrink-0", isShort ? "items-center gap-1" : "flex-col gap-1")}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onComplete();
            }}
            className={cn(
              "flex cursor-pointer items-center justify-center size-7 rounded-md text-muted-foreground/80 transition-colors",
              block.is_completed ? "text-completed-green hover:text-completed-green/80" : "hover:text-completed-green"
            )}
            title={block.is_completed ? "Mark incomplete" : "Mark complete"}
          >
            <Check className="size-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="flex cursor-pointer items-center justify-center size-7 rounded-md text-muted-foreground/80 hover:text-red-400 transition-colors"
            title="Delete block"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
