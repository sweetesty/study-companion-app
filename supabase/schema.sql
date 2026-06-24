-- ============================================================
-- Smart Study Companion — Supabase Schema
-- Paste this entire file into Supabase SQL Editor and run it
-- ============================================================

-- Profiles (extends auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  name text not null default '',
  study_goal text not null default '',
  daily_task_goal int not null default 3,
  daily_focus_goal int not null default 50,
  notif_study_reminders boolean default true,
  notif_mood_checkin boolean default true,
  notif_task_deadlines boolean default true,
  notif_reminder_hour int default 9,
  api_key text default '',
  theme_mode text default 'dark',
  onboarding_completed boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Tasks
create table public.tasks (
  id text primary key,
  user_id uuid references auth.users on delete cascade not null,
  title text not null,
  description text default '',
  due_date text,
  completed boolean default false,
  completed_at text,
  created_at text not null
);

-- Moods
create table public.moods (
  id text primary key,
  user_id uuid references auth.users on delete cascade not null,
  mood text not null,
  emoji text,
  label text,
  date text not null,
  unique(user_id, date)
);

-- Focus Sessions
create table public.focus_sessions (
  id text primary key,
  user_id uuid references auth.users on delete cascade not null,
  duration int not null,
  type text default 'work',
  date text not null,
  completed_at text not null
);

-- Quiz Results
create table public.quiz_results (
  id text primary key,
  user_id uuid references auth.users on delete cascade not null,
  topic text not null,
  difficulty text,
  score int,
  total int,
  questions jsonb,
  date text not null
);

-- ============================================================
-- Row Level Security (users only see their own data)
-- ============================================================
alter table public.profiles enable row level security;
alter table public.tasks enable row level security;
alter table public.moods enable row level security;
alter table public.focus_sessions enable row level security;
alter table public.quiz_results enable row level security;

create policy "Own profile" on public.profiles for all using (auth.uid() = id);
create policy "Own tasks" on public.tasks for all using (auth.uid() = user_id);
create policy "Own moods" on public.moods for all using (auth.uid() = user_id);
create policy "Own sessions" on public.focus_sessions for all using (auth.uid() = user_id);
create policy "Own quiz results" on public.quiz_results for all using (auth.uid() = user_id);

-- ============================================================
-- Auto-create profile row when a user signs up
-- ============================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id)
  values (new.id);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
