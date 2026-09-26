-- RAG documents with pgvector similarity search.
-- Extended for DevOnboard AI: added repository_id, file_path, language, chunk_type, commit_sha.
-- Idempotent — safe to run multiple times.

create extension if not exists vector;

create table if not exists public.rag_documents (
  id             text        primary key,
  user_id        uuid        not null references auth.users(id) on delete cascade,
  repository_id  uuid        references public.repositories(id) on delete cascade,
  source         text        not null,
  file_path      text,
  content        text        not null,
  chunk_id       integer     not null,
  language       text,
  chunk_type     text,
  commit_sha     text,
  embedding      vector(384) not null,
  created_at     timestamptz not null default now(),
  constraint rag_documents_user_id_source_chunk_id_key
    unique (user_id, source, chunk_id)
);

create index if not exists rag_documents_user_id_idx
  on public.rag_documents (user_id);

create index if not exists rag_documents_repo_id_idx
  on public.rag_documents (repository_id)
  where repository_id is not null;

create index if not exists rag_documents_embedding_idx
  on public.rag_documents
  using hnsw (embedding vector_cosine_ops);

alter table public.rag_documents enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'rag_documents' and policyname = 'Users can read own rag documents') then
    create policy "Users can read own rag documents"
    on public.rag_documents for select
    to authenticated
    using ((select auth.uid()) = user_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'rag_documents' and policyname = 'Users can create own rag documents') then
    create policy "Users can create own rag documents"
    on public.rag_documents for insert
    to authenticated
    with check ((select auth.uid()) = user_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'rag_documents' and policyname = 'Users can update own rag documents') then
    create policy "Users can update own rag documents"
    on public.rag_documents for update
    to authenticated
    using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'rag_documents' and policyname = 'Users can delete own rag documents') then
    create policy "Users can delete own rag documents"
    on public.rag_documents for delete
    to authenticated
    using ((select auth.uid()) = user_id);
  end if;
end $$;

-- Service role can upsert rag_documents (used by backend analysis pipeline)
do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'rag_documents' and policyname = 'Service role can manage rag documents') then
    create policy "Service role can manage rag documents"
    on public.rag_documents for all
    to service_role
    using (true)
    with check (true);
  end if;
end $$;

-- -------------------------------------------------------
-- RPC: match_rag_documents
-- Filters by user_id (required) and optional repository_id.
-- -------------------------------------------------------
create or replace function public.match_rag_documents(
  query_embedding    vector,
  match_user_id      uuid,
  match_count        integer default 4,
  match_repository_id uuid    default null
)
returns table(
  id           text,
  source       text,
  file_path    text,
  content      text,
  chunk_id     integer,
  language     text,
  chunk_type   text,
  similarity   real
)
language sql
stable
set search_path = public, extensions
as $$
  select
    d.id,
    d.source,
    d.file_path,
    d.content,
    d.chunk_id,
    d.language,
    d.chunk_type,
    (1 - (d.embedding <=> query_embedding))::real as similarity
  from public.rag_documents as d
  where d.user_id = match_user_id
    and (match_repository_id is null or d.repository_id = match_repository_id)
  order by d.embedding <=> query_embedding
  limit match_count;
$$;

-- -------------------------------------------------------
-- RPC: match_documents (backwards-compatible wrapper)
-- -------------------------------------------------------
create or replace function public.match_documents(
  query_embedding vector,
  match_count     integer  default 5,
  filter_user     uuid     default null
)
returns table(id text, source text, content text, similarity double precision)
language sql
stable
set search_path = public, extensions
as $$
  select
    d.id,
    d.source,
    d.content,
    1 - (d.embedding <=> query_embedding) as similarity
  from public.rag_documents as d
  where filter_user is null or d.user_id = filter_user
  order by d.embedding <=> query_embedding
  limit match_count;
$$;
