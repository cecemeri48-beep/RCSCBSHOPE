-- RCS.CBS HOPE v100 — Peta Jejak Anggota
-- Jalankan sekali setelah hotfix-v97-competencies.sql.
-- Membuka peta perjalanan saat kartu anggota berubah menjadi Aktif.

begin;

create table if not exists public.member_journey_events (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  event_type text not null check (event_type in ('membership_activated','mission_completed','competency_awarded','certificate_issued')),
  title text not null,
  description text,
  track_code text check (track_code is null or track_code in ('rimba','vertikal','speleo','maritim','kultura','mastermind')),
  occurred_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists member_journey_events_member_idx
  on public.member_journey_events(member_id, occurred_at, id);

create unique index if not exists member_journey_membership_unique
  on public.member_journey_events(member_id)
  where event_type = 'membership_activated';

-- Setiap kompetensi baru yang diverifikasi juga menjadi jejak riwayat.
create or replace function public.audit_member_competencies()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  code text;
  label text;
begin
  if new.competencies is distinct from old.competencies then
    select coalesce(array_agg(distinct lower(trim(code)) order by lower(trim(code))), array[]::text[])
      into new.competencies
      from unnest(coalesce(new.competencies, array[]::text[])) as competency(code);
    new.competencies_updated_at := now();
    new.competencies_verified_by := auth.uid();

    foreach code in array new.competencies loop
      if not (code = any(coalesce(old.competencies, array[]::text[]))) then
        label := case code
          when 'rimba' then 'JEJAK RIMBA'
          when 'vertikal' then 'JEJAK VERTIKAL'
          when 'speleo' then 'JEJAK SPELEO'
          when 'maritim' then 'JEJAK MARITIM'
          when 'kultura' then 'JEJAK KULTURA'
          when 'mastermind' then 'JEJAK MASTERMIND'
          else upper(code)
        end;
        insert into public.member_journey_events
          (member_id, event_type, title, description, track_code, occurred_at, created_by, metadata)
        values
          (new.id, 'competency_awarded', 'Lulus ' || label, 'Kompetensi diverifikasi oleh pengurus.', code, now(), auth.uid(), jsonb_build_object('source', 'competency_update'));
      end if;
    end loop;
  end if;
  return new;
end;
$$;

alter table public.member_journey_events enable row level security;

drop policy if exists "admins can read member journey" on public.member_journey_events;
create policy "admins can read member journey"
  on public.member_journey_events for select to authenticated
  using (public.is_admin());

drop policy if exists "admins can manage member journey" on public.member_journey_events;
create policy "admins can manage member journey"
  on public.member_journey_events for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create or replace function public.record_member_activation()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if new.status = 'Aktif' and old.status is distinct from 'Aktif' then
    insert into public.member_journey_events
      (member_id, event_type, title, description, occurred_at, created_by, metadata)
    values
      (
        new.id,
        'membership_activated',
        'Lulus Menjadi Anggota RCS.CBS HOPE',
        'Kartu anggota aktif dan peta jenjang kompetensi terbuka.',
        coalesce(new.updated_at, now()),
        auth.uid(),
        jsonb_build_object('source', 'member_status')
      )
    on conflict do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists members_activation_journey on public.members;
create trigger members_activation_journey
  after update of status on public.members
  for each row execute function public.record_member_activation();

-- Backfill untuk anggota yang sudah aktif sebelum migrasi ini dijalankan.
insert into public.member_journey_events
  (member_id, event_type, title, description, occurred_at, metadata)
select
  m.id,
  'membership_activated',
  'Lulus Menjadi Anggota RCS.CBS HOPE',
  'Kartu anggota aktif dan peta jenjang kompetensi terbuka.',
  coalesce(m.updated_at, m.created_at, now()),
  jsonb_build_object('source', 'journey_map_backfill')
from public.members m
where m.status = 'Aktif'
  and not exists (
    select 1 from public.member_journey_events e
    where e.member_id = m.id and e.event_type = 'membership_activated'
  )
 on conflict do nothing;

-- RPC publik hanya mengembalikan data kartu aktif dan peta jejaknya.
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
  competencies text[],
  journey jsonb
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
    m.competencies,
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'event_type', e.event_type,
            'title', e.title,
            'description', e.description,
            'track_code', e.track_code,
            'occurred_at', e.occurred_at
          ) order by e.occurred_at, e.id
        )
        from public.member_journey_events e
        where e.member_id = m.id
      ),
      '[]'::jsonb
    ) as journey
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

commit;
notify pgrst, 'reload schema';
