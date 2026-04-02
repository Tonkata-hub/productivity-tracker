import { filterOptions } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

interface FilterBarProps {
  activeFilter: string;
  onFilterChange: (filter: string) => void;
}

export function FilterBar({ activeFilter, onFilterChange }: FilterBarProps) {
  return (
    <div
      className="flex gap-1 overflow-x-auto scrollbar-none rounded-full bg-white/5 p-1"
      role="group"
      aria-label="Task filters"
    >
      {filterOptions.map((option) => (
        <button
          key={option.value}
          onClick={() => onFilterChange(option.value)}
          className={cn(
            "shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-all duration-200 whitespace-nowrap",
            "active:scale-95",
            activeFilter === option.value
              ? "bg-mars-red text-white shadow-sm shadow-mars-red/30"
              : "text-muted-foreground hover:text-foreground hover:bg-white/8"
          )}
          aria-pressed={activeFilter === option.value}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
