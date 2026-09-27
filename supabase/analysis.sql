-- Clocket AI: repository_analysis table
-- Idempotent — safe to run multiple times.

create table if not exists public.repository_analysis (
  id                uuid        primary key default gen_random_uuid(),
  repository_id     uuid        not null references public.repositories(id) on delete cascade,
  architecture      jsonb       not null default '{}'::jsonb,
  technology_stack  jsonb       not null default '{}'::jsonb,
  dependencies      jsonb       not null default '{}'::jsonb,
  configuration     jsonb       not null default '{}'::jsonb,
  apis              jsonb       not null default '[]'::jsonb,
  database_info     jsonb       not null default '{}'::jsonb,
  setup_guide       jsonb       not null default '[]'::jsonb,
  setup_issues      jsonb       not null default '[]'::jsonb,
  onboarding_plan   text        not null default '',
  directory_structure jsonb     not null default '[]'::jsonb,
  important_files   jsonb       not null default '[]'::jsonb,
  entry_points      jsonb       not null default '{}'::jsonb,
  generated_at      timestamptz not null default now(),
  constraint repository_analysis_repo_unique unique (repository_id)
);

create index if not exists repository_analysis_repo_id_idx on public.repository_analysis (repository_id);

alter table public.repository_analysis enable row level security;

-- Access via repository ownership — join to repositories which has RLS
create policy "Users can read own repository analysis"
on public.repository_analysis for select
to authenticated
using (
  exists (
    select 1 from public.repositories r
    where r.id = repository_id
      and r.user_id = (select auth.uid())
  )
);

create policy "Service role can insert repository analysis"
on public.repository_analysis for insert
to service_role
with check (true);

create policy "Service role can update repository analysis"
on public.repository_analysis for update
to service_role
using (true);
