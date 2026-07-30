-- Atomically migrate browser-only anonymous progress after account creation/login.
-- This migration follows 20260728170000_add_question_admin.sql.

create table public.anonymous_progress_migrations (
  user_id uuid not null references auth.users (id) on delete cascade,
  migration_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (user_id, migration_id)
);

comment on table public.anonymous_progress_migrations is
  'Idempotency records for one-time anonymous browser progress migrations.';

alter table public.anonymous_progress_migrations enable row level security;

create policy "Users can read their own anonymous migrations"
  on public.anonymous_progress_migrations
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "Users can create their own anonymous migrations"
  on public.anonymous_progress_migrations
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create or replace function public.migrate_anonymous_progress(
  p_migration_id uuid,
  p_answers jsonb,
  p_mock_tests jsonb
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  inserted_migration_rows integer;
begin
  if current_user_id is null then
    raise exception 'Authentication is required';
  end if;

  if jsonb_typeof(p_answers) <> 'array' or jsonb_typeof(p_mock_tests) <> 'array' then
    raise exception 'Anonymous progress payloads must be arrays';
  end if;

  insert into public.anonymous_progress_migrations (user_id, migration_id)
  values (current_user_id, p_migration_id)
  on conflict do nothing;

  get diagnostics inserted_migration_rows = row_count;

  if inserted_migration_rows = 0 then
    return false;
  end if;

  insert into public.quiz_progress (
    user_id,
    question_id,
    correct,
    answered_at
  )
  select
    current_user_id,
    answer ->> 'questionId',
    (answer ->> 'correct')::boolean,
    (answer ->> 'answeredAt')::timestamptz
  from jsonb_array_elements(p_answers) as answer
  where
    char_length(btrim(answer ->> 'questionId')) > 0
    and answer ? 'correct'
    and answer ? 'answeredAt';

  insert into public.mock_tests (
    user_id,
    score,
    percentage,
    completed_at,
    duration_seconds
  )
  select
    current_user_id,
    (mock_test ->> 'score')::smallint,
    (mock_test ->> 'percentage')::smallint,
    (mock_test ->> 'completedAt')::timestamptz,
    (mock_test ->> 'durationSeconds')::integer
  from jsonb_array_elements(p_mock_tests) as mock_test
  where
    mock_test ? 'score'
    and mock_test ? 'percentage'
    and mock_test ? 'completedAt'
    and mock_test ? 'durationSeconds';

  return true;
end;
$$;

comment on function public.migrate_anonymous_progress(uuid, jsonb, jsonb) is
  'Atomically imports one anonymous browser progress batch for auth.uid(); repeated migration IDs are ignored.';

revoke all on function public.migrate_anonymous_progress(uuid, jsonb, jsonb)
  from public, anon;
grant execute on function public.migrate_anonymous_progress(uuid, jsonb, jsonb)
  to authenticated;
