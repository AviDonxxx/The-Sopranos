-- Миграция 001: начальная схема для ОРТ-тренажёра
-- Таблицы: subjects, topics, questions, attempts
-- RLS: публичное чтение справочников; attempts — вставка для всех, чтение только своих.

-- subjects
create table subjects (
  id text primary key,
  name text not null,
  name_ky text not null,
  "order" integer not null default 0,
  created_at timestamptz not null default now()
);

-- topics
create table topics (
  id text primary key,
  subject_id text not null references subjects(id) on delete cascade,
  name text not null,
  name_ky text not null,
  "order" integer not null default 0,
  created_at timestamptz not null default now()
);

-- questions
create table questions (
  id uuid default gen_random_uuid() primary key,
  topic_id text not null references topics(id) on delete cascade,
  text text not null,
  text_ky text,
  options jsonb not null default '[]'::jsonb,
  correct_index integer not null,
  explanation text,
  explanation_ky text,
  difficulty integer not null default 1 check (difficulty between 1 and 3),
  created_at timestamptz not null default now()
);

-- attempts
create table attempts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete set null,
  session_id text not null,
  question_id uuid references questions(id) on delete cascade,
  chosen_index integer,
  is_correct boolean not null default false,
  created_at timestamptz not null default now()
);

-- Row Level Security
alter table subjects enable row level security;
alter table topics enable row level security;
alter table questions enable row level security;
alter table attempts enable row level security;

-- Публичное чтение справочников
create policy "Subjects are publicly readable"
  on subjects for select
  using (true);

create policy "Topics are publicly readable"
  on topics for select
  using (true);

create policy "Questions are publicly readable"
  on questions for select
  using (true);

-- Attempts: вставка разрешена всем, чтение — только своих
create policy "Anyone can insert attempts"
  on attempts for insert
  with check (true);

create policy "Users can read own attempts"
  on attempts for select
  using (auth.uid() = user_id);
