-- RCS.CBS HOPE hotfix v97 — verified competency badges
-- Run this entire file once in Supabase SQL Editor before deploying app v97.

begin;

alter table public.members add column if not exists competencies text[] not null default array[]::text[];
alter table public.members add column if not exists competencies_updated_at timestamptz;
alter table public.members add column if not exists competencies_verified_by uuid references auth.users(id) on delete set null;

do $$ begin
  alter table public.members add constraint members_competencies_allowed
    check (competencies <@ array['rimba','vertikal','speleo','maritim','kultura','mastermind']::text[]);
exception when duplicate_object then null; end $$;

-- Public registration must never be able to award its own competency badge.
create or replace function public.assign_registration_number()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_year integer := extract(year from coalesce(new.created_at, now()))::integer;
  v_number integer;
begin
  new.status := 'Menunggu Verifikasi';
  new.public_token := gen_random_uuid();
  new.registration_number := null;
  new.competencies := array[]::text[];
  new.competencies_updated_at := null;
  new.competencies_verified_by := null;
  insert into public.registration_counters(year, last_number)
    values (v_year, 1)
    on conflict (year) do update set last_number = registration_counters.last_number + 1
    returning last_number into v_number;
  new.registration_number := lpad(v_number::text, 3, '0') || '/RCSCBS/HOPE/' || v_year::text;
  return new;
end;
$$;

create or replace function public.audit_member_competencies()
returns trigger language plpgsql security definer set search_path = public, auth as $$
begin
  if new.competencies is distinct from old.competencies then
    select coalesce(array_agg(distinct lower(trim(code)) order by lower(trim(code))), array[]::text[])
      into new.competencies
      from unnest(coalesce(new.competencies, array[]::text[])) as competency(code);
    new.competencies_updated_at := now();
    new.competencies_verified_by := auth.uid();
  end if;
  return new;
end;
$$;

drop trigger if exists members_competencies_audit on public.members;
create trigger members_competencies_audit before update of competencies on public.members
for each row execute function public.audit_member_competencies();

-- Return only safe public card fields, including the verified competency codes.
drop function if exists public.verify_member(text);
create function public.verify_member(p_key text)
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
  status text,
  competencies text[]
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
    m.status::text,
    m.competencies
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

commit;
notify pgrst, 'reload schema';
