create extension if not exists pgcrypto;

create table if not exists public.investment_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('buy', 'sell')),
  date date not null,
  fund_code text not null check (fund_code ~ '^[0-9]{6}$'),
  amount numeric not null check (amount > 0),
  nav numeric not null check (nav > 0),
  nav_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.investment_records enable row level security;

drop policy if exists "investment records select own rows" on public.investment_records;
create policy "investment records select own rows"
on public.investment_records
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "investment records insert own rows" on public.investment_records;
create policy "investment records insert own rows"
on public.investment_records
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "investment records update own rows" on public.investment_records;
create policy "investment records update own rows"
on public.investment_records
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "investment records delete own rows" on public.investment_records;
create policy "investment records delete own rows"
on public.investment_records
for delete
to authenticated
using ((select auth.uid()) = user_id);

create index if not exists investment_records_user_date_idx
on public.investment_records (user_id, date desc, created_at desc);
