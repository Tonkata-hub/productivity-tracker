# Calendar Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Visually elevate every calendar component — day chip rings in the nav, radial arc progress in day cards, left-border priority in task items, scrollable pill filter bar, heat-map month view — without changing any functionality or data fetching.

**Architecture:** Pure UI changes across 6 existing files. No new files, no new state, no new routes. CalendarView passes two new props (`weekData`, `activeDayIndex`, `onScrollToDay`) down to WeekNavigation, replacing the separate mobile day indicator strip. All other components are self-contained changes.

**Tech Stack:** Next.js App Router, React 19, TailwindCSS 4, Lucide React, existing `.glass` CSS utilities

---

## File Map

| File | Change |
|------|--------|
| `src/components/calendar/FilterBar.tsx` | Redesign as unified scrollable pill container |
| `src/components/calendar/TaskItem.tsx` | Left-border priority, remove flag icon/label, round checkbox |
| `src/components/calendar/MonthView.tsx` | Heat-map cell backgrounds, remove dots, taller cells |
| `src/components/calendar/DayCard.tsx` | Remove top progress bar + count badge, add radial arc, today glow |
| `src/components/calendar/WeekNavigation.tsx` | Two-row layout: nav + day chips with completion rings |
| `src/components/calendar/CalendarView.tsx` | Pass weekData/activeDayIndex/onScrollToDay to WeekNavigation, remove old mobile strip, remove glass-subtle wrapper |

---

## Task 1: Redesign FilterBar as scrollable pill

**Files:**
- Modify: `src/components/calendar/FilterBar.tsx`

- [ ] **Step 1: Replace FilterBar content**

Replace the entire file with:

```tsx
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
```

- [ ] **Step 2: Verify no lint errors**

Run: `npm run lint`  
Expected: no errors related to FilterBar

---

## Task 2: Redesign TaskItem priority display

**Files:**
- Modify: `src/components/calendar/TaskItem.tsx`

**Note:** We use an absolutely-positioned indicator div instead of left-border utilities. This avoids the Tailwind `border-color` shorthand (used in `hover:border-white/5`) overriding a `border-l-{color}` specific property on hover.

- [ ] **Step 1: Update imports — remove Flag**

At the top of `src/components/calendar/TaskItem.tsx`, change the lucide import line from:
```tsx
import { Repeat, Clock, AlertCircle, Flag, Calendar, Plus, Check } from "lucide-react";
```
to:
```tsx
import { Repeat, Clock, AlertCircle, Calendar, Plus, Check } from "lucide-react";
```

- [ ] **Step 2: Replace priorityConfig with priorityIndicator helper**

Remove:
```tsx
const priorityConfig = {
  high: { label: "High", className: "text-mars-red" },
  medium: { label: "Medium", className: "text-amber-400" },
  low: { label: "Low", className: "text-muted-foreground" },
};
```

Add in its place:
```tsx
function PriorityIndicator({ priority }: { priority: string | null }) {
  if (!priority || priority === "low") return null;
  return (
    <div
      className={cn(
        "absolute left-0 top-1 bottom-1 w-[3px] rounded-full",
        priority === "high" ? "bg-mars-red" : "bg-amber-400"
      )}
    />
  );
}
```

- [ ] **Step 3: Add PriorityIndicator to the quantitative task container**

In the quantitative task `return` block, the outer `<div>` already has `group relative`. Add `<PriorityIndicator priority={task.priority} />` as the first child inside that div, right before the `{/* Main row */}` comment:

```tsx
<div
  className={cn(
    "group relative cursor-pointer rounded-xl p-2.5 transition-all duration-200",
    "bg-white/3 hover:bg-white/6",
    "border border-transparent hover:border-white/5",
    task.isCompleted && "opacity-60"
  )}
  role="listitem"
  onClick={() => setShowInput(true)}
>
  <PriorityIndicator priority={task.priority} />
  {/* Main row */}
```

- [ ] **Step 4: Remove priority flag span from quantitative task meta section**

In the quantitative task's meta section, find and remove:
```tsx
{task.priority && (
  <span
    className={cn(
      "inline-flex items-center gap-1 text-[10px] font-medium",
      priorityConfig[task.priority].className
    )}
  >
    <Flag className="size-2.5" />
    {priorityConfig[task.priority].label}
  </span>
)}
```

- [ ] **Step 5: Add PriorityIndicator to the standard task container**

In the standard task `return` block, the outer `<div>` already has `group relative`. Add `<PriorityIndicator priority={task.priority} />` as the first child inside that div, before the checkbox:

```tsx
<div
  className={cn(
    "group relative flex cursor-pointer items-center gap-3 rounded-xl p-2.5 transition-all duration-200",
    "bg-white/3 hover:bg-white/6",
    "border border-transparent hover:border-white/5",
    isPressed && "scale-[0.98] bg-white/8",
    task.isCompleted && "opacity-40"
  )}
  role="listitem"
  onClick={handleToggle}
>
  <PriorityIndicator priority={task.priority} />
  {/* Checkbox with custom styling */}
```

- [ ] **Step 6: Remove priority flag span from standard task meta section**

Find and remove:
```tsx
{/* Priority */}
{task.priority && (
  <span
    className={cn(
      "inline-flex items-center gap-1 text-[10px] font-medium",
      priorityConfig[task.priority].className
    )}
  >
    <Flag className="size-2.5" />
    {priorityConfig[task.priority].label}
  </span>
)}
```

- [ ] **Step 7: Round the checkbox**

Find the Checkbox className in the standard task return block:
```tsx
className={cn(
  "size-5 rounded-md border-2 transition-all duration-200",
  "border-white/20 bg-transparent",
  "data-[state=checked]:border-white/40 data-[state=checked]:bg-white/10",
  "hover:border-white/30"
)}
```

Replace `rounded-md` with `rounded-full`:
```tsx
className={cn(
  "size-5 rounded-full border-2 transition-all duration-200",
  "border-white/20 bg-transparent",
  "data-[state=checked]:border-white/40 data-[state=checked]:bg-white/10",
  "hover:border-white/30"
)}
```

- [ ] **Step 8: Verify no lint errors**

Run: `npm run lint`  
Expected: no errors

---

## Task 3: Redesign MonthView with heat-map cells

**Files:**
- Modify: `src/components/calendar/MonthView.tsx`

- [ ] **Step 1: Update the day cell render to use heat-map backgrounds**

Inside the `weeks.map` / `week.map` in MonthView, find the block that computes `shownCompleted`, `shownIncomplete`, `overflow` — replace it entirely.

Find this block:
```tsx
const dayTasks = dayTasksMap.get(dateISO) || [];
const completedTasks = dayTasks.filter((t) => t.isCompleted);
const incompleteTasks = dayTasks.filter((t) => !t.isCompleted);
const shownCompleted = completedTasks.slice(0, MAX_DOTS);
const remaining = MAX_DOTS - shownCompleted.length;
const shownIncomplete = incompleteTasks.slice(0, Math.max(0, remaining));
const totalShown = shownCompleted.length + shownIncomplete.length;
const overflow = dayTasks.length - totalShown;
```

Replace with:
```tsx
const dayTasks = dayTasksMap.get(dateISO) || [];
const completedCount = dayTasks.filter((t) => t.isCompleted).length;
const fraction = dayTasks.length > 0 ? completedCount / dayTasks.length : 0;
const heatBg =
  fraction === 0
    ? ""
    : fraction < 0.5
      ? "bg-mars-red/8"
      : fraction < 1
        ? "bg-mars-red/16"
        : "bg-mars-red/25";
```

- [ ] **Step 2: Update the button className to include heat-map bg**

Find the button element:
```tsx
<button
  key={dateISO}
  onClick={() => onDayClick(date)}
  className={cn(
    "relative flex flex-col items-center justify-start gap-1 rounded-lg p-1.5 transition-all duration-200",
    "min-h-[52px] sm:min-h-[60px]",
    "hover:bg-white/10 active:scale-95",
    isCurrentMonth ? "text-foreground" : "text-muted-foreground/40",
    isToday && "ring-1 ring-mars-red bg-mars-red/10"
  )}
```

Replace with:
```tsx
<button
  key={dateISO}
  onClick={() => onDayClick(date)}
  className={cn(
    "relative flex flex-col items-center justify-start gap-1 rounded-lg p-1.5 transition-all duration-200",
    "min-h-[56px] sm:min-h-[64px]",
    "hover:bg-white/10 active:scale-95",
    isCurrentMonth ? "text-foreground" : "text-muted-foreground/40",
    isToday ? "ring-1 ring-mars-red bg-mars-red/10" : heatBg
  )}
```

- [ ] **Step 3: Remove task dots from the button body**

Inside the button, remove the entire task dots block:
```tsx
{/* Task dots */}
{dayTasks.length > 0 && (
  <div className="flex flex-wrap justify-center gap-0.5 max-w-[40px]">
    {shownCompleted.map((task, i) => (
      <div
        key={`c-${task.id}-${i}`}
        className="size-1.5 rounded-full bg-emerald-500"
        title={task.title}
      />
    ))}
    {shownIncomplete.map((task, i) => (
      <div
        key={`i-${task.id}-${i}`}
        className="size-1.5 rounded-full bg-muted-foreground/50"
        title={task.title}
      />
    ))}
    {overflow > 0 && (
      <span className="text-[8px] leading-[10px] text-muted-foreground">+{overflow}</span>
    )}
  </div>
)}
```

- [ ] **Step 4: Remove the MAX_DOTS constant**

Find and remove:
```tsx
const MAX_DOTS = 6;
```

- [ ] **Step 5: Remove unused TaskWithStatus import**

The `getTasksForDate` still returns `TaskWithStatus[]` so the import may still be needed — check if `TaskWithStatus` appears elsewhere in the file. If the only usage was in the dots code, update the import line from:

```tsx
import { Task, TaskWithStatus } from "@/lib/types";
```

to:

```tsx
import { Task } from "@/lib/types";
```

Only do this if `TaskWithStatus` no longer appears anywhere in the file.

- [ ] **Step 6: Verify no lint errors**

Run: `npm run lint`  
Expected: no errors

---

## Task 4: Redesign DayCard with radial arc and today glow

**Files:**
- Modify: `src/components/calendar/DayCard.tsx`

- [ ] **Step 1: Remove CheckCircle2 and Circle imports**

Change:
```tsx
import { CheckCircle2, Circle } from "lucide-react";
```
Remove this line entirely (these icons are only used in the count badge we're removing).

- [ ] **Step 2: Add radial arc constants below the imports**

After the import block, add:
```tsx
const ARC_RADIUS = 10;
const ARC_CIRCUMFERENCE = 2 * Math.PI * ARC_RADIUS;
```

- [ ] **Step 3: Remove the top progress bar**

Find and remove the entire progress bar block at the top of the card body:
```tsx
{/* Completion progress bar (top edge) - white/neutral, red only when complete */}
{totalCount > 0 && (
  <div className="absolute left-0 right-0 top-0 h-[2px] overflow-hidden rounded-t-2xl bg-white/5">
    <div
      className={cn(
        "h-full transition-all duration-500 ease-out",
        allCompleted ? "bg-mars-red" : "bg-white/30"
      )}
      style={{ width: `${completionPercentage}%` }}
    />
  </div>
)}
```

- [ ] **Step 4: Update today ring style to include glow**

In the card's outer `className` block, find:
```tsx
isToday && stackMode !== "mobile" && "ring-1 ring-mars-red/70",
```

Replace with:
```tsx
isToday && stackMode !== "mobile" && "ring-1 ring-mars-red/50 shadow-lg shadow-mars-red/10",
```

- [ ] **Step 5: Replace the count badge with a radial arc**

In the day header, find and remove the count badge block:
```tsx
{/* Completion indicator */}
{totalCount > 0 && (
  <div
    className={cn(
      "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5",
      allCompleted ? "bg-mars-red/15" : "bg-white/5"
    )}
  >
    {allCompleted ? (
      <CheckCircle2 className="size-4 text-mars-red" />
    ) : (
      <Circle className="size-4 text-muted-foreground" />
    )}
    <span className={cn("text-xs font-semibold", allCompleted ? "text-mars-red" : "text-muted-foreground")}>
      {completedCount}/{totalCount}
    </span>
  </div>
)}
```

Replace with:
```tsx
{/* Radial arc progress */}
{totalCount > 0 && (
  <svg viewBox="0 0 28 28" className="w-8 h-8 shrink-0 -rotate-90">
    <circle
      cx="14"
      cy="14"
      r={ARC_RADIUS}
      fill="none"
      stroke="rgba(255,255,255,0.07)"
      strokeWidth="2.5"
    />
    {completionPercentage > 0 && (
      <circle
        cx="14"
        cy="14"
        r={ARC_RADIUS}
        fill="none"
        stroke={allCompleted ? "#ff3b3b" : "rgba(255,59,59,0.45)"}
        strokeWidth="2.5"
        strokeDasharray={`${(completionPercentage / 100) * ARC_CIRCUMFERENCE} ${ARC_CIRCUMFERENCE}`}
        strokeLinecap="round"
      />
    )}
  </svg>
)}
```

- [ ] **Step 6: Update the sub-text in the day header**

The `{completedCount} of {totalCount} done` text is now redundant with the arc but can stay as a small reference. Update it to be more compact:

Find:
```tsx
{totalCount > 0 && (
  <span className="text-xs text-muted-foreground">
    {completedCount} of {totalCount} done
  </span>
)}
```

Replace with:
```tsx
{totalCount > 0 && (
  <span className="text-xs text-muted-foreground">
    {completedCount}/{totalCount}
  </span>
)}
```

- [ ] **Step 7: Verify no lint errors**

Run: `npm run lint`  
Expected: no errors

---

## Task 5: Redesign WeekNavigation with two-row layout and day chips

**Files:**
- Modify: `src/components/calendar/WeekNavigation.tsx`

- [ ] **Step 1: Replace the entire WeekNavigation file**

```tsx
"use client";

import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Calendar, CalendarDays } from "lucide-react";
import { getWeekRangeLabel, getMonthLabel } from "@/lib/calendar-utils";
import { DayTasks } from "@/lib/types";
import { cn } from "@/lib/utils";

interface WeekNavigationProps {
  weekDates: Date[];
  weekData: DayTasks[];
  onPreviousWeek: () => void;
  onNextWeek: () => void;
  isMonthView?: boolean;
  onToggleMonthView?: () => void;
  monthBaseDate?: Date;
  onPreviousMonth?: () => void;
  onNextMonth?: () => void;
  onScrollToDay?: (index: number) => void;
  activeDayIndex?: number;
}

const RING_RADIUS = 8;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export function WeekNavigation({
  weekDates,
  weekData,
  onPreviousWeek,
  onNextWeek,
  isMonthView = false,
  onToggleMonthView,
  monthBaseDate,
  onPreviousMonth,
  onNextMonth,
  onScrollToDay,
  activeDayIndex = 0,
}: WeekNavigationProps) {
  const handlePrevious = isMonthView && onPreviousMonth ? onPreviousMonth : onPreviousWeek;
  const handleNext = isMonthView && onNextMonth ? onNextMonth : onNextWeek;
  const label =
    isMonthView && monthBaseDate ? getMonthLabel(monthBaseDate) : getWeekRangeLabel(weekDates);

  return (
    <div className="space-y-3">
      {/* Top row: prev/next + label + view toggle */}
      <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={handlePrevious}
          aria-label={isMonthView ? "Previous month" : "Previous week"}
          className={cn(
            "size-9 rounded-xl bg-white/5 text-foreground transition-all duration-200",
            "hover:bg-white/10 hover:text-mars-red",
            "active:scale-95"
          )}
        >
          <ChevronLeft className="size-4" />
        </Button>

        <button
          onClick={onToggleMonthView}
          className={cn(
            "flex items-center justify-center gap-2 rounded-lg px-3 py-1.5 transition-all duration-200",
            "hover:bg-white/5 active:scale-98",
            "group cursor-pointer"
          )}
          aria-label={isMonthView ? "Switch to week view" : "Switch to month view"}
        >
          <h2 className="text-center text-sm font-bold tracking-tight text-foreground">{label}</h2>
          {isMonthView ? (
            <CalendarDays className="size-4 text-muted-foreground group-hover:text-mars-red transition-colors" />
          ) : (
            <Calendar className="size-4 text-muted-foreground group-hover:text-mars-red transition-colors" />
          )}
        </button>

        <Button
          variant="ghost"
          size="icon"
          onClick={handleNext}
          aria-label={isMonthView ? "Next month" : "Next week"}
          className={cn(
            "size-9 rounded-xl bg-white/5 text-foreground transition-all duration-200",
            "hover:bg-white/10 hover:text-mars-red",
            "active:scale-95"
          )}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>

      {/* Bottom row: day chips with completion rings (week view only) */}
      {!isMonthView && weekData.length > 0 && (
        <div className="grid grid-cols-7 gap-1">
          {weekData.map((day, index) => {
            const fraction =
              day.tasks.length > 0
                ? day.tasks.filter((t) => t.isCompleted).length / day.tasks.length
                : 0;
            const dash = fraction * RING_CIRCUMFERENCE;
            const isActive = activeDayIndex === index;

            return (
              <button
                key={day.date}
                onClick={() => onScrollToDay?.(index)}
                style={{ animationDelay: `${index * 25}ms` }}
                className={cn(
                  "calendar-animate-slide-in-up flex flex-col items-center gap-0.5 rounded-xl py-1.5 px-1 transition-all duration-200",
                  isActive ? "bg-white/8" : "hover:bg-white/5",
                  day.isFuture && "opacity-40"
                )}
                aria-label={`Go to ${day.dayName}`}
              >
                {/* Completion ring */}
                <svg viewBox="0 0 24 24" className="w-6 h-6 -rotate-90">
                  <circle
                    cx="12"
                    cy="12"
                    r={RING_RADIUS}
                    fill="none"
                    stroke={day.isToday ? "rgba(255,59,59,0.25)" : "rgba(255,255,255,0.07)"}
                    strokeWidth="2.5"
                  />
                  {fraction > 0 && (
                    <circle
                      cx="12"
                      cy="12"
                      r={RING_RADIUS}
                      fill="none"
                      stroke={fraction >= 1 ? "#ff3b3b" : "rgba(255,59,59,0.45)"}
                      strokeWidth="2.5"
                      strokeDasharray={`${dash} ${RING_CIRCUMFERENCE}`}
                      strokeLinecap="round"
                    />
                  )}
                </svg>
                {/* Day letter */}
                <span
                  className={cn(
                    "text-[10px] font-semibold uppercase leading-none",
                    day.isToday
                      ? "text-mars-red"
                      : isActive
                        ? "text-foreground"
                        : "text-muted-foreground"
                  )}
                >
                  {day.dayName.slice(0, 1)}
                </span>
                {/* Date number */}
                <span
                  className={cn(
                    "text-[10px] leading-none",
                    day.isToday ? "text-mars-red font-bold" : "text-muted-foreground"
                  )}
                >
                  {day.dayNumber}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify no lint errors**

Run: `npm run lint`  
Expected: no errors

---

## Task 6: Update CalendarView to wire new props and remove old mobile strip

**Files:**
- Modify: `src/components/calendar/CalendarView.tsx`

- [ ] **Step 1: Pass new props to WeekNavigation**

Find the `<WeekNavigation ... />` JSX block (inside the `<div className="glass rounded-2xl p-3">`):

```tsx
<WeekNavigation
  weekDates={weekDates}
  onPreviousWeek={handlePreviousWeek}
  onNextWeek={handleNextWeek}
  isMonthView={isMonthView}
  onToggleMonthView={handleToggleMonthView}
  monthBaseDate={monthBaseDate}
  onPreviousMonth={handlePreviousMonth}
  onNextMonth={handleNextMonth}
/>
```

Replace with:

```tsx
<WeekNavigation
  weekDates={weekDates}
  weekData={weekData}
  onPreviousWeek={handlePreviousWeek}
  onNextWeek={handleNextWeek}
  isMonthView={isMonthView}
  onToggleMonthView={handleToggleMonthView}
  monthBaseDate={monthBaseDate}
  onPreviousMonth={handlePreviousMonth}
  onNextMonth={handleNextMonth}
  onScrollToDay={scrollToDay}
  activeDayIndex={activeDayIndex}
/>
```

- [ ] **Step 2: Remove the glass-subtle wrapper around FilterBar**

Find:
```tsx
{/* Filters - glass effect (only show in week view) */}
<div
  className={cn(
    "glass-subtle rounded-xl p-2 transition-all duration-300",
    isMonthView && "opacity-0 h-0 p-0 overflow-hidden"
  )}
>
  <FilterBar activeFilter={activeFilter} onFilterChange={setActiveFilter} />
</div>
```

Replace with:
```tsx
{/* Filters (only show in week view) */}
<div
  className={cn(
    "transition-all duration-300",
    isMonthView && "opacity-0 h-0 overflow-hidden"
  )}
>
  <FilterBar activeFilter={activeFilter} onFilterChange={setActiveFilter} />
</div>
```

- [ ] **Step 3: Remove the mobile day indicator strip**

Find and remove the entire mobile day indicator block:
```tsx
{/* Day indicators for mobile scroll */}
<div
  className={cn(
    "flex justify-center gap-1.5 sm:hidden transition-all duration-300",
    isMonthView && "opacity-0 h-0 overflow-hidden"
  )}
>
  {weekData.map((day, index) => (
    <button
      key={day.date}
      onClick={() => scrollToDay(index)}
      className={cn(
        "flex flex-col items-center gap-0.5 rounded-lg px-2 py-1 transition-all duration-200",
        activeDayIndex === index ? "bg-white/10" : "opacity-50 hover:opacity-80"
      )}
      aria-label={`Go to ${day.dayName}`}
    >
      <span
        className={cn(
          "text-[10px] font-medium uppercase",
          day.isToday ? "text-mars-red" : "text-muted-foreground"
        )}
      >
        {day.dayName.slice(0, 1)}
      </span>
      <div
        className={cn(
          "size-1.5 rounded-full transition-all",
          activeDayIndex === index ? (day.isToday ? "bg-mars-red" : "bg-foreground") : "bg-muted-foreground/30"
        )}
      />
    </button>
  ))}
</div>
```

- [ ] **Step 4: Verify no lint errors**

Run: `npm run lint`  
Expected: no errors

- [ ] **Step 5: Verify production build**

Run: `npm run build`  
Expected: build completes with no errors

- [ ] **Step 6: Start dev server and visually verify**

Run: `npm run dev`

Check on `localhost:3000/calendar`:

- [ ] Week nav shows two rows: top (arrows + label) and bottom (7 day chips with rings)
- [ ] Today's chip has mars-red ring track + elevated background
- [ ] Completed tasks show orange/red arc fill, 100% complete shows full mars-red arc
- [ ] Tapping a chip on mobile scrolls to that day
- [ ] Filter bar is a unified pill shape with scrollable options; active is mars-red filled
- [ ] Task items show a colored left border based on priority (red/amber/none), no flag icon
- [ ] Task checkboxes are circular
- [ ] Day cards: today has a red glow ring. Each card shows a radial arc in the header corner
- [ ] The top 2px progress bar is gone from day cards
- [ ] Month view cells use heat-map background opacity (no dots)
- [ ] No extra glass card around the filter bar — it sits flush in the layout
- [ ] Old mobile dot indicator strip is gone
