"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { TaskType, TaskPriority } from "@/lib/types";
import { Check, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

const PRIORITIES: { value: TaskPriority | ""; label: string; on: string }[] = [
  { value: "", label: "None", on: "bg-white/10 text-foreground border-white/20" },
  { value: "low", label: "Low", on: "bg-zinc-500/20 text-zinc-300 border-zinc-400/40" },
  { value: "medium", label: "Med", on: "bg-yellow-500/20 text-yellow-300 border-yellow-400/40" },
  { value: "high", label: "High", on: "bg-accent/20 text-accent border-accent/40" },
];

export default function AddTaskPage() {
  const [title, setTitle] = useState("");
  const [type, setType] = useState<TaskType>("daily");
  const [priority, setPriority] = useState<TaskPriority | "">("");
  const [dueDate, setDueDate] = useState("");
  const [targetValue, setTargetValue] = useState("");
  const [unit, setUnit] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "submitting" || status === "success") return;
    setStatus("submitting");

    const { error } = await supabase.from("tasks").insert({
      title,
      type,
      priority: priority || null,
      due_date: type === "one_time" ? dueDate || null : null,
      target_value: targetValue ? Number(targetValue) : null,
      unit: unit || null,
    });

    if (error) {
      console.error(error);
      setStatus("error");
      setTimeout(() => setStatus("idle"), 3000);
    } else {
      setStatus("success");
      setTimeout(() => {
        setTitle("");
        setType("daily");
        setPriority("");
        setDueDate("");
        setTargetValue("");
        setUnit("");
        setStatus("idle");
      }, 1800);
    }
  }

  return (
    <div className="min-h-screen bg-background md:flex md:items-center md:justify-center">
      <div className="w-full max-w-lg px-4 pt-6 pb-24 md:pt-0 md:pb-0 space-y-5">
        {/* Header */}
        <div className="calendar-animate-slide-in-up">
          <p className="text-xs text-muted-foreground uppercase tracking-widest">New task</p>
          <h1 className="text-3xl font-bold tracking-tight text-foreground mt-1">What needs doing?</h1>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-3 calendar-animate-slide-in-up"
          style={{ animationDelay: "60ms" }}
        >
          {/* Unified form card */}
          <div className="glass rounded-2xl overflow-hidden w-full">
            {/* Title — big, focal, borderless */}
            <div className="px-5 pt-5 pb-4">
              <input
                className="w-full bg-transparent text-xl font-medium text-foreground placeholder-muted-foreground/35 outline-none caret-accent"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Task title…"
                required
                autoFocus
              />
            </div>

            <div className="border-t border-border" />

            {/* Type — sliding pill toggle */}
            <div className="px-5 py-3.5 flex items-center justify-between gap-4">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Type</span>
              <div className="relative grid grid-cols-2 rounded-lg bg-white/5 p-0.5">
                {/* sliding background */}
                <div
                  className="absolute top-0.5 bottom-0.5 rounded-md bg-accent transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]"
                  style={{
                    width: "calc(50% - 2px)",
                    transform: type === "daily" ? "translateX(2px)" : "translateX(calc(100% + 2px))",
                  }}
                />
                {(["daily", "one_time"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className={cn(
                      "relative z-10 px-4 py-1.5 rounded-md text-xs font-semibold transition-colors duration-150 text-center whitespace-nowrap",
                      type === t ? "text-white" : "text-muted-foreground"
                    )}
                  >
                    {t === "daily" ? "Daily" : "One-time"}
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-border" />

            {/* Priority */}
            <div className="px-5 py-3.5 flex items-center justify-between gap-4">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Priority
              </span>
              <div className="flex gap-1.5">
                {PRIORITIES.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setPriority(p.value)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all duration-150",
                      priority === p.value
                        ? p.on
                        : "border-transparent bg-white/5 text-muted-foreground hover:text-foreground hover:bg-white/8"
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-border" />

            {/* Target amount */}
            <div className="px-5 py-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Target
                </span>
                <span className="text-[10px] text-muted-foreground/50">optional</span>
              </div>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="1"
                  step="any"
                  className="w-28 min-w-0 rounded-lg border border-glass-border bg-white/5 px-3 py-2.5 text-base text-foreground placeholder-muted-foreground/40 outline-none focus:border-accent/50 transition-colors"
                  value={targetValue}
                  onChange={(e) => setTargetValue(e.target.value)}
                  placeholder="e.g. 2000"
                />
                <input
                  type="text"
                  className="flex-1 min-w-0 rounded-lg border border-glass-border bg-white/5 px-3 py-2.5 text-base text-foreground placeholder-muted-foreground/40 outline-none focus:border-accent/50 transition-colors"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="unit (ml, steps…)"
                />
              </div>
            </div>

            {/* Due date — CSS-only enter/exit via grid-template-rows */}
            <div
              style={{
                display: "grid",
                gridTemplateRows: type === "one_time" ? "1fr" : "0fr",
                transition: "grid-template-rows 0.25s cubic-bezier(0.22, 1, 0.36, 1)",
              }}
            >
              <div className="overflow-hidden">
                <div
                  style={{
                    opacity: type === "one_time" ? 1 : 0,
                    transform: type === "one_time" ? "translateY(0)" : "translateY(-6px)",
                    transition: "opacity 0.2s, transform 0.2s",
                  }}
                >
                  <div className="border-t border-border" />
                  <div className="px-5 py-3.5 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                        Due date
                      </span>
                      <span className="text-[10px] text-muted-foreground/50">optional</span>
                    </div>
                    <input
                      type="date"
                      className="w-full rounded-lg border border-glass-border bg-white/5 px-3 py-2.5 text-base text-foreground outline-none focus:border-accent/50 transition-colors scheme-dark"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={status === "submitting" || status === "success" || !title.trim()}
            className={cn(
              "w-full rounded-2xl px-6 py-4 text-sm font-semibold transition-all duration-300 flex items-center justify-center gap-2",
              status === "success"
                ? "bg-green-500 text-white shadow-lg shadow-green-500/25"
                : status === "error"
                  ? "bg-accent/70 text-white"
                  : "bg-accent text-white hover:bg-accent/90 shadow-lg shadow-accent/30 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
            )}
          >
            {status === "submitting" ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Adding…
              </>
            ) : status === "success" ? (
              <>
                <Check className="w-4 h-4" />
                Added!
              </>
            ) : status === "error" ? (
              "Something went wrong — try again"
            ) : (
              <>
                <Plus className="w-4 h-4" />
                Add Task
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
