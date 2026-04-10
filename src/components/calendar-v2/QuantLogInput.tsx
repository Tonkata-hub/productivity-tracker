"use client";

import { useState } from "react";
import { Check, MoreHorizontal, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuantLogInputProps {
  unit: string | null;
  targetValue: number;
  onLogValue: (amount: number) => void;
}

function getQuickIncrements(unit: string | null, target: number): number[] {
  const u = (unit ?? "").toLowerCase();
  if (u === "ml") return [250, 500];
  if (u === "steps") return [1000, 2000];
  if (u === "l" || u === "liters" || u === "litres") return [0.25, 0.5];
  if (u === "min" || u === "mins" || u === "minutes") return [15, 30];
  if (u === "pages") return [10, 25];
  const quarter = Math.ceil(target / 4);
  return quarter > 1 ? [1, quarter] : [1];
}

export function QuantLogInput({ unit, targetValue, onLogValue }: QuantLogInputProps) {
  const [showCustom, setShowCustom] = useState(false);
  const [inputValue, setInputValue] = useState("");

  const increments = getQuickIncrements(unit, targetValue);

  const handleCustomSubmit = () => {
    const amount = parseFloat(inputValue);
    if (!isNaN(amount) && amount > 0) {
      onLogValue(amount);
    }
    setShowCustom(false);
    setInputValue("");
  };

  if (showCustom) {
    return (
      <div className="mt-2 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
        <input
          autoFocus
          type="number"
          min="0"
          step="any"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleCustomSubmit();
            if (e.key === "Escape") {
              setShowCustom(false);
              setInputValue("");
            }
          }}
          className="w-24 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-base text-foreground placeholder-muted-foreground/40 outline-none focus:border-accent/50 transition-colors"
          placeholder={unit ?? "amount"}
        />
        <button
          onMouseDown={(e) => e.preventDefault()}
          onClick={handleCustomSubmit}
          className="flex items-center gap-1 rounded-lg bg-accent/20 px-3 py-2 text-xs font-semibold text-accent transition-colors hover:bg-accent/30"
        >
          <Check className="size-3.5" />
          Log
        </button>
        <button
          onClick={() => {
            setShowCustom(false);
            setInputValue("");
          }}
          className="p-2 text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="size-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="mt-2 flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
      {increments.map((inc) => (
        <button
          key={inc}
          onClick={() => onLogValue(inc)}
          className={cn(
            "rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5",
            "text-xs font-semibold tabular-nums text-muted-foreground",
            "transition-all hover:border-accent/30 hover:bg-accent/10 hover:text-accent",
            "active:scale-95"
          )}
        >
          +{inc}
        </button>
      ))}
      <button
        onClick={() => setShowCustom(true)}
        className={cn(
          "rounded-lg border border-white/10 bg-white/5 p-1.5",
          "text-muted-foreground transition-all hover:border-white/20 hover:text-foreground",
          "active:scale-95"
        )}
        aria-label="Enter custom amount"
      >
        <MoreHorizontal className="size-3.5" />
      </button>
    </div>
  );
}
