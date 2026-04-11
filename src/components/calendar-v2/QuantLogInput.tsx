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
  const withTarget = (values: number[]): number[] => {
    const normalized = [...values];
    if (Number.isFinite(target) && target > 0) normalized.push(target);
    return Array.from(new Set(normalized.map((n) => (Number.isInteger(n) ? n : Number(n.toFixed(2)))))).sort(
      (a, b) => a - b
    );
  };

  const u = (unit ?? "").toLowerCase();
  if (u === "ml") return withTarget([250, 500]);
  if (u === "steps") return withTarget([1000, 2000]);
  if (u === "l" || u === "liters" || u === "litres") return withTarget([0.25, 0.5]);
  if (u === "min" || u === "mins" || u === "minutes") return withTarget([15, 30]);
  if (u === "pages") return withTarget([10, 25]);
  if (u === "times" || u === "reps") return withTarget([1, 2, Math.ceil(target / 2)]);
  const quarter = Math.ceil(target / 4);
  return withTarget(quarter > 1 ? [1, quarter] : [1]);
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
          className="w-24 cursor-text rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-base text-foreground placeholder-muted-foreground/40 outline-none transition-colors focus:border-accent/50"
          placeholder={unit ?? "amount"}
        />
        <button
          onMouseDown={(e) => e.preventDefault()}
          onClick={handleCustomSubmit}
          className="flex cursor-pointer items-center gap-1 rounded-lg bg-accent/15 px-3 py-2 text-xs font-semibold text-accent transition-colors hover:bg-accent/20"
        >
          <Check className="size-3.5" />
          Log
        </button>
        <button
          onClick={() => {
            setShowCustom(false);
            setInputValue("");
          }}
          className="cursor-pointer p-2 text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="size-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="mt-2 flex cursor-pointer items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
      {increments.map((inc) => (
        <button
          key={inc}
          onClick={() => onLogValue(inc)}
          className={cn(
            "cursor-pointer rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5",
            "text-xs font-semibold tabular-nums text-muted-foreground",
            "transition-all hover:border-white/20 hover:bg-white/8 hover:text-foreground",
            "active:scale-95"
          )}
        >
          +{inc}
        </button>
      ))}
      <button
        onClick={() => setShowCustom(true)}
        className={cn(
          "cursor-pointer rounded-lg border border-white/10 bg-white/5 p-1.5",
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
