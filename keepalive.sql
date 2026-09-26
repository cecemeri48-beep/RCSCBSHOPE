-- Run once in Supabase SQL Editor.
-- A minimal health-check RPC: no table reads, writes, or private data returned.
create or replace function public.keep_alive()
returns jsonb
language sql
stable
set search_path = public
as $$
  select jsonb_build_object(
    'ok', true,
    'checked_at', now()
  );
$$;

revoke all on function public.keep_alive() from public;
grant execute on function public.keep_alive() to anon, authenticated;
