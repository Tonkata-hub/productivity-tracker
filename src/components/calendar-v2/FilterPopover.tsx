"use client";

import { Popover } from "radix-ui";
import { SlidersHorizontal, X } from "lucide-react";
import { cn } from "@/lib/utils";

const FILTER_OPTIONS = [
  { value: "all", label: "All Tasks" },
  { value: "daily", label: "Daily Only" },
  { value: "one_time", label: "One-Time Only" },
  { value: "tracked", label: "Tracked Only" },
  { value: "completed", label: "Completed" },
  { value: "incomplete", label: "Incomplete" },
  { value: "overdue", label: "Overdue" },
];

interface FilterPopoverProps {
  activeFilter: string;
  onFilterChange: (filter: string) => void;
}

export function FilterPopover({ activeFilter, onFilterChange }: FilterPopoverProps) {
  const isFiltering = activeFilter !== "all";

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          className={cn(
            "relative flex size-10 items-center justify-center rounded-xl transition-all duration-200",
            "bg-white/5 text-foreground hover:bg-white/10 active:scale-95",
            isFiltering && "text-accent"
          )}
          aria-label="Filter tasks"
        >
          <SlidersHorizontal className="size-4" />
          {isFiltering && (
            <span className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-accent shadow-sm shadow-accent/40" />
          )}
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={8}
          className={cn(
            "z-50 w-52 rounded-xl border border-white/10 p-1.5",
            "bg-[#0f1117]/95 backdrop-blur-xl backdrop-saturate-150",
            "shadow-xl shadow-black/40",
            "animate-in fade-in-0 zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2",
            "duration-200"
          )}
        >
          <div className="px-2 pt-1.5 pb-2">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Filter tasks
            </p>
          </div>

          <div className="space-y-0.5">
            {FILTER_OPTIONS.map((option) => {
              const isActive = activeFilter === option.value;
              return (
                <Popover.Close asChild key={option.value}>
                  <button
                    onClick={() => onFilterChange(option.value)}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium transition-all duration-150",
                      isActive
                        ? "bg-accent/15 text-accent"
                        : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                    )}
                  >
                    <span
                      className={cn(
                        "size-1.5 shrink-0 rounded-full transition-colors",
                        isActive ? "bg-accent" : "bg-white/15"
                      )}
                    />
                    {option.label}
                  </button>
                </Popover.Close>
              );
            })}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

export function ActiveFilterBadge({
  filter,
  onClear,
}: {
  filter: string;
  onClear: () => void;
}) {
  if (filter === "all") return null;

  const label = FILTER_OPTIONS.find((o) => o.value === filter)?.label ?? filter;

  return (
    <div className="flex items-center gap-1.5 rounded-lg bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent">
      <span>{label}</span>
      <button
        onClick={onClear}
        className="rounded-md p-0.5 transition-colors hover:bg-accent/20"
        aria-label="Clear filter"
      >
        <X className="size-3" />
      </button>
    </div>
  );
}
