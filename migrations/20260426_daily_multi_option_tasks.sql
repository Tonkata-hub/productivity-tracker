alter table public.tasks
  add column if not exists daily_mode text not null default 'single',
  add column if not exists daily_options jsonb not null default '[]'::jsonb;

alter table public.tasks
  drop constraint if exists tasks_daily_mode_chk;

alter table public.tasks
  add constraint tasks_daily_mode_chk
  check (daily_mode in ('single', 'multi_option'));

alter table public.tasks
  drop constraint if exists tasks_daily_options_type_chk;

alter table public.tasks
  add constraint tasks_daily_options_type_chk
  check (jsonb_typeof(daily_options) = 'array');

alter table public.task_completions
  add column if not exists daily_option_index integer null;

alter table public.task_completions
  drop constraint if exists task_completions_daily_option_index_chk;

alter table public.task_completions
  add constraint task_completions_daily_option_index_chk
  check (daily_option_index is null or daily_option_index >= 0);

create unique index if not exists task_completions_daily_single_unique_idx
  on public.task_completions (task_id, date)
  where value is null and daily_option_index is null;

create unique index if not exists task_completions_daily_option_unique_idx
  on public.task_completions (task_id, date, daily_option_index)
  where value is null and daily_option_index is not null;
