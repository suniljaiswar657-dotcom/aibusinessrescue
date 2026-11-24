-- AI Business Rescue: run this once in Supabase SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.business_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  business_name text not null default 'My Business',
  business_type text not null default 'Local business',
  phone text,
  city text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  phone text,
  email text,
  requirement text,
  budget numeric(12,2),
  location text,
  status text not null default 'New Lead' check (status in ('New Lead','Contacted','Qualified','Site Visit','Negotiation','Converted','Follow-up','Lost')),
  follow_up_date date,
  source text not null default 'Manual',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists leads_user_created_idx on public.leads(user_id, created_at desc);
create index if not exists leads_user_followup_idx on public.leads(user_id, follow_up_date);

alter table public.business_profiles enable row level security;
alter table public.leads enable row level security;

drop policy if exists "Users manage own business profile" on public.business_profiles;
create policy "Users manage own business profile" on public.business_profiles for all using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "Users manage own leads" on public.leads;
create policy "Users manage own leads" on public.leads for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.create_business_profile()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.business_profiles (id, business_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'business_name', 'My Business'))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_business_profile on auth.users;
create trigger on_auth_user_created_business_profile
after insert on auth.users
for each row execute procedure public.create_business_profile();
