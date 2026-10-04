-- RCS.CBS HOPE hotfix v104 — reliable admin status update
-- Jalankan satu kali di Supabase SQL Editor setelah schema utama.

begin;

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
