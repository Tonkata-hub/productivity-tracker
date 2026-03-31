# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev      # Start dev server (localhost:3000)
npm run build    # Production build
npm run lint     # Run ESLint
```

No test suite is configured.

## Architecture

A weekly/monthly task management app built with Next.js App Router, React 19, Supabase, and TailwindCSS 4.

**Pages** (`src/app/`):
- `/` — Home (minimal)
- `/calendar` — Main view; hosts `CalendarView` which owns all calendar state
- `/add-task` — Task creation form

**Key components** (`src/components/calendar/`):
- `CalendarView.tsx` — Central component; manages week/month offset state, fetches tasks and completions from Supabase, handles optimistic completion toggles
- `WeekNavigation.tsx` — Prev/next controls and week/month view toggle
- `MonthView.tsx` — Month grid with per-day task dot indicators
- `DayCard.tsx` — Single day card with task list
- `TaskItem.tsx` — Individual task row with completion checkbox

**Data layer** (`src/lib/`):
- `supabase.ts` — Supabase client (env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
- `types.ts` — `Task`, `TaskCompletion`, `DayTasks` interfaces
- `calendar-utils.ts` — Week/month date calculations (Monday-based ISO weeks)

**Database tables**:
- `tasks` — `id, title, type ('daily'|'one_time'), priority, due_date, is_completed, created_at`
- `task_completions` — `id, task_id, date (ISO), completed_at` — tracks per-day completion of daily tasks

**State pattern**: All state lives in `CalendarView`. Child components receive data and callbacks as props. Optimistic updates are used for completion toggles with rollback on error.

**UI**: Glassmorphism dark theme with a mars-red accent. Responsive via mobile snap-scroll → tablet 2-col → desktop 7-col grid. Custom slide animations for view transitions (`calendar-animate-slide-in-*` in `globals.css`).

**Mock data**: Set `NEXT_PUBLIC_USE_MOCK_DATA=true` in `.env.local` to bypass Supabase and use `src/lib/mock-data.ts`.
