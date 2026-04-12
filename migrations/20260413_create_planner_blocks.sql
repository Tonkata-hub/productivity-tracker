create extension if not exists pgcrypto;

create table if not exists public.planner_blocks (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  start_minutes integer not null,
  duration_minutes integer not null,
  title text not null,
  task_id uuid null references public.tasks(id) on delete set null,
  task_type text null,
  completion_entry_id uuid null references public.task_completions(id) on delete set null,
  is_completed boolean not null default false,
  created_at timestamptz not null default now(),
  constraint planner_blocks_start_minutes_chk check (start_minutes >= 0 and start_minutes < 1440),
  constraint planner_blocks_duration_minutes_chk check (duration_minutes > 0),
  constraint planner_blocks_task_type_chk check (task_type in ('daily', 'one_time') or task_type is null)
);

alter table public.planner_blocks
  add column if not exists completion_entry_id uuid null references public.task_completions(id) on delete set null;

create index if not exists planner_blocks_date_start_idx
  on public.planner_blocks (date, start_minutes);

create index if not exists planner_blocks_task_date_idx
  on public.planner_blocks (task_id, date);
