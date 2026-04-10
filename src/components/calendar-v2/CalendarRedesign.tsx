"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { Task } from "@/lib/types";
import { supabase } from "@/lib/supabase";
import { mockTasks } from "@/lib/mock-data";
import {
  getWeekDates,
  getMonthDates,
  generateWeekData,
  formatDateISO,
  filterTasks,
  getWeekOffsetForDate,
} from "@/lib/calendar-utils";
import { cn } from "@/lib/utils";

import { WeekHeader } from "./WeekHeader";
import { WeekSummaryBar } from "./WeekSummaryBar";
import { DayPanel } from "./DayPanel";
import { MobileWeekScroll } from "./MobileWeekScroll";
import { MonthGrid } from "./MonthGrid";
import { FilterPopover, ActiveFilterBadge } from "./FilterPopover";

const useMock = process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true";

export function CalendarRedesign() {
  // ── Core data state ────────────────────────────────────
  const [tasks, setTasks] = useState<Task[]>(useMock ? mockTasks : []);
  const [completions, setCompletions] = useState<Set<string>>(new Set());
  const [quantValues, setQuantValues] = useState<Map<string, number>>(new Map());

  // ── Navigation state ───────────────────────────────────
  const [weekOffset, setWeekOffset] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);
  const [isMonthView, setIsMonthView] = useState(false);
  const [monthDirection, setMonthDirection] = useState<"up" | "down" | "none">("none");
  const [weekDirection, setWeekDirection] = useState<"left" | "right" | "none">("none");
  const [weekAnimKey, setWeekAnimKey] = useState(0);

  // ── Selection state ────────────────────────────────────
  const [activeFilter, setActiveFilter] = useState("all");
  const [selectedDayIndex, setSelectedDayIndex] = useState(-1); // -1 = auto (today)
  const [currentDayIndex, setCurrentDayIndex] = useState(0); // mobile scroll position
  const [highlightedDate, setHighlightedDate] = useState<string | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const hasInitialScrollRun = useRef(false);

  // ── Fetch tasks ────────────────────────────────────────
  useEffect(() => {
    if (useMock) return;
    async function fetchTasks() {
      const { data, error } = await supabase.from("tasks").select("*");
      if (error) {
        console.error("Failed to fetch tasks:", error);
        return;
      }
      setTasks(data as Task[]);
    }
    fetchTasks();
  }, []);

  // ── Derived dates ──────────────────────────────────────
  const weekDates = useMemo(() => {
    const base = new Date();
    base.setDate(base.getDate() + weekOffset * 7);
    return getWeekDates(base);
  }, [weekOffset]);

  const monthBaseDate = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + monthOffset);
    return d;
  }, [monthOffset]);

  // ── Fetch completions ──────────────────────────────────
  useEffect(() => {
    if (useMock) return;
    if (weekDates.length === 0) return;

    const monthDates = getMonthDates(monthBaseDate);
    const weekFrom = formatDateISO(weekDates[0]);
    const weekTo = formatDateISO(weekDates[weekDates.length - 1]);
    const monthFrom = formatDateISO(monthDates[0]);
    const monthTo = formatDateISO(monthDates[monthDates.length - 1]);
    const from = weekFrom < monthFrom ? weekFrom : monthFrom;
    const to = weekTo > monthTo ? weekTo : monthTo;

    async function fetchCompletions() {
      const { data, error } = await supabase
        .from("task_completions")
        .select("task_id, date, value")
        .gte("date", from)
        .lte("date", to);
      if (error) {
        console.error("Failed to fetch completions:", error);
        return;
      }
      const set = new Set<string>();
      const qmap = new Map<string, number>();
      for (const c of data as { task_id: string; date: string; value: number | null }[]) {
        const key = `${c.task_id}:${c.date}`;
        if (c.value != null) {
          qmap.set(key, (qmap.get(key) ?? 0) + c.value);
        } else {
          set.add(key);
        }
      }
      setCompletions(set);
      setQuantValues(qmap);
    }
    fetchCompletions();
  }, [weekDates, monthBaseDate]);

  // ── Week data ──────────────────────────────────────────
  const weekData = useMemo(() => {
    const data = generateWeekData(tasks, weekDates, completions, quantValues);
    if (activeFilter !== "all") {
      return data.map((day) => ({
        ...day,
        tasks: filterTasks(day.tasks, activeFilter),
      }));
    }
    return data;
  }, [tasks, weekDates, activeFilter, completions, quantValues]);

  // ── Today index ────────────────────────────────────────
  const todayIndex = useMemo(() => {
    const idx = weekData.findIndex((d) => d.isToday);
    return idx >= 0 ? idx : 0;
  }, [weekData]);

  // Resolve which day is focused on desktop
  const effectiveDayIndex = selectedDayIndex >= 0 ? selectedDayIndex : todayIndex;

  // Reset selectedDayIndex when week changes
  useEffect(() => {
    setSelectedDayIndex(-1);
  }, [weekOffset]);

  // ── Mobile scroll management ───────────────────────────
  useEffect(() => {
    if (hasInitialScrollRun.current || !scrollContainerRef.current || highlightedDate) return;
    const container = scrollContainerRef.current;
    const cardWidth = container.offsetWidth;
    container.scrollTo({ left: todayIndex * cardWidth, behavior: "smooth" });
    hasInitialScrollRun.current = true;
  }, [todayIndex, highlightedDate]);

  useEffect(() => {
    if (!scrollContainerRef.current || !highlightedDate) return;
    const idx = weekData.findIndex((d) => d.date === highlightedDate);
    if (idx >= 0) {
      const container = scrollContainerRef.current;
      container.scrollTo({ left: idx * container.offsetWidth, behavior: "smooth" });
    }
  }, [highlightedDate, weekData]);

  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current) return;
    const container = scrollContainerRef.current;
    const newIndex = Math.round(container.scrollLeft / container.offsetWidth);
    setCurrentDayIndex(newIndex);
  }, []);

  const scrollToDay = useCallback((index: number) => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      container.scrollTo({ left: index * container.offsetWidth, behavior: "smooth" });
      setCurrentDayIndex(index);
    }
  }, []);

  const scrollToToday = useCallback(() => {
    scrollToDay(todayIndex);
  }, [scrollToDay, todayIndex]);

  // ── Navigation handlers ────────────────────────────────
  const handlePreviousWeek = useCallback(() => {
    setWeekDirection("right");
    setWeekAnimKey((k) => k + 1);
    setWeekOffset((prev) => prev - 1);
  }, []);

  const handleNextWeek = useCallback(() => {
    setWeekDirection("left");
    setWeekAnimKey((k) => k + 1);
    setWeekOffset((prev) => prev + 1);
  }, []);

  const handlePreviousMonth = useCallback(() => {
    setMonthDirection("down");
    setMonthOffset((prev) => prev - 1);
  }, []);

  const handleNextMonth = useCallback(() => {
    setMonthDirection("up");
    setMonthOffset((prev) => prev + 1);
  }, []);

  const handleToggleMonthView = useCallback(() => {
    setIsMonthView((prev) => {
      if (!prev) {
        const today = new Date();
        const todayISO = formatDateISO(today);
        const currentWeekDate = weekDates.find((d) => formatDateISO(d) === todayISO) ?? weekDates[0];
        const monthsDiff =
          (currentWeekDate.getFullYear() - today.getFullYear()) * 12 + (currentWeekDate.getMonth() - today.getMonth());
        setMonthOffset(monthsDiff);
        setMonthDirection("none");
      }
      return !prev;
    });
    setHighlightedDate(null);
  }, [weekDates]);

  const handleMonthDayClick = useCallback((date: Date) => {
    const newOffset = getWeekOffsetForDate(date);
    setWeekOffset(newOffset);
    setHighlightedDate(formatDateISO(date));
    setIsMonthView(false);
    setTimeout(() => setHighlightedDate(null), 2000);
  }, []);

  const handleSelectToday = useCallback(() => {
    const todayISO = formatDateISO(new Date());
    setWeekDirection("none");
    setWeekAnimKey((k) => k + 1);
    setWeekOffset(0);
    setMonthOffset(0);
    setIsMonthView(false);
    setSelectedDayIndex(-1);
    setHighlightedDate(null);
    hasInitialScrollRun.current = false;
    window.setTimeout(() => {
      setHighlightedDate(todayISO);
      window.setTimeout(() => setHighlightedDate(null), 2000);
    }, 0);
  }, []);

  // ── Task toggle ────────────────────────────────────────
  const handleToggleTask = useCallback(
    (taskId: string, date: string) => {
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;

      if (task.type === "daily") {
        const key = `${taskId}:${date}`;
        const wasCompleted = completions.has(key);

        setCompletions((prev) => {
          const next = new Set(prev);
          if (wasCompleted) next.delete(key);
          else next.add(key);
          return next;
        });

        if (useMock) return;

        if (wasCompleted) {
          supabase
            .from("task_completions")
            .delete()
            .match({ task_id: taskId, date })
            .then(({ error }) => {
              if (error) {
                setCompletions((prev) => {
                  const next = new Set(prev);
                  next.add(key);
                  return next;
                });
              }
            });
        } else {
          supabase
            .from("task_completions")
            .insert({ task_id: taskId, date, completed_at: new Date().toISOString() })
            .then(({ error }) => {
              if (error) {
                setCompletions((prev) => {
                  const next = new Set(prev);
                  next.delete(key);
                  return next;
                });
              }
            });
        }
      } else if (task.type === "one_time") {
        const newCompleted = !task.is_completed;
        const now = new Date().toISOString();

        setTasks((prev) =>
          prev.map((t) =>
            t.id !== taskId ? t : { ...t, is_completed: newCompleted, completed_at: newCompleted ? now : null }
          )
        );

        if (useMock) return;

        supabase
          .from("tasks")
          .update({ is_completed: newCompleted, completed_at: newCompleted ? now : null })
          .eq("id", taskId)
          .then(({ error }) => {
            if (error) {
              setTasks((prev) =>
                prev.map((t) =>
                  t.id !== taskId ? t : { ...t, is_completed: !newCompleted, completed_at: task.completed_at }
                )
              );
            }
          });
      }
    },
    [tasks, completions]
  );

  // ── Log quantitative value ─────────────────────────────
  const handleLogQuantitative = useCallback((taskId: string, date: string, amount: number) => {
    const key = `${taskId}:${date}`;

    setQuantValues((prev) => {
      const next = new Map(prev);
      next.set(key, (next.get(key) ?? 0) + amount);
      return next;
    });

    if (useMock) return;

    supabase
      .from("task_completions")
      .insert({ task_id: taskId, date, value: amount, completed_at: new Date().toISOString() })
      .then(({ error }) => {
        if (error) {
          setQuantValues((prev) => {
            const next = new Map(prev);
            const current = next.get(key) ?? 0;
            const rolled = current - amount;
            if (rolled <= 0) next.delete(key);
            else next.set(key, rolled);
            return next;
          });
        }
      });
  }, []);

  // ── Active day index for mobile pill highlight ─────────
  const highlightedDayIndex = highlightedDate ? weekData.findIndex((d) => d.date === highlightedDate) : -1;
  const activeDayIndex = highlightedDayIndex >= 0 ? highlightedDayIndex : currentDayIndex;

  // ── Render ─────────────────────────────────────────────
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-background">
      {/* Subtle background glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-1/4 -top-1/4 h-[600px] w-[600px] rounded-full bg-white/1.5 blur-[120px]" />
        <div className="absolute -bottom-1/4 -right-1/4 h-[500px] w-[500px] rounded-full bg-white/1 blur-[100px]" />
      </div>

      <main className="relative flex-1 px-4 pt-6 pb-8 lg:px-6 lg:pb-10">
        <div className="mx-auto w-full max-w-5xl space-y-4 lg:space-y-5">
          {/* Page header */}
          <div className="flex items-end justify-between calendar-animate-slide-in-up">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-widest">Schedule</p>
              <h1 className="text-3xl font-bold tracking-tight text-foreground mt-1">Calendar</h1>
            </div>
            <div className="flex items-center gap-2 pb-0.5">
              {activeFilter !== "all" && (
                <ActiveFilterBadge filter={activeFilter} onClear={() => setActiveFilter("all")} />
              )}
              <button
                onClick={handleSelectToday}
                className={cn(
                  "h-10 cursor-pointer rounded-xl px-3 text-xs font-semibold tracking-wide transition-all duration-200",
                  "bg-white/5 text-foreground hover:bg-white/10 active:scale-95"
                )}
                aria-label="Go to today"
              >
                Today
              </button>
              <FilterPopover activeFilter={activeFilter} onFilterChange={setActiveFilter} />
            </div>
          </div>

          {/* Week/Month navigation */}
          <div
            className="glass w-full rounded-2xl px-3 py-2.5 calendar-animate-slide-in-up"
            style={{ animationDelay: "40ms" }}
          >
            <WeekHeader
              weekDates={weekDates}
              weekData={weekData}
              onPreviousWeek={handlePreviousWeek}
              onNextWeek={handleNextWeek}
              isMonthView={isMonthView}
              onToggleMonthView={handleToggleMonthView}
              monthBaseDate={monthBaseDate}
              onPreviousMonth={handlePreviousMonth}
              onNextMonth={handleNextMonth}
              onScrollToDay={(i) => {
                scrollToDay(i);
                setSelectedDayIndex(i);
              }}
              activeDayIndex={activeDayIndex}
            />
          </div>

          {/* Month View */}
          {isMonthView && (
            <div className="glass rounded-2xl p-4 calendar-animate-slide-in-up" style={{ animationDelay: "60ms" }}>
              <MonthGrid
                key={`${monthBaseDate.getFullYear()}-${monthBaseDate.getMonth()}`}
                baseDate={monthBaseDate}
                tasks={tasks}
                completions={completions}
                quantValues={quantValues}
                onDayClick={handleMonthDayClick}
                direction={monthDirection}
              />
            </div>
          )}

          {/* Week View */}
          {!isMonthView && (
            <div
              key={weekAnimKey}
              className={cn(
                weekDirection === "left" && "calendar-animate-slide-in-left",
                weekDirection === "right" && "calendar-animate-slide-in-right"
              )}
            >
              {/* ── Mobile: snap scroll ──────────────────── */}
              <MobileWeekScroll
                ref={scrollContainerRef}
                weekData={weekData}
                currentDayIndex={currentDayIndex}
                todayIndex={todayIndex}
                highlightedDate={highlightedDate}
                onScroll={handleScroll}
                onToggleTask={handleToggleTask}
                onLogQuantitative={handleLogQuantitative}
                onScrollToToday={scrollToToday}
              />

              {/* ── Tablet: 2-column grid ────────────────── */}
              <div className="hidden sm:grid sm:grid-cols-2 sm:gap-3 lg:hidden">
                {weekData.map((dayData) => (
                  <DayPanel
                    key={dayData.date}
                    dayData={dayData}
                    onToggleTask={handleToggleTask}
                    onLogQuantitative={handleLogQuantitative}
                    isHighlighted={highlightedDate === dayData.date}
                  />
                ))}
              </div>

              {/* ── Desktop: Focus-day + context strip ───── */}
              <div className="hidden lg:block">
                <div className="space-y-4">
                  {/* Week summary bar */}
                  <WeekSummaryBar
                    weekData={weekData}
                    selectedIndex={effectiveDayIndex}
                    onSelectDay={setSelectedDayIndex}
                  />

                  {/* Selected day panel */}
                  {weekData[effectiveDayIndex] && (
                    <div className="max-w-xl mx-auto">
                      <DayPanel
                        dayData={weekData[effectiveDayIndex]}
                        onToggleTask={handleToggleTask}
                        onLogQuantitative={handleLogQuantitative}
                        isHighlighted={highlightedDate === weekData[effectiveDayIndex].date}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Empty state when all tasks filtered out */}
          {!isMonthView && weekData.every((d) => d.tasks.length === 0) && activeFilter !== "all" && (
            <div className="glass flex flex-col items-center justify-center rounded-2xl py-14 text-center">
              <div className="mb-3 flex size-14 items-center justify-center rounded-2xl bg-white/5">
                <span className="text-2xl opacity-30">*</span>
              </div>
              <h3 className="text-sm font-semibold text-foreground">No matching tasks</h3>
              <p className="mt-1 text-xs text-muted-foreground">Try adjusting your filter to see more tasks</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
