create table if not exists public.site_content (
  id boolean primary key default true check (id),
  projects jsonb not null default '[]'::jsonb,
  settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

insert into public.site_content (id, projects, settings)
values (
  true,
  '[{"id":"1","title":"Nepal Disaster Archive","category":"Disaster History","mediaType":"Documentaries & Timelines","description":"Documenting Nepal''s historical disaster events through structured visual timelines and editorial archives.","link":"#"}]'::jsonb,
  '{"siteName":"AcademiX","logoHighlight":"Digital","subtitle":"Technology ventures","footerText":"© 2026 AcademiX Digital. All rights reserved."}'::jsonb
)
on conflict (id) do nothing;

create table if not exists public.site_admins (
  user_id uuid primary key references auth.users (id) on delete cascade
);

alter table public.site_admins enable row level security;

drop policy if exists "Admins can read their own access" on public.site_admins;
create policy "Admins can read their own access"
  on public.site_admins for select
  to authenticated
  using (auth.uid() = user_id);

grant select on public.site_admins to authenticated;

alter table public.site_content enable row level security;

drop policy if exists "Anyone can read site content" on public.site_content;
create policy "Anyone can read site content"
  on public.site_content for select
  to anon, authenticated
  using (true);

drop policy if exists "Site admins can update site content" on public.site_content;
create policy "Site admins can update site content"
  on public.site_content for update
  to authenticated
  using (exists (select 1 from public.site_admins where user_id = auth.uid()))
  with check (exists (select 1 from public.site_admins where user_id = auth.uid()));

grant select on public.site_content to anon, authenticated;
grant update on public.site_content to authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'site_content'
  ) then
    alter publication supabase_realtime add table public.site_content;
  end if;
end
$$;
