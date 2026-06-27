-- Run this entire script in Supabase Dashboard → SQL Editor

-- ── Profiles ──────────────────────────────────────────────────────────────────
create table if not exists profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  name text,
  email text,
  study_goal text,
  onboarding_completed boolean default false,
  theme_mode text default 'dark',
  daily_task_goal integer default 3,
  daily_focus_goal integer default 50,
  notif_study_reminders boolean default true,
  notif_mood_checkin boolean default true,
  notif_task_deadlines boolean default true,
  notif_reminder_hour integer default 9,
  api_key text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ── Tasks ──────────────────────────────────────────────────────────────────────
create table if not exists tasks (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade,
  title text not null,
  description text default '',
  due_date text default '',
  completed boolean default false,
  completed_at text,
  created_at text
);

-- ── Moods ──────────────────────────────────────────────────────────────────────
create table if not exists moods (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade,
  mood text,
  emoji text,
  label text,
  date text
);

-- ── Focus Sessions ─────────────────────────────────────────────────────────────
create table if not exists focus_sessions (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade,
  duration integer,
  type text,
  date text,
  completed_at text
);

-- ── Quiz Results ───────────────────────────────────────────────────────────────
create table if not exists quiz_results (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade,
  topic text,
  difficulty text,
  score integer,
  total integer,
  date text,
  questions jsonb default '[]'
);

-- ── Row Level Security ─────────────────────────────────────────────────────────
alter table profiles enable row level security;
alter table tasks enable row level security;
alter table moods enable row level security;
alter table focus_sessions enable row level security;
alter table quiz_results enable row level security;

-- Drop existing policies if any (safe to re-run)
drop policy if exists "own_profile" on profiles;
drop policy if exists "own_tasks" on tasks;
drop policy if exists "own_moods" on moods;
drop policy if exists "own_focus_sessions" on focus_sessions;
drop policy if exists "own_quiz_results" on quiz_results;

-- Create policies: users can only see and edit their own data
create policy "own_profile" on profiles for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "own_tasks" on tasks for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own_moods" on moods for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own_focus_sessions" on focus_sessions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own_quiz_results" on quiz_results for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
