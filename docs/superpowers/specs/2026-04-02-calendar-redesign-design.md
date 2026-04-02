# Calendar Page Redesign — Design Spec

**Date:** 2026-04-02  
**Status:** Approved  
**Scope:** Visual redesign of `/calendar` — all calendar components. No functional or data-layer changes.

---

## Overview

A "Refined & Elevated" redesign of the existing glassmorphism calendar page. Every component gets a visual lift while staying within the established design language (dark background `#0a0b0f`, mars-red `#ff3b3b` accent, glass utilities, Geist font). The goal is coherence, visual hierarchy, and tying the calendar's visual language to the home page's streak ring pattern.

No new state, no new data fetching, no new routes. Pure UI uplift.

---

## Components

### 1. Week Navigation Header (`WeekNavigation.tsx`)

**Current:** A simple glass card with prev/next arrows and a label in the middle.

**Redesigned:** Two-row header.

- **Top row:** prev chevron | week/month label (bolder, `text-base font-bold tracking-tight`) | view-toggle icon button
- **Bottom row:** 7 day chips in a horizontal strip
  - Each chip: small SVG completion ring (same arc pattern as home page streak rings), day initial letter (M/T/W/T/F/S/S), date number
  - Today's chip: mars-red ring fill + subtle `bg-mars-red/10` background
  - On mobile: tapping a chip snaps the scroll container to that day
  - Chips are passed completion data via props from `CalendarView`

**Props change:** `WeekNavigation` receives `weekData` (the `DayTasks[]` array) to render per-day completion rings. The parent already computes this.

---

### 2. Day Cards (`DayCard.tsx`)

**Current:** Uniform glass cards; today has a thin `ring-1 ring-mars-red/70`. Progress shown as a 2px top bar. Count shown as an `X/Y` badge.

**Redesigned:**

- **Today:** `ring-1 ring-mars-red/50` + `shadow-lg shadow-mars-red/10` glow — clearly dominant
- **Progress:** Replace the 2px top bar with a small radial SVG arc (r=10, same ring language) in the top-right corner of the card header. Arc fills mars-red at 100%, white/30 otherwise
- **Count badge (`X/Y done` + circle/checkmark icon):** Removed — the radial arc communicates this visually
- **Past days:** `opacity-55` (slightly stronger fade than current `opacity-60`)
- **Day number circle:** Unchanged (mars-red bg for today, `bg-white/5` otherwise)
- **Card min-height on mobile:** Keep `min-h-[400px]`

---

### 3. Task Items (`TaskItem.tsx`)

**Current:** Priority shown as flag icon + label text inline.

**Redesigned:**

- Priority communicated via a **3px left border** on the task row:
  - `high` → `border-l-[3px] border-mars-red`
  - `medium` → `border-l-[3px] border-amber-400`
  - `low` / none → `border-l-[3px] border-transparent`
- Flag icon and priority label text removed
- All other task meta (overdue badge, due-today badge, due date, type icon) unchanged
- Checkbox styling: add `rounded-full` instead of `rounded-md` for a cleaner circle feel
- Quantitative task `+` button: unchanged

---

### 4. Filter Bar (`FilterBar.tsx`)

**Current:** Standalone `glass-subtle` card containing floating filter chip buttons.

**Redesigned:** A single segmented pill control.

- One container pill: `rounded-full bg-white/5 p-1 flex gap-0`
- The active segment is a filled block (`rounded-full bg-mars-red`) that slides within the pill via CSS transition on `transform: translateX`
- The active option label is `text-white font-semibold`, inactive labels are `text-muted-foreground`
- The `glass-subtle` wrapper card in `CalendarView` is removed; the filter pill sits directly in the layout

---

### 5. Month View (`MonthView.tsx`)

**Current:** Day cells have small green/gray dot indicators for completions.

**Redesigned — heat-map cells:**

- Dots removed
- Each day cell background: `bg-mars-red` at varying opacity based on completion fraction:
  - 0% → `bg-transparent`
  - 1–49% → `bg-mars-red/8`
  - 50–99% → `bg-mars-red/16`
  - 100% → `bg-mars-red/25`
- Today cell: `ring-1 ring-mars-red` (unchanged)
- Out-of-month days: unchanged dim treatment
- Cell min-height: increase to `min-h-[56px] sm:min-h-[64px]` for more breathing room
- Day number typography: unchanged

---

### 6. Mobile Day Indicator Strip (`CalendarView.tsx`)

**Current:** Tiny letter + dot pairs as scroll position indicators.

**Redesigned:** Replaced with the same mini completion ring chips as the week nav bottom row — consistent visual language. Each chip shows the day letter + a mini SVG ring. Active chip has `bg-white/10` background. Tapping scrolls to that day (same behavior as now).

---

### 7. Animations

- **Page load:** Staggered entry — nav header (`0ms`), day chips cascade (`0ms → 180ms`, 25ms per chip), day cards cascade (`30ms` delay per card, max 180ms)
- **Week navigation:** Keep existing `calendar-animate-slide-in-left/right`
- **Month navigation:** Keep existing `calendar-animate-slide-in-up/down`
- **Filter switch:** Sliding active segment transition (`transition-transform duration-200`)

---

## Files to Change

| File | Change |
|------|--------|
| `src/components/calendar/WeekNavigation.tsx` | Two-row layout with day chip completion rings |
| `src/components/calendar/DayCard.tsx` | Radial arc progress, remove count badge, today glow |
| `src/components/calendar/TaskItem.tsx` | Left-border priority, remove flag icon/label, circular checkbox |
| `src/components/calendar/FilterBar.tsx` | Segmented sliding pill control |
| `src/components/calendar/MonthView.tsx` | Heat-map cell backgrounds, remove dots, taller cells |
| `src/components/calendar/CalendarView.tsx` | Pass weekData to WeekNavigation; redesign mobile day indicator strip; remove glass-subtle wrapper around FilterBar |

---

## Constraints

- All `<input>` elements keep `text-base` minimum (iOS Safari zoom rule)
- All existing functionality preserved: week/month toggle, filter, completion toggle, quantitative logging, month day click → week scroll
- No new dependencies
- No new CSS keyframe animations — reuse existing `calendar-animate-*` classes and add only the filter pill transition via inline Tailwind
