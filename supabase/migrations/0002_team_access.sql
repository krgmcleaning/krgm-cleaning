-- Gabor AI Team access (2026-11-08): token-protected read + status functions.
-- The token itself is never stored; only its sha256 lives in public.team_access (insert done out of band).
create extension if not exists pgcrypto with schema extensions;
create table if not exists public.team_access (
  id bigint generated always as identity primary key,
  label text not null,
  token_sha256 text not null unique,
  created_at timestamptz not null default now(),
  revoked boolean not null default false
);
alter table public.team_access enable row level security;
revoke all on public.team_access from anon, authenticated;

create or replace function public._team_ok(p_token text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.team_access where not revoked
    and token_sha256 = encode(extensions.digest(coalesce(p_token,''), 'sha256'), 'hex'));
$$;
revoke all on function public._team_ok(text) from public, anon, authenticated;

create or replace function public.team_list_quotes(p_token text, p_since timestamptz default null, p_limit int default 200)
returns setof public.quote_requests language plpgsql stable security definer set search_path = '' as $$
begin
  if not public._team_ok(p_token) then raise exception 'not authorized' using errcode = '42501'; end if;
  return query select * from public.quote_requests q where p_since is null or q.created_at > p_since
    order by q.created_at desc limit least(greatest(coalesce(p_limit,200),1),500);
end; $$;

create or replace function public.team_list_subscribers(p_token text, p_limit int default 500)
returns setof public.newsletter_subscribers language plpgsql stable security definer set search_path = '' as $$
begin
  if not public._team_ok(p_token) then raise exception 'not authorized' using errcode = '42501'; end if;
  return query select * from public.newsletter_subscribers s order by s.created_at desc
    limit least(greatest(coalesce(p_limit,500),1),2000);
end; $$;

create or replace function public.team_set_status(p_token text, p_id bigint, p_status text)
returns public.quote_requests language plpgsql volatile security definer set search_path = '' as $$
declare r public.quote_requests;
begin
  if not public._team_ok(p_token) then raise exception 'not authorized' using errcode = '42501'; end if;
  if p_status not in ('new','contacted','booked','closed') then raise exception 'bad status' using errcode = '22023'; end if;
  update public.quote_requests set status = p_status where id = p_id returning * into r;
  if r.id is null then raise exception 'not found' using errcode = 'P0002'; end if;
  return r;
end; $$;

revoke all on function public.team_list_quotes(text, timestamptz, int) from public, authenticated;
revoke all on function public.team_list_subscribers(text, int) from public, authenticated;
revoke all on function public.team_set_status(text, bigint, text) from public, authenticated;
grant execute on function public.team_list_quotes(text, timestamptz, int) to anon;
grant execute on function public.team_list_subscribers(text, int) to anon;
grant execute on function public.team_set_status(text, bigint, text) to anon;
