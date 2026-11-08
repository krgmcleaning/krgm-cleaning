-- Website form storage for krandgmcleaning.com
create table if not exists public.quote_requests (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  name text check (char_length(name) <= 120),
  email text not null check (char_length(email) between 3 and 200),
  phone text check (char_length(phone) <= 40),
  message text check (char_length(message) <= 5000),
  estimate jsonb,
  user_agent text check (char_length(user_agent) <= 300),
  status text not null default 'new' check (status in ('new','contacted','booked','closed'))
);

create table if not exists public.newsletter_subscribers (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  email text not null unique check (char_length(email) between 3 and 200)
);

alter table public.quote_requests enable row level security;
alter table public.newsletter_subscribers enable row level security;

-- The website (anon key) may only INSERT. Nobody can read rows through the public API;
-- view them in the Supabase dashboard (Table Editor).
create policy "website can insert quote requests" on public.quote_requests
  for insert to anon with check (status = 'new');
create policy "website can subscribe" on public.newsletter_subscribers
  for insert to anon with check (true);

revoke all on public.quote_requests from anon, authenticated;
revoke all on public.newsletter_subscribers from anon, authenticated;
grant insert (name, email, phone, message, estimate, user_agent) on public.quote_requests to anon;
grant insert (email) on public.newsletter_subscribers to anon;
