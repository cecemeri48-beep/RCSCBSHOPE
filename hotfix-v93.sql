-- RCS.CBS HOPE hotfix v93
-- Run this entire file once in Supabase SQL Editor.

create or replace function public.verify_member(p_key text)
returns table (
  public_token uuid,
  registration_number text,
  name text,
  parent_name text,
  cohort_name text,
  cohort_year integer,
  blood_type text,
  photo_path text,
  photo_url text,
  status text
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    m.public_token,
    m.registration_number,
    m.name,
    m.parent_name,
    m.cohort_name,
    m.cohort_year,
    m.blood_type::text,
    m.photo_path,
    m.photo_url,
    m.status::text
  from public.members as m
  where m.status = 'Aktif'
    and length(trim(coalesce(p_key, ''))) between 6 and 100
    and (
      lower(m.public_token::text) = lower(trim(p_key))
      or upper(m.registration_number) = upper(trim(p_key))
      or (
        trim(p_key) ~ '^[A-Za-z0-9]{6,12}$'
        and upper(regexp_replace(m.registration_number, '^.*[·•|][[:space:]]*', '')) = upper(trim(p_key))
      )
    )
  limit 1;
$$;

revoke all on function public.verify_member(text) from public;
grant execute on function public.verify_member(text) to anon, authenticated;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'member-photos',
  'member-photos',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update set
  name = excluded.name,
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "public can upload member photos" on storage.objects;
create policy "public can upload member photos"
on storage.objects
for insert
to anon, authenticated
with check (
  bucket_id = 'member-photos'
  and (storage.foldername(name))[1] is null
  and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp')
);

drop policy if exists "public can view member photos" on storage.objects;
create policy "public can view member photos"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'member-photos');

-- Ask PostgREST to discover verify_member immediately.
notify pgrst, 'reload schema';
