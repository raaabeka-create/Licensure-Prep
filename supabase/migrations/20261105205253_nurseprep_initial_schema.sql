-- NursePrep initial cloud schema
-- Local quiz functionality does not depend on these tables.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  preferred_mode text not null default 'practice' check (preferred_mode in ('practice', 'exam')),
  default_question_count integer not null default 20 check (default_question_count between 1 and 265),
  default_time_limit_minutes integer check (default_time_limit_minutes between 1 and 600),
  updated_at timestamptz not null default now()
);

create table if not exists public.quiz_attempts (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  subject_id text not null,
  mode text not null check (mode in ('practice', 'exam')),
  question_count integer not null check (question_count > 0),
  correct_count integer not null default 0 check (correct_count >= 0 and correct_count <= question_count),
  score_percent numeric(5,2) not null default 0 check (score_percent >= 0 and score_percent <= 100),
  started_at timestamptz not null,
  completed_at timestamptz,
  duration_seconds integer not null default 0 check (duration_seconds >= 0),
  synced_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.quiz_attempt_answers (
  attempt_id uuid not null references public.quiz_attempts (id) on delete cascade,
  question_id text not null,
  selected_option text check (selected_option in ('A', 'B', 'C', 'D') or selected_option is null),
  correct_option text not null check (correct_option in ('A', 'B', 'C', 'D')),
  is_correct boolean not null,
  time_spent_seconds integer not null default 0 check (time_spent_seconds >= 0),
  was_flagged boolean not null default false,
  primary key (attempt_id, question_id)
);

create index if not exists quiz_attempts_user_completed_idx on public.quiz_attempts (user_id, completed_at desc);
create index if not exists quiz_attempts_user_subject_idx on public.quiz_attempts (user_id, subject_id, completed_at desc);
create index if not exists quiz_attempt_answers_attempt_idx on public.quiz_attempt_answers (attempt_id);

alter table public.profiles enable row level security;
alter table public.user_preferences enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.quiz_attempt_answers enable row level security;

create policy "Users can read own profile" on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy "Users can create own profile" on public.profiles for insert to authenticated with check ((select auth.uid()) = id);
create policy "Users can update own profile" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy "Users can read own preferences" on public.user_preferences for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users can create own preferences" on public.user_preferences for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users can update own preferences" on public.user_preferences for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "Users can read own quiz attempts" on public.quiz_attempts for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users can create own quiz attempts" on public.quiz_attempts for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users can update own quiz attempts" on public.quiz_attempts for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "Users can read answers for own attempts" on public.quiz_attempt_answers for select to authenticated using (exists (select 1 from public.quiz_attempts a where a.id = attempt_id and a.user_id = (select auth.uid())));
create policy "Users can add answers to own attempts" on public.quiz_attempt_answers for insert to authenticated with check (exists (select 1 from public.quiz_attempts a where a.id = attempt_id and a.user_id = (select auth.uid())));
create policy "Users can update answers to own attempts" on public.quiz_attempt_answers for update to authenticated using (exists (select 1 from public.quiz_attempts a where a.id = attempt_id and a.user_id = (select auth.uid()))) with check (exists (select 1 from public.quiz_attempts a where a.id = attempt_id and a.user_id = (select auth.uid())));

grant select, insert, update on public.profiles to authenticated;
grant select, insert, update on public.user_preferences to authenticated;
grant select, insert, update on public.quiz_attempts to authenticated;
grant select, insert, update on public.quiz_attempt_answers to authenticated;
