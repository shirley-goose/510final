-- Companions + model storage for AI 3D pipeline

do $$ begin
  create type public.companion_personality as enum ('active', 'calm', 'playful');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.companion_generation_status as enum ('pending', 'success', 'failed');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.companions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null default 'My companion',
  personality public.companion_personality not null default 'calm',
  model_url text,
  thumbnail_url text,
  is_active boolean not null default false,
  status public.companion_generation_status not null default 'pending',
  api_task_id text,
  generation_error text,
  generation_started_at timestamptz,
  source_upload_ids uuid[],
  created_at timestamptz default now()
);

create index if not exists companions_user_id_idx on public.companions (user_id);
create index if not exists companions_status_idx on public.companions (status);

alter table public.companions enable row level security;

drop policy if exists "Users can read own companions" on public.companions;
create policy "Users can read own companions"
  on public.companions
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own companions" on public.companions;
create policy "Users can insert own companions"
  on public.companions
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own companions" on public.companions;
create policy "Users can update own companions"
  on public.companions
  for update
  using (auth.uid() = user_id);

drop policy if exists "Users can delete own companions" on public.companions;
create policy "Users can delete own companions"
  on public.companions
  for delete
  using (auth.uid() = user_id);

-- Public bucket so model_url / thumbnail_url are stable browser-accessible URLs
insert into storage.buckets (id, name, public)
values ('companion-models', 'companion-models', true)
on conflict (id) do update set public = excluded.public;

-- Only service role (server) uploads; users read via public URLs
comment on column public.companions.model_url is 'Public Supabase Storage URL for the generated .glb';
comment on column public.companions.thumbnail_url is 'Public preview image URL';
