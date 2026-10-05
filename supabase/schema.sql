create table if not exists public.site_content (
  id boolean primary key default true check (id),
  projects jsonb not null default '[]'::jsonb,
  settings jsonb not null default '{}'::jsonb,
  pages jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.site_content
  add column if not exists pages jsonb not null default '{}'::jsonb;

insert into public.site_content (id, projects, settings, pages)
values (
  true,
  '[{"id":"1","title":"Nepal Disaster Archive","category":"Disaster History","mediaType":"Documentaries & Timelines","description":"Documenting Nepal''s historical disaster events through structured visual timelines and editorial archives.","link":"#"}]'::jsonb,
  '{"siteName":"AcademiX","logoHighlight":"Digital","subtitle":"Technology ventures","footerText":"© 2026 AcademiX Digital. All rights reserved."}'::jsonb,
  '{}'::jsonb
)
on conflict (id) do nothing;

update public.site_content
set pages = '{
  "about": {
    "eyebrow": "Institutional Overview",
    "title": "About AcademiX Digital",
    "description": "An independent digital venture and public-interest technology initiative, dedicated to scalable web architectures and digital world.",
    "sections": [
      {"id":"about-mission","title":"","body":"AcademiX Digital was founded to bridge the critical gap between rigorous engineering and open civic infrastructure. Operating at the intersection of software development and public-interest technology, our venture focuses on building resilient web systems, transparent compliance registries, and digital history archives.\n\nOur core mission is rooted in regional digital preservation and civic accountability. Whether it is documenting historical timelines or architecting platforms for municipal data analysis, we aim to build tools that empower communities and public institutions.","display":"prose","items":[]},
      {"id":"about-pillars","title":"","body":"","display":"cards","items":[
        {"id":"civic-technology","title":"Civic Technology","body":"Building software solutions for municipal reporting, governance performance tracking, and public compliance monitoring.","label":"","link":""},
        {"id":"public-archives","title":"Public Archives","body":"Documenting regional history and significant public-interest records through structured visual timelines and editorial archives.","label":"","link":""}
      ]}
    ]
  },
  "ventures": {
    "eyebrow":"Our ecosystem",
    "title":"Ventures built for public value",
    "description":"Independent products and initiatives exploring civic technology, digital preservation, and practical software for organizations.",
    "sections":[{"id":"venture-list","title":"","body":"","display":"cards","items":[
      {"id":"nepal-disaster-archive","title":"Nepal Disaster Archive","body":"A public-interest archive documenting Nepal’s historical disaster events through structured records, timelines, and editorial context.","label":"Active","link":""},
      {"id":"civic-governance-trackers","title":"Civic Governance Trackers","body":"An initiative exploring transparent tools for public reporting, governance performance, and civic accountability.","label":"Planning phase","link":""},
      {"id":"small-business-operating-systems","title":"Small-Business Operating Systems","body":"Practical digital systems to help small businesses organize workflows and make day-to-day operations easier to manage.","label":"In development","link":""}
    ]}]
  },
  "open-source": {
    "eyebrow":"Built in the open",
    "title":"Open Source & Code",
    "description":"We value reusable tools, clear documentation, and community collaboration. Public repositories and contribution guidance will be listed here as they are released.",
    "sections":[
      {"id":"open-source-projects","title":"","body":"","display":"cards","items":[{"id":"public-repositories","title":"Public repositories","body":"Browse the AcademiX Digital public profile for repositories and code updates.","label":"Repository listing coming soon","link":"https://github.com/academiXdigitall"}]},
      {"id":"open-source-technologies","title":"Technology","body":"Current project work includes modern web technologies such as:","display":"chips","items":[
        {"id":"react","title":"React","body":"","label":"","link":""},
        {"id":"typescript","title":"TypeScript","body":"","label":"","link":""},
        {"id":"nodejs","title":"Node.js","body":"","label":"","link":""}
      ]},
      {"id":"contributing","title":"Contributing","body":"When repositories open, each project will include setup instructions, contribution guidelines, and issue-reporting details in its README.","display":"prose","items":[]}
    ]
  },
  "contact": {
    "eyebrow":"Start a conversation",
    "title":"Contact & Inquiries",
    "description":"We welcome conversations about institutional partnerships, media inquiries, and developer collaboration.",
    "sections":[{"id":"contact-information","title":"","body":"","display":"cards","items":[{"id":"email-social","title":"Email & social","body":"For developer updates and public code, find AcademiX Digital on GitHub.","label":"GitHub: academiXdigitall ↗","link":"https://github.com/academiXdigitall"}]}]
  }
}'::jsonb
where pages = '{}'::jsonb;

update public.site_content AS content
set pages = jsonb_set(
  content.pages,
  '{about,sections}',
  (
    select jsonb_agg(
      jsonb_set(
        section.value,
        '{items}',
        coalesce(
          (
            select jsonb_agg(item.value order by item.ordinality)
            from jsonb_array_elements(coalesce(section.value->'items', '[]'::jsonb))
              with ordinality as item(value, ordinality)
            where item.value->>'id' <> 'full-stack-dev'
          ),
          '[]'::jsonb
        )
      )
      || case
        when section.value->>'id' = 'about-mission' then jsonb_build_object(
          'body',
          regexp_replace(
            section.value->>'body',
            'full-stack[[:space:]]+software development',
            'software development',
            'gi'
          )
        )
        else '{}'::jsonb
      end
      order by section.ordinality
    )
    from jsonb_array_elements(content.pages #> '{about,sections}')
      with ordinality as section(value, ordinality)
  ),
  true
)
where jsonb_typeof(content.pages #> '{about,sections}') = 'array'
  and (
    exists (
      select 1
      from jsonb_array_elements(content.pages #> '{about,sections}') as section(value)
      cross join lateral jsonb_array_elements(coalesce(section.value->'items', '[]'::jsonb)) as item(value)
      where item.value->>'id' = 'full-stack-dev'
    )
    or exists (
      select 1
      from jsonb_array_elements(content.pages #> '{about,sections}') as section(value)
      where section.value->>'body' ~* 'full-stack[[:space:]]+software development'
    )
  );

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
