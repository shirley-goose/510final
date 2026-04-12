-- Pet2Companion: upload metadata storage

create table if not exists public.pet_uploads (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  storage_path text not null,
  original_name text not null,
  mime_type text not null,
  size_bytes integer not null,
  created_at timestamptz default now()
);

alter table public.pet_uploads enable row level security;

create policy "Users can read their uploads" on public.pet_uploads
for select
using (auth.uid() = user_id);

create policy "Users can insert their uploads" on public.pet_uploads
for insert
with check (auth.uid() = user_id);

-- Storage bucket for raw uploads
insert into storage.buckets (id, name, public)
values ('pet-uploads', 'pet-uploads', false)
on conflict (id) do nothing;

-- Storage policies (Supabase Storage is in storage.objects)
create policy "Users can upload to their folder" on storage.objects
for insert
with check (
  bucket_id = 'pet-uploads'
  and auth.uid()::text = (storage.foldername(name))[2]
);

create policy "Users can read their folder" on storage.objects
for select
using (
  bucket_id = 'pet-uploads'
  and auth.uid()::text = (storage.foldername(name))[2]
);
