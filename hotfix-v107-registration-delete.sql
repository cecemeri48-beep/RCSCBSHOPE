-- RCS.CBS HOPE v107: confirmed registration + confirmed admin deletion.
-- Run the WHOLE file once in Supabase SQL Editor, BEFORE deploying the files.
-- Existing members/admin users are preserved. No public SELECT is added.
-- Prerequisite: the project's existing Supabase schema (public.members,
-- public.admin_users, public.is_admin, public.assign_registration_number).
begin;

-- Ensure the registration trigger cannot run during UPDATE.
drop trigger if exists members_registration_number on public.members;
create trigger members_registration_number
before insert on public.members
for each row execute function public.assign_registration_number();

-- Restore standard admin RLS rules, without making private data public.
alter table public.members enable row level security;
alter table public.admin_users enable row level security;
grant usage on schema public to anon, authenticated;
grant select, update, delete on public.members to authenticated;
drop policy if exists "admins can read members" on public.members;
create policy "admins can read members" on public.members for select to authenticated
  using (public.is_admin());
drop policy if exists "admins can update members" on public.members;
create policy "admins can update members" on public.members for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admins can delete members" on public.members;
create policy "admins can delete members" on public.members for delete to authenticated
  using (public.is_admin());
grant execute on function public.is_admin() to authenticated;

-- Anonymous visitors receive only a submission receipt, not SELECT access
-- to the private members table. Validate and whitelist all public fields:
-- no caller-supplied ID, token, status, competency or registration number.
create or replace function public.submit_member_registration(p_payload jsonb)
returns table (id uuid, status text, created_at timestamptz)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_name text := upper(btrim(coalesce(p_payload->>'name','')));
  v_parent_name text := upper(btrim(coalesce(p_payload->>'parent_name','')));
  v_cohort_name text := upper(btrim(coalesce(p_payload->>'cohort_name','')));
  v_phone text := regexp_replace(btrim(coalesce(p_payload->>'parent_phone','')), '[[:space:]-]', '', 'g');
  v_address text := upper(btrim(coalesce(p_payload->>'parent_address','')));
  v_blood text := coalesce(p_payload->>'blood_type','');
  v_photo_path text := btrim(coalesce(p_payload->>'photo_path',''));
  v_member_id uuid;
  v_status text;
  v_created_at timestamptz;
begin
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    raise exception 'Data pendaftaran tidak valid.' using errcode='22023';
  end if;
  if coalesce(p_payload->'consent','null'::jsonb) <> 'true'::jsonb then
    raise exception 'Persetujuan penyimpanan data wajib dicentang.' using errcode='22023';
  end if;
  if v_name='' or v_parent_name='' or v_cohort_name='' or v_address='' then
    raise exception 'Lengkapi nama, orang tua, angkatan dan alamat.' using errcode='22023';
  end if;
  if length(v_name)>300 or length(v_parent_name)>300 or length(v_cohort_name)>300 or length(v_address)>3000 then
    raise exception 'Data teks terlalu panjang.' using errcode='22023';
  end if;
  if v_phone !~ '^(08|62|\+62)[0-9]{8,14}$' then
    raise exception 'Nomor WhatsApp tidak valid.' using errcode='22023';
  end if;
  if v_blood not in ('A','B','AB','O','Tidak tahu') then
    raise exception 'Golongan darah tidak valid.' using errcode='22023';
  end if;
  if v_photo_path !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|jpeg|png|webp)$' then
    raise exception 'Foto anggota belum diunggah dengan benar.' using errcode='22023';
  end if;
  if not exists(select 1 from storage.objects o where o.bucket_id='member-photos' and o.name=v_photo_path) then
    raise exception 'Foto anggota belum tersimpan. Pilih foto dan kirim kembali.' using errcode='22023';
  end if;

  insert into public.members as m
    (name,parent_name,cohort_name,cohort_year,blood_type,parent_phone,
     parent_address,photo_path,photo_url,consent,status)
  values
    (v_name,v_parent_name,v_cohort_name,null,v_blood::public.blood_type,v_phone,
     v_address,v_photo_path,null,true,'Menunggu Verifikasi'::public.member_status)
  returning m.id,m.status::text,m.created_at into v_member_id,v_status,v_created_at;

  if v_member_id is null or v_status is distinct from 'Menunggu Verifikasi' then
    raise exception 'Pendaftaran belum tersimpan dengan status yang benar.';
  end if;
  return query select v_member_id,v_status,v_created_at;
end;
$$;
revoke all on function public.submit_member_registration(jsonb) from public;
grant execute on function public.submit_member_registration(jsonb) to anon, authenticated;

-- DELETE ... RETURNING proves a row was actually removed in this transaction.
-- No silent success when RLS filters out a row or the ID does not exist.
create or replace function public.admin_delete_member(p_member_id uuid)
returns table (id uuid)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_deleted_id uuid;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Akun ini tidak terdaftar sebagai admin atau sesi sudah berakhir.'
      using errcode='42501';
  end if;
  delete from public.members as m where m.id=p_member_id
    returning m.id into v_deleted_id;
  if v_deleted_id is null then
    raise exception 'Data anggota tidak ditemukan; tidak ada data yang dihapus.'
      using errcode='P0002';
  end if;
  return query select v_deleted_id;
end;
$$;
revoke all on function public.admin_delete_member(uuid) from public;
grant execute on function public.admin_delete_member(uuid) to authenticated;

commit;
notify pgrst, 'reload schema';
