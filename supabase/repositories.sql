-- Clocket AI: repositories table
-- Idempotent — safe to run multiple times.

create table if not exists public.repositories (
  id              uuid        primary key default gen_random_uuid(),
  user_id         uuid        not null references auth.users(id) on delete cascade,
  github_url      text        not null,
  owner           text        not null default '',
  name            text        not null default '',
  default_branch  text        not null default 'main',
  commit_sha      text,
  description     text,
  language        text,
  stars           integer     default 0,
  status          text        not null default 'pending'
                  check (status in ('pending', 'analyzing', 'ready', 'failed')),
  error_message   text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint repositories_user_url_key unique (user_id, github_url)
);

create index if not exists repositories_user_id_idx    on public.repositories (user_id);
create index if not exists repositories_user_status_idx on public.repositories (user_id, status);

-- auto-update updated_at
drop trigger if exists repositories_set_updated_at on public.repositories;
create trigger repositories_set_updated_at
before update on public.repositories
for each row execute function public.set_updated_at();

alter table public.repositories enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'repositories' and policyname = 'Users can read own repositories') then
    create policy "Users can read own repositories"
    on public.repositories for select
    to authenticated
    using ((select auth.uid()) = user_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'repositories' and policyname = 'Users can create own repositories') then
    create policy "Users can create own repositories"
    on public.repositories for insert
    to authenticated
    with check ((select auth.uid()) = user_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'repositories' and policyname = 'Users can update own repositories') then
    create policy "Users can update own repositories"
    on public.repositories for update
    to authenticated
    using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'repositories' and policyname = 'Users can delete own repositories') then
    create policy "Users can delete own repositories"
    on public.repositories for delete
    to authenticated
    using ((select auth.uid()) = user_id);
  end if;
end $$;
