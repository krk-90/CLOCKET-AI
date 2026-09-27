-- Clocket AI: onboarding_tasks and onboarding_progress tables
-- Idempotent — safe to run multiple times.

create table if not exists public.onboarding_tasks (
  id                  uuid        primary key default gen_random_uuid(),
  repository_id       uuid        not null references public.repositories(id) on delete cascade,
  title               text        not null,
  description         text        not null default '',
  difficulty          text        not null default 'beginner'
                      check (difficulty in ('beginner', 'intermediate', 'advanced')),
  estimated_effort    text        not null default '',
  skills              text[]      not null default '{}',
  files_involved      text[]      not null default '{}',
  reason              text        not null default '',
  acceptance_criteria text[]      not null default '{}',
  order_index         integer     not null default 0,
  created_at          timestamptz not null default now()
);

create index if not exists onboarding_tasks_repo_id_idx        on public.onboarding_tasks (repository_id);
create index if not exists onboarding_tasks_repo_difficulty_idx on public.onboarding_tasks (repository_id, difficulty);

alter table public.onboarding_tasks enable row level security;

create policy "Users can read own onboarding tasks"
on public.onboarding_tasks for select
to authenticated
using (
  exists (
    select 1 from public.repositories r
    where r.id = repository_id
      and r.user_id = (select auth.uid())
  )
);

create policy "Service role can manage onboarding tasks"
on public.onboarding_tasks for all
to service_role
using (true)
with check (true);


-- -------------------------------------------------------
-- onboarding_progress: per-user per-task progress tracking
-- -------------------------------------------------------

create table if not exists public.onboarding_progress (
  id            uuid        primary key default gen_random_uuid(),
  user_id       uuid        not null references auth.users(id) on delete cascade,
  repository_id uuid        not null references public.repositories(id) on delete cascade,
  task_id       uuid        not null references public.onboarding_tasks(id) on delete cascade,
  status        text        not null default 'todo'
                check (status in ('todo', 'in_progress', 'done', 'skipped')),
  notes         text        not null default '',
  updated_at    timestamptz not null default now(),
  constraint onboarding_progress_user_task_key unique (user_id, task_id)
);

create index if not exists onboarding_progress_user_repo_idx on public.onboarding_progress (user_id, repository_id);
create index if not exists onboarding_progress_task_idx      on public.onboarding_progress (task_id);

drop trigger if exists onboarding_progress_set_updated_at on public.onboarding_progress;
create trigger onboarding_progress_set_updated_at
before update on public.onboarding_progress
for each row execute function public.set_updated_at();

alter table public.onboarding_progress enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'onboarding_progress' and policyname = 'Users can read own progress') then
    create policy "Users can read own progress"
    on public.onboarding_progress for select
    to authenticated
    using ((select auth.uid()) = user_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'onboarding_progress' and policyname = 'Users can create own progress') then
    create policy "Users can create own progress"
    on public.onboarding_progress for insert
    to authenticated
    with check ((select auth.uid()) = user_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'onboarding_progress' and policyname = 'Users can update own progress') then
    create policy "Users can update own progress"
    on public.onboarding_progress for update
    to authenticated
    using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);
  end if;
end $$;
