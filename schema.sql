-- RCS.CBS HOPE — Supabase schema
-- Jalankan di Supabase SQL Editor sebelum mengisi config.js.

create extension if not exists pgcrypto;

do $$ begin
  create type public.member_status as enum ('Menunggu Verifikasi','Perlu Perbaikan','Aktif','Nonaktif');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.blood_type as enum ('A','B','AB','O','Tidak tahu');
exception when duplicate_object then null; end $$;

create table if not exists public.registration_counters (
  year integer primary key,
  last_number integer not null default 0
);

create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  public_token uuid not null unique default gen_random_uuid(),
  registration_number text unique,
  name text not null,
  parent_name text not null,
  cohort_name text,
  cohort_year integer check (cohort_year between 1950 and 2100),
  blood_type public.blood_type not null,
  parent_phone text not null,
  parent_address text,
  photo_path text,
  photo_url text,
  consent boolean not null default false,
  status public.member_status not null default 'Menunggu Verifikasi',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.members add column if not exists cohort_name text;
alter table public.members alter column cohort_year drop not null;
alter table public.members add column if not exists parent_phone text;
alter table public.members add column if not exists parent_address text;

create or replace function public.assign_registration_number()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_year integer := extract(year from coalesce(new.created_at, now()))::integer;
  v_number integer;
begin
  -- Never trust privileged fields supplied by a public registration client.
  new.status := 'Menunggu Verifikasi';
  new.public_token := gen_random_uuid();
  new.registration_number := null;
  if new.registration_number is null or new.registration_number = '' then
    insert into public.registration_counters(year, last_number)
      values (v_year, 1)
      on conflict (year) do update set last_number = registration_counters.last_number + 1
      returning last_number into v_number;
    new.registration_number := lpad(v_number::text, 3, '0') || '/RCSCBS/HOPE/' || v_year::text;
  end if;
  return new;
end;
$$;

drop trigger if exists members_registration_number on public.members;
create trigger members_registration_number before insert on public.members
for each row execute function public.assign_registration_number();

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;
drop trigger if exists members_updated_at on public.members;
create trigger members_updated_at before update on public.members
for each row execute function public.set_updated_at();

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.admin_users where user_id = auth.uid());
$$;

alter table public.members enable row level security;
alter table public.admin_users enable row level security;

drop policy if exists "public can submit member registration" on public.members;
create policy "public can submit member registration" on public.members for insert to anon, authenticated
  with check (consent = true);

drop policy if exists "admins can read members" on public.members;
create policy "admins can read members" on public.members for select to authenticated
  using (public.is_admin());

drop policy if exists "admins can update members" on public.members;
create policy "admins can update members" on public.members for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admins can delete members" on public.members;
create policy "admins can delete members" on public.members for delete to authenticated
  using (public.is_admin());

drop policy if exists "admins can read admin list" on public.admin_users;
create policy "admins can read admin list" on public.admin_users for select to authenticated
  using (public.is_admin());

-- View verifikasi hanya memuat informasi dasar anggota Aktif.
drop view if exists public.member_verification;
create view public.member_verification with (security_invoker = true) as
  select public_token, registration_number, name, parent_name, cohort_name, cohort_year, blood_type::text as blood_type, photo_path, photo_url, status::text as status
  from public.members where status = 'Aktif';
revoke all on public.member_verification from anon, authenticated;

-- Public verification only returns one active member for an exact token, full
-- registration number, or the final generated card code. It cannot list rows.
create or replace function public.verify_member(p_key text)
returns table (
  public_token uuid, registration_number text, name text, parent_name text,
  cohort_name text, cohort_year integer, blood_type text, photo_path text,
  photo_url text, status text
)
language sql stable security definer set search_path = public, pg_temp as $$
  select m.public_token, m.registration_number, m.name, m.parent_name,
         m.cohort_name, m.cohort_year, m.blood_type::text, m.photo_path,
         m.photo_url, m.status::text
  from public.members m
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

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'member-photos',
  'member-photos',
  true,
  5242880,
  array['image/jpeg','image/png','image/webp']::text[]
)
on conflict (id) do update set
  name = excluded.name,
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "public can upload member photos" on storage.objects;
create policy "public can upload member photos" on storage.objects for insert to anon, authenticated
  with check (
    bucket_id = 'member-photos'
    and (storage.foldername(name))[1] is null
    and lower(storage.extension(name)) in ('jpg','jpeg','png','webp')
  );

drop policy if exists "public can view member photos" on storage.objects;
create policy "public can view member photos" on storage.objects for select to anon, authenticated
  using (bucket_id = 'member-photos');

-- Setelah membuat akun pengurus di Authentication > Users, jalankan:
-- insert into public.admin_users (user_id, display_name) values ('UUID_USER_PENGURUS', 'Pengurus RCS.CBS HOPE');
