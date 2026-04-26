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
import { buildCompletionState, cloneCompletionOptionMap } from "@/lib/task-completion-utils";
import { completionOptionKey, isMultiOptionDailyTask, normalizeTasks } from "@/lib/task-utils";

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
  const [optionCompletions, setOptionCompletions] = useState<Map<string, Set<number>>>(new Map());
  const [isInitialLoading, setIsInitialLoading] = useState(!useMock);
  const [hasLoadedTasks, setHasLoadedTasks] = useState(useMock);
  const [hasLoadedCompletions, setHasLoadedCompletions] = useState(useMock);

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
  const [scrollToTodaySignal, setScrollToTodaySignal] = useState(0);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const hasInitialScrollRun = useRef(false);
  const headerSelectResetTimeoutRef = useRef<number | null>(null);

  // ── Fetch tasks ────────────────────────────────────────
  useEffect(() => {
    if (useMock) return;
    async function fetchTasks() {
      const { data, error } = await supabase.from("tasks").select("*");
      if (error) {
        console.error("Failed to fetch tasks:", error);
        setHasLoadedTasks(true);
        return;
      }
      setTasks(normalizeTasks(data as Task[]));
      setHasLoadedTasks(true);
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

  const tomorrowISO = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return formatDateISO(d);
  }, []);

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
        .select("task_id, date, value, daily_option_index")
        .gte("date", from)
        .lte("date", to);
      if (error) {
        console.error("Failed to fetch completions:", error);
        setHasLoadedCompletions(true);
        return;
      }
      const completionRows = data as {
        task_id: string;
        date: string;
        value: number | null;
        daily_option_index: number | null;
      }[];
      const state = buildCompletionState(completionRows);
      setCompletions(state.completionSet);
      setQuantValues(state.quantValues);
      setOptionCompletions(state.optionCompletions);
      setHasLoadedCompletions(true);
    }
    fetchCompletions();
  }, [weekDates, monthBaseDate]);

  useEffect(() => {
    if (useMock) return;
    if (hasLoadedTasks && hasLoadedCompletions) {
      setIsInitialLoading(false);
    }
  }, [hasLoadedTasks, hasLoadedCompletions]);

  // ── Week data ──────────────────────────────────────────
  const weekData = useMemo(() => {
    const data = generateWeekData(tasks, weekDates, completions, quantValues, optionCompletions);
    if (activeFilter !== "all") {
      return data.map((day) => ({
        ...day,
        tasks: filterTasks(day.tasks, activeFilter),
      }));
    }
    return data;
  }, [tasks, weekDates, activeFilter, completions, quantValues, optionCompletions]);

  // ── Today index ────────────────────────────────────────
  const todayIndex = useMemo(() => {
    const idx = weekData.findIndex((d) => d.isToday);
    return idx >= 0 ? idx : 0;
  }, [weekData]);

  // Resolve which day is focused on desktop
  const effectiveDayIndex = selectedDayIndex >= 0 ? selectedDayIndex : todayIndex;
  const upcomingByDay = useMemo(() => {
    return weekData
      .slice(effectiveDayIndex + 1)
      .map((day) => {
        const upcomingOneTime = day.tasks.filter((task) => task.type === "one_time" && !task.isCompleted);
        const items = upcomingOneTime.slice(0, 3);
        return {
          date: day.date,
          dayName: day.dayName,
          dayNumber: day.dayNumber,
          items,
          remainingCount: Math.max(upcomingOneTime.length - 3, 0),
        };
      })
      .filter((entry) => entry.items.length > 0)
      .slice(0, 3);
  }, [weekData, effectiveDayIndex]);

  // Reset selectedDayIndex when week changes
  useEffect(() => {
    setSelectedDayIndex(-1);
  }, [weekOffset]);

  useEffect(() => {
    return () => {
      if (headerSelectResetTimeoutRef.current != null) {
        window.clearTimeout(headerSelectResetTimeoutRef.current);
      }
    };
  }, []);

  // ── Mobile scroll management ───────────────────────────
  useEffect(() => {
    if (hasInitialScrollRun.current || !scrollContainerRef.current || highlightedDate) return;
    const container = scrollContainerRef.current;
    const cardWidth = container.offsetWidth;
    container.scrollTo({ left: todayIndex * cardWidth, behavior: "smooth" });
    hasInitialScrollRun.current = true;
  }, [todayIndex, highlightedDate]);

  // Explicit mobile "Today" scroll trigger (used by header Today button)
  useEffect(() => {
    if (!scrollToTodaySignal || !scrollContainerRef.current || isMonthView) return;
    const container = scrollContainerRef.current;
    const todayIdx = weekData.findIndex((d) => d.isToday);
    const targetIndex = todayIdx >= 0 ? todayIdx : 0;

    let attempts = 0;
    let rafId = 0;
    const scrollWhenReady = () => {
      const width = container.offsetWidth;
      if (width > 0) {
        container.scrollTo({ left: targetIndex * width, behavior: "smooth" });
        setCurrentDayIndex(targetIndex);
        return;
      }
      attempts += 1;
      if (attempts < 10) {
        rafId = window.requestAnimationFrame(scrollWhenReady);
      }
    };

    rafId = window.requestAnimationFrame(scrollWhenReady);
    return () => window.cancelAnimationFrame(rafId);
  }, [scrollToTodaySignal, isMonthView, weekData]);

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

    // Keep header selection pinned during animated scroll.
    // Release only after scroll events settle.
    if (selectedDayIndex >= 0) {
      if (headerSelectResetTimeoutRef.current != null) {
        window.clearTimeout(headerSelectResetTimeoutRef.current);
      }
      headerSelectResetTimeoutRef.current = window.setTimeout(() => {
        setSelectedDayIndex(-1);
        headerSelectResetTimeoutRef.current = null;
      }, 140);
    }
  }, [selectedDayIndex]);

  const scrollToDay = useCallback((index: number) => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      container.scrollTo({ left: index * container.offsetWidth, behavior: "smooth" });
      setCurrentDayIndex(index);
    }
  }, []);

  const handleHeaderDaySelect = useCallback(
    (index: number) => {
      scrollToDay(index);
      setSelectedDayIndex(index);
    },
    [scrollToDay]
  );

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
    setWeekDirection("none");
    setWeekAnimKey((k) => k + 1);
    setWeekOffset(0);
    setMonthOffset(0);
    setIsMonthView(false);
    setSelectedDayIndex(-1);
    setHighlightedDate(null);
    hasInitialScrollRun.current = false;
    setScrollToTodaySignal((s) => s + 1);
  }, []);

  // ── Task toggle ────────────────────────────────────────
  const handleToggleTask = useCallback(
    (taskId: string, date: string, optionIndex?: number) => {
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;

      if (task.type === "daily") {
        const key = completionOptionKey(taskId, date);
        const isMultiOption = isMultiOptionDailyTask(task);
        const isValidOptionIndex = Number.isInteger(optionIndex) && (optionIndex as number) >= 0;
        const previousOptionSet = new Set(optionCompletions.get(key) ?? []);
        const wasCompleted = completions.has(key);

        if (isMultiOption && !isValidOptionIndex) return;

        if (isMultiOption && isValidOptionIndex) {
          setOptionCompletions((prev) => {
            const next = cloneCompletionOptionMap(prev);
            const optionSet = new Set(next.get(key) ?? []);
            if (optionSet.has(optionIndex!)) optionSet.delete(optionIndex!);
            else optionSet.add(optionIndex!);
            if (optionSet.size === 0) next.delete(key);
            else next.set(key, optionSet);
            return next;
          });

          setCompletions((prev) => {
            const next = new Set(prev);
            const optionSet = new Set(previousOptionSet);
            if (optionSet.has(optionIndex!)) optionSet.delete(optionIndex!);
            else optionSet.add(optionIndex!);
            if (optionSet.size === 0) next.delete(key);
            else next.add(key);
            return next;
          });
        } else {
          setCompletions((prev) => {
            const next = new Set(prev);
            if (wasCompleted) next.delete(key);
            else next.add(key);
            return next;
          });
        }

        if (useMock) return;

        if (isMultiOption && isValidOptionIndex) {
          const wasOptionCompleted = previousOptionSet.has(optionIndex!);

          const query = wasOptionCompleted
            ? supabase
                .from("task_completions")
                .delete()
                .eq("task_id", taskId)
                .eq("date", date)
                .eq("daily_option_index", optionIndex!)
                .is("value", null)
            : supabase.from("task_completions").insert({
                task_id: taskId,
                date,
                completed_at: new Date().toISOString(),
                daily_option_index: optionIndex!,
              });

          query.then(({ error }) => {
            if (!error) return;

            setOptionCompletions((prev) => {
              const next = cloneCompletionOptionMap(prev);
              if (previousOptionSet.size === 0) next.delete(key);
              else next.set(key, previousOptionSet);
              return next;
            });
            setCompletions((prev) => {
              const next = new Set(prev);
              if (previousOptionSet.size === 0) next.delete(key);
              else next.add(key);
              return next;
            });
          });
        } else if (wasCompleted) {
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
    [tasks, completions, optionCompletions]
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
  const activeDayIndex =
    highlightedDayIndex >= 0 ? highlightedDayIndex : selectedDayIndex >= 0 ? selectedDayIndex : currentDayIndex;

  if (isInitialLoading) {
    return (
      <div className="flex flex-1 items-center justify-center min-h-[80vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-7 h-7 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden">
      {/* Subtle background glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-1/4 -top-1/4 h-[600px] w-[600px] rounded-full bg-white/1.5 blur-[120px]" />
        <div className="absolute -bottom-1/4 -right-1/4 h-[500px] w-[500px] rounded-full bg-white/1 blur-[100px]" />
      </div>

      <main className="relative flex-1 px-4 pt-6 pb-8 lg:px-6 lg:pb-10">
        <div className="mx-auto w-full max-w-4xl space-y-4 lg:space-y-5">
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
              onScrollToDay={handleHeaderDaySelect}
              activeDayIndex={activeDayIndex}
            />
          </div>

          {/* Month View */}
          {isMonthView && (
            <div
              className="glass rounded-2xl p-4 calendar-animate-slide-in-up lg:mx-auto lg:max-w-xl"
              style={{ animationDelay: "60ms" }}
            >
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
                weekDirection === "none" && "calendar-animate-slide-in-up",
                weekDirection === "left" && "calendar-animate-slide-in-left",
                weekDirection === "right" && "calendar-animate-slide-in-right"
              )}
              style={weekDirection === "none" ? { animationDelay: "80ms" } : undefined}
            >
              {/* ── Mobile: snap scroll ──────────────────── */}
              <MobileWeekScroll
                ref={scrollContainerRef}
                weekData={weekData}
                highlightedDate={highlightedDate}
                onScroll={handleScroll}
                onToggleTask={handleToggleTask}
                onLogQuantitative={handleLogQuantitative}
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
                    <div className="mx-auto w-full max-w-4xl lg:grid lg:grid-cols-[minmax(0,1fr)_260px] lg:items-start lg:gap-4">
                      <DayPanel
                        dayData={weekData[effectiveDayIndex]}
                        onToggleTask={handleToggleTask}
                        onLogQuantitative={handleLogQuantitative}
                        isHighlighted={highlightedDate === weekData[effectiveDayIndex].date}
                      />

                      <aside className="glass mt-4 rounded-2xl p-4 lg:mt-0">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xs font-semibold uppercase tracking-widest text-foreground">Upcoming</h3>
                          <span className="text-[11px] uppercase tracking-wider text-muted-foreground/70">
                            Next days
                          </span>
                        </div>

                        {upcomingByDay.length === 0 ? (
                          <p className="mt-4 text-xs text-muted-foreground">No upcoming tasks this week.</p>
                        ) : (
                          <div className="mt-3 space-y-3">
                            {upcomingByDay.map((day) => (
                              <div key={day.date} className="rounded-xl border border-white/8 bg-white/3 p-3">
                                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                  {day.date === tomorrowISO ? "Tomorrow" : `${day.dayName} ${day.dayNumber}`}
                                </p>
                                <ul className="mt-2 space-y-1.5">
                                  {day.items.map((task) => (
                                    <li key={task.id} className="truncate text-[13px] text-foreground">
                                      {task.title}
                                    </li>
                                  ))}
                                </ul>
                                {day.remainingCount > 0 && (
                                  <p className="mt-2 text-[11px] text-muted-foreground">
                                    +{day.remainingCount} more task{day.remainingCount === 1 ? "" : "s"}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </aside>
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
