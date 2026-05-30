-- Run this entire file in your Supabase SQL Editor

-- Profiles table (links auth users to their role)
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text not null,
  role text not null check (role in ('chief', 'cfi')),
  cert_number text,
  created_at timestamptz default now()
);

-- Students table
create table students (
  id uuid default gen_random_uuid() primary key,
  full_name text not null,
  cfi_id uuid references profiles(id) on delete set null,
  stage integer not null default 0 check (stage between 0 and 5),
  notes text,
  updated_at timestamptz default now(),
  created_at timestamptz default now()
);

-- Stage names for reference:
-- 0: Presolo
-- 1: Pre-towered solo
-- 2: Cross country & night
-- 3: Finishing minimums
-- 4: Checkride prep
-- 5: Checkride ready

-- Auto-update updated_at on student changes
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger students_updated_at
  before update on students
  for each row execute function update_updated_at();

-- Row Level Security
alter table profiles enable row level security;
alter table students enable row level security;

-- Profiles: users can read all profiles, update only their own
create policy "Profiles are viewable by all users"
  on profiles for select using (auth.role() = 'authenticated');

create policy "Users can update own profile"
  on profiles for update using (auth.uid() = id);

-- Students: chief can do everything; CFIs can only read/update their own students
create policy "Chief can manage all students"
  on students for all
  using (
    exists (
      select 1 from profiles
      where id = auth.uid() and role = 'chief'
    )
  );

create policy "CFIs can view their own students"
  on students for select
  using (cfi_id = auth.uid());

create policy "CFIs can update their own students"
  on students for update
  using (cfi_id = auth.uid());

create policy "CFIs can insert students for themselves"
  on students for insert
  with check (cfi_id = auth.uid());

-- Auto-create profile on signup (call this from Supabase Auth hook or manually)
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    coalesce(new.raw_user_meta_data->>'role', 'cfi')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
