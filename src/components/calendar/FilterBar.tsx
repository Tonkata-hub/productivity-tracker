import { filterOptions } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { Filter } from "lucide-react";

interface FilterBarProps {
  activeFilter: string;
  onFilterChange: (filter: string) => void;
}

export function FilterBar({ activeFilter, onFilterChange }: FilterBarProps) {
  return (
    <div className="flex items-center gap-3 overflow-x-auto scrollbar-none">
      <Filter className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <div className="flex items-center gap-1.5" role="group" aria-label="Task filters">
        {filterOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => onFilterChange(option.value)}
            className={cn(
              "relative whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-200",
              "active:scale-95",
              activeFilter === option.value
                ? "bg-mars-red text-white shadow-lg shadow-mars-red/25"
                : "bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-foreground"
            )}
            aria-pressed={activeFilter === option.value}
          >
            {option.label}
            {activeFilter === option.value && (
              <span className="absolute inset-0 rounded-lg ring-2 ring-mars-red/30 ring-offset-1 ring-offset-transparent" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
