# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Tooling note

The project path contains a space (`Personal Projects`). Never use `Bash(grep/find)` — always use the `Grep` and `Glob` tools instead. Bash commands with escaped whitespace (`Personal\ Projects`) trigger a safety prompt regardless of the allow list.

## Commands

```bash
npm run dev      # Start dev server (localhost:3000)
npm run build    # Production build
npm run lint     # Run ESLint
npm run format   # Prettier format (run before committing)
```

No test suite is configured.

## Architecture

A personal productivity app (task tracking + gym logging) built with Next.js App Router, React 19, Supabase, and TailwindCSS 4.

### Pages (`src/app/`)

- `/` — Home dashboard: today's task summary, weekly streak rings, stat cards, quick actions (coming soon)
- `/calendar` — Main calendar view; hosts `CalendarView` which owns all calendar state
- `/add-task` — Task creation form (title, type, priority, optional target/unit, optional due date)
- `/gym` — Gym tracker: overview/history/calendar tabs, active workout session, start-workout bottom sheet
- `/manage-tasks` — List all tasks with filter (all/daily/one-time) and delete

### Navigation (`src/components/Navbar.tsx`)

Single `NAV_ITEMS` array drives both mobile and desktop. Desktop: fixed left sidebar (w-56). Mobile: fixed bottom tab bar with FAB for Add Task. Both use the `.navbar-glass` CSS utility.

### Calendar components (`src/components/calendar/`)

- `CalendarView.tsx` — Central component; manages week/month offset, fetches tasks and completions, handles optimistic completion toggles
- `WeekNavigation.tsx` — Prev/next controls and week/month view toggle
- `MonthView.tsx` — Month grid with per-day task dot indicators
- `DayCard.tsx` — Single day card with task list
- `TaskItem.tsx` — Individual task row; supports completion toggle and inline value logging for quantitative tasks
- `FilterBar.tsx` — Filter tasks by type/priority on the calendar view

### Gym components (`src/components/gym/`)

- `WorkoutSession.tsx` — Active workout screen; sticky header with name/timer/stats, exercise list, add-exercise input with autocomplete
- `ExerciseCard.tsx` — Collapsible card per exercise; shows sets, last-session reference, add-set form (weight + reps)
- `WorkoutHistory.tsx` — Paginated list of past workouts with delete
- `WorkoutCalendar.tsx` — Monthly calendar view of workout days
- `WorkoutSummary.tsx` — End-of-workout summary screen shown before confirming finish

### Data layer (`src/lib/`)

- `supabase.ts` — Supabase client (env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
- `types.ts` — `Task`, `TaskCompletion`, `DayTasks`, `TaskWithStatus`, `Workout`, `WorkoutWithExercises`, `WorkoutExercise`, `ExerciseSet`, `Exercise`, `LastExercisePerformance` interfaces
- `calendar-utils.ts` — Week/month date calculations (Monday-based ISO weeks)
- `gym-utils.ts` — `formatTime`, `formatDuration` helpers for workout timer display
- `utils.ts` — `cn()` helper (clsx + tailwind-merge)
- `mock-data.ts` — Mock tasks; activated by `NEXT_PUBLIC_USE_MOCK_DATA=true` in `.env.local`

### Database tables

**Tasks:**
- `tasks` — `id, title, type ('daily'|'one_time'), priority, due_date, target_value, unit, is_completed, completed_at, created_at`
- `task_completions` — `id, task_id, date (ISO), value, completed_at` — per-day completion of daily tasks; `value` stores logged amounts for quantitative tasks

**Gym:**
- `workouts` — `id, name, started_at, ended_at, duration_seconds, total_sets, total_volume_kg`
- `workout_exercises` — `id, workout_id, exercise_id, exercise_order`
- `exercise_sets` — `id, workout_exercise_id, set_order, reps, weight_kg`
- `exercises` — `id, name, name_lower` — global exercise library; `name_lower` used for case-insensitive search

## UI & Styling

**Theme:** Glassmorphism dark theme. Background `#0a0b0f`, accent `#ff3b3b` (mars-red). Always dark — `<html class="dark">` set in `layout.tsx`.

**Key CSS utilities** (`src/app/globals.css`):
- `.glass` — Standard glassmorphism card (blur 20px)
- `.glass-subtle` — Lighter blur (12px)
- `.glass-strong` — Heavy blur (40px + saturate) for overlays
- `.navbar-glass` — Navbar frosted effect: `color-mix(in oklab, var(--color-background) 50%, transparent)` + blur 12px. Includes an `rgba(10, 11, 15, 0.5)` fallback line above it because Tailwind v4's dev server can inject CSS variables after component styles, causing `color-mix` to evaluate before `--color-background` resolves.
- `calendar-animate-slide-in-*` — Entry animations for page elements

**Mobile:** All `<input>`, `<textarea>`, `<select>` elements must use `text-base` (16px) minimum. Safari on iOS auto-zooms the viewport for any focused form control smaller than 16px. This applies to every input in the codebase — do not use `text-sm` or smaller on form controls.

**State pattern:** All state lives in the top-level page component. Child components receive data and callbacks as props. Optimistic updates used for completion toggles with rollback on error.

**Responsive layout:** Mobile snap-scroll → tablet 2-col → desktop 7-col grid on calendar. Pages are `max-w-lg` centered on mobile, `max-w-6xl` on home.
