-- Expand mock-test history and provide an efficient, RLS-safe progress summary.
-- This migration follows 20260728162000_add_stripe_webhook_grant.sql.

alter table public.mock_tests
  add column percentage smallint,
  add column duration_seconds integer;

-- Existing rows stored percentage in score. Preserve that value and estimate the
-- equivalent correct-answer count for the fixed 24-question mock format.
update public.mock_tests
set
  percentage = score,
  score = round((score::numeric / 100) * 24)::smallint,
  duration_seconds = 0;

alter table public.mock_tests
  drop constraint mock_tests_score_percentage,
  alter column percentage set not null,
  alter column duration_seconds set not null,
  add constraint mock_tests_score_correct_answers
    check (score between 0 and 24),
  add constraint mock_tests_percentage
    check (percentage between 0 and 100),
  add constraint mock_tests_duration_non_negative
    check (duration_seconds >= 0);

comment on column public.mock_tests.score is
  'Number of correct answers in the completed 24-question mock test.';
comment on column public.mock_tests.percentage is
  'Integer percentage score from 0 to 100.';
comment on column public.mock_tests.duration_seconds is
  'Elapsed mock-test duration in whole seconds. Legacy rows migrated before this field use 0.';

-- Return all dashboard progress metrics in one database call.
-- auth.uid() determines the user; callers cannot request another user's summary.
create or replace function public.get_user_progress_summary()
returns table (
  total_questions_answered bigint,
  correct_answers bigint,
  accuracy_percentage integer,
  mock_tests_completed bigint,
  mock_score_total bigint,
  average_score integer,
  best_score integer,
  wrong_question_ids text[]
)
language sql
stable
security invoker
set search_path = ''
as $$
  with quiz_aggregate as (
    select
      count(*)::bigint as total_questions_answered,
      count(*) filter (where correct)::bigint as correct_answers
    from public.quiz_progress
    where user_id = (select auth.uid())
  ),
  latest_answers as (
    select distinct on (question_id)
      question_id,
      correct
    from public.quiz_progress
    where user_id = (select auth.uid())
    order by question_id, answered_at desc, id desc
  ),
  mock_aggregate as (
    select
      count(*)::bigint as mock_tests_completed,
      coalesce(sum(percentage), 0)::bigint as mock_score_total,
      coalesce(round(avg(percentage)), 0)::integer as average_score,
      coalesce(max(percentage), 0)::integer as best_score
    from public.mock_tests
    where user_id = (select auth.uid())
  )
  select
    quiz_aggregate.total_questions_answered,
    quiz_aggregate.correct_answers,
    case
      when quiz_aggregate.total_questions_answered = 0 then 0
      else round(
        (quiz_aggregate.correct_answers::numeric * 100)
        / quiz_aggregate.total_questions_answered
      )::integer
    end as accuracy_percentage,
    mock_aggregate.mock_tests_completed,
    mock_aggregate.mock_score_total,
    mock_aggregate.average_score,
    mock_aggregate.best_score,
    coalesce(
      (
        select array_agg(question_id order by question_id)
        from latest_answers
        where correct = false
      ),
      array[]::text[]
    ) as wrong_question_ids
  from quiz_aggregate
  cross join mock_aggregate;
$$;

comment on function public.get_user_progress_summary() is
  'Returns cross-device quiz and mock-test metrics for the authenticated user only.';

revoke all on function public.get_user_progress_summary() from public, anon;
grant execute on function public.get_user_progress_summary() to authenticated;
