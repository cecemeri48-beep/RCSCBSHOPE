-- RCS.CBS HOPE hotfix v106 — status stabil + trigger pendaftaran aman
-- Jalankan setelah hotfix-v104-admin-status.sql.

begin;

-- Pastikan trigger pembuat nomor hanya berjalan saat INSERT, bukan saat UPDATE.
drop trigger if exists members_registration_number on public.members;
create trigger members_registration_number
before insert on public.members
for each row execute function public.assign_registration_number();

-- Cegah proses lain mengembalikan anggota Aktif ke Menunggu Verifikasi.
-- Perubahan yang memang dipilih admin tetap diizinkan melalui RPC di bawah.
create or replace function public.protect_active_member_status()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if old.status = 'Aktif'
     and new.status = 'Menunggu Verifikasi'
     and coalesce(current_setting('app.allow_status_reset', true), '') <> 'on' then
    new.status := old.status;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_active_member_status on public.members;
create trigger protect_active_member_status
before update of status on public.members
for each row execute function public.protect_active_member_status();

create or replace function public.admin_update_member_status(
  p_member_id uuid,
  p_status text
)
returns table (
  id uuid,
  status text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Akun ini tidak terdaftar sebagai admin.'
      using errcode = '42501';
  end if;

  if p_status not in ('Menunggu Verifikasi','Perlu Perbaikan','Aktif','Nonaktif') then
    raise exception 'Status tidak valid.'
      using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_member_id::text, 0));
  perform set_config('app.allow_status_reset', 'on', true);

  update public.members as m
  set status = p_status::public.member_status,
      updated_at = now()
  where m.id = p_member_id;

  if not found then
    raise exception 'Data anggota tidak ditemukan.'
      using errcode = 'P0002';
  end if;

  return query
  select m.id, m.status::text
  from public.members as m
  where m.id = p_member_id;
end;
$$;

revoke all on function public.admin_update_member_status(uuid, text) from public;
grant execute on function public.admin_update_member_status(uuid, text) to authenticated;

commit;
notify pgrst, 'reload schema';
