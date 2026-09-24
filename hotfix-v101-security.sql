-- RCS.CBS HOPE hotfix v101 — security hardening
-- Jalankan sekali setelah schema utama, hotfix-v97-competencies.sql,
-- dan hotfix-v100-journey-map.sql.

begin;

create or replace function public.assign_registration_number()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_year integer;
  v_number integer;
begin
  -- Jangan percaya field istimewa dari client anonim.
  new.created_at := now();
  new.updated_at := now();
  new.status := 'Menunggu Verifikasi';
  new.public_token := gen_random_uuid();
  new.registration_number := null;
  -- v97+ adds these admin-only fields; reset them on public inserts.
  new.competencies := array[]::text[];
  new.competencies_updated_at := null;
  new.competencies_verified_by := null;
  v_year := extract(year from new.created_at)::integer;

  insert into public.registration_counters(year, last_number)
    values (v_year, 1)
    on conflict (year) do update
      set last_number = public.registration_counters.last_number + 1
    returning last_number into v_number;

  new.registration_number := lpad(v_number::text, 3, '0') || '/RCSCBS/HOPE/' || v_year::text;
  return new;
end;
$$;

drop trigger if exists members_registration_number on public.members;
create trigger members_registration_number
before insert on public.members
for each row execute function public.assign_registration_number();

drop policy if exists "public can submit member registration" on public.members;
create policy "public can submit member registration"
on public.members for insert to anon, authenticated
with check (
  consent = true
  and status = 'Menunggu Verifikasi'
  and registration_number is not null
);

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
on storage.objects for insert to anon, authenticated
with check (
  bucket_id = 'member-photos'
  and (storage.foldername(name))[1] is null
  and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp')
);

commit;
notify pgrst, 'reload schema';