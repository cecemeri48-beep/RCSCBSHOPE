-- RCS.CBS HOPE hotfix v102 — pencarian nama aman + masking nomor kartu
-- Jalankan setelah hotfix-v100-journey-map.sql dan hotfix-v101-security.sql.
-- Pencarian nama hanya berhasil bila hasilnya unik, mengembalikan token NULL,
-- dan memberi lookup_mode='name' agar UI menjadi mode lihat-saja.

begin;

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
  journey jsonb,
  lookup_mode text
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with input as (
    select trim(coalesce(p_key, '')) as q
  ), candidates as (
    select
      m.*,
      (
        lower(m.public_token::text) = lower(i.q)
        or upper(m.registration_number) = upper(i.q)
        or (
          i.q ~ '^[A-Za-z0-9]{6,12}$'
          and upper(regexp_replace(m.registration_number, '^.*[·•|][[:space:]]*', '')) = upper(i.q)
        )
      ) as credential_match,
      (length(i.q) >= 3 and position(lower(i.q) in lower(m.name)) > 0) as name_match
    from public.members m
    cross join input i
    where m.status = 'Aktif'
      and length(i.q) between 3 and 100
  ), ranked as (
    select c.*, count(*) filter (where c.name_match) over () as name_match_count
    from candidates c
    where c.credential_match or c.name_match
  )
  select
    case when r.credential_match then r.public_token else null end,
    case
      when r.registration_number is null then null
      else regexp_replace(r.registration_number, '([[:alnum:]]+)[[:space:]]*$', '••••••')
    end,
    r.name,
    r.parent_name,
    r.cohort_name,
    r.cohort_year,
    r.blood_type::text,
    r.photo_path,
    r.photo_url,
    r.status::text,
    r.competencies,
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
        where e.member_id = r.id
      ),
      '[]'::jsonb
    ),
    case when r.credential_match then 'credential' else 'name' end
  from ranked r
  where r.credential_match or (r.name_match and r.name_match_count = 1)
  order by r.credential_match desc
  limit 1;
$$;

revoke all on function public.verify_member(text) from public;
grant execute on function public.verify_member(text) to anon, authenticated;

commit;
notify pgrst, 'reload schema';
