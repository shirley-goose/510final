-- Storage policies for companion-models bucket (server uploads/deletes via service role;
-- public read via bucket public flag). Helps when storage RLS blocks remove on some projects.

drop policy if exists "Public read companion models" on storage.objects;
create policy "Public read companion models"
  on storage.objects
  for select
  using (bucket_id = 'companion-models');

drop policy if exists "Service role manage companion models" on storage.objects;
create policy "Service role manage companion models"
  on storage.objects
  for all
  to service_role
  using (bucket_id = 'companion-models')
  with check (bucket_id = 'companion-models');
