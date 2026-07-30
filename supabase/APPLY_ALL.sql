-- Combined migrations for Life in the UK Prep
-- Paste this entire file into the Supabase SQL Editor and click Run:
-- https://supabase.com/dashboard/project/qkvgbguigytbqwxglayy/sql/new


-- >>> 20260728154400_create_core_schema.sql
-- Core production schema for the Life in the UK preparation application.
-- Run this migration through the Supabase CLI or SQL migration workflow.

create type public.premium_plan as enum (
  'week',
  'two_weeks',
  'four_weeks',
  'lifetime'
);

comment on type public.premium_plan is
  'The supported premium access products. Stripe price IDs can map to these values later.';

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  constraint profiles_display_name_length
    check (display_name is null or char_length(display_name) between 1 and 100)
);

comment on table public.profiles is
  'Public application profile data owned by one Supabase Auth user.';
comment on column public.profiles.id is
  'The profile owner. It is identical to auth.users.id.';
comment on column public.profiles.display_name is
  'Optional user-facing name, limited to 100 characters.';

create table public.premium_access (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  plan public.premium_plan not null,
  purchase_date timestamptz not null default now(),
  expires_at timestamptz,
  is_lifetime boolean not null default false,
  stripe_payment_id text,
  created_at timestamptz not null default now(),
  constraint premium_access_lifetime_consistency
    check (
      (
        plan = 'lifetime'
        and is_lifetime = true
        and expires_at is null
      )
      or
      (
        plan <> 'lifetime'
        and is_lifetime = false
        and expires_at is not null
      )
    ),
  constraint premium_access_expiry_after_purchase
    check (expires_at is null or expires_at > purchase_date),
  constraint premium_access_stripe_payment_id_not_blank
    check (stripe_payment_id is null or char_length(btrim(stripe_payment_id)) > 0)
);

comment on table public.premium_access is
  'Premium purchases and access periods. Rows should be written only by trusted server-side Stripe webhook code using the service role.';
comment on column public.premium_access.stripe_payment_id is
  'The future Stripe PaymentIntent, Checkout Session, or equivalent unique payment identifier.';

create unique index premium_access_stripe_payment_id_unique
  on public.premium_access (stripe_payment_id)
  where stripe_payment_id is not null;
create index premium_access_user_expiry_idx
  on public.premium_access (user_id, expires_at desc);

create table public.quiz_progress (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  question_id text not null,
  correct boolean not null,
  answered_at timestamptz not null default now(),
  constraint quiz_progress_question_id_not_blank
    check (char_length(btrim(question_id)) > 0)
);

comment on table public.quiz_progress is
  'Appendable history of a user answering individual Life in the UK questions.';
comment on column public.quiz_progress.question_id is
  'Stable application question identifier, for example handbook-history-001.';

create index quiz_progress_user_answered_idx
  on public.quiz_progress (user_id, answered_at desc);
create index quiz_progress_user_question_idx
  on public.quiz_progress (user_id, question_id);

create table public.mock_tests (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  score smallint not null,
  completed_at timestamptz not null default now(),
  constraint mock_tests_score_percentage
    check (score between 0 and 100)
);

comment on table public.mock_tests is
  'Completed mock-test attempts. Score is stored as an integer percentage from 0 to 100.';

create index mock_tests_user_completed_idx
  on public.mock_tests (user_id, completed_at desc);

create table public.bookmarks (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  question_id text not null,
  constraint bookmarks_question_id_not_blank
    check (char_length(btrim(question_id)) > 0),
  constraint bookmarks_user_question_unique
    unique (user_id, question_id)
);

comment on table public.bookmarks is
  'Questions a user has bookmarked for later revision. A question can be bookmarked once per user.';

create index bookmarks_user_idx
  on public.bookmarks (user_id);

-- Automatically create a profile for each new Auth user.
-- SECURITY DEFINER is required because this trigger runs when auth.users changes.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    nullif(
      btrim(
        coalesce(
          new.raw_user_meta_data ->> 'display_name',
          split_part(coalesce(new.email, ''), '@', 1)
        )
      ),
      ''
    )
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

comment on function public.handle_new_user() is
  'Creates the matching public profile when a Supabase Auth user is created.';

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill profiles for Auth users created before this migration.
insert into public.profiles (id, display_name)
select
  users.id,
  nullif(
    btrim(
      coalesce(
        users.raw_user_meta_data ->> 'display_name',
        split_part(coalesce(users.email, ''), '@', 1)
      )
    ),
    ''
  )
from auth.users as users
on conflict (id) do nothing;

-- Enable Row Level Security on every user-owned table.
alter table public.profiles enable row level security;
alter table public.premium_access enable row level security;
alter table public.quiz_progress enable row level security;
alter table public.mock_tests enable row level security;
alter table public.bookmarks enable row level security;

-- Profiles: authenticated users can read, create, update, and delete only their own row.
create policy "Users can read their own profile"
  on public.profiles
  for select
  to authenticated
  using ((select auth.uid()) = id);

comment on policy "Users can read their own profile" on public.profiles is
  'Prevents authenticated users from reading another user profile.';

create policy "Users can create their own profile"
  on public.profiles
  for insert
  to authenticated
  with check ((select auth.uid()) = id);

comment on policy "Users can create their own profile" on public.profiles is
  'Allows profile recovery while preventing creation of profiles for another Auth user.';

create policy "Users can update their own profile"
  on public.profiles
  for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

comment on policy "Users can update their own profile" on public.profiles is
  'Allows only the profile owner to change display data and prevents ownership changes.';

create policy "Users can delete their own profile"
  on public.profiles
  for delete
  to authenticated
  using ((select auth.uid()) = id);

comment on policy "Users can delete their own profile" on public.profiles is
  'Allows users to delete only their public profile; deleting an Auth account remains a trusted server operation.';

-- Premium access: users can inspect only their own access.
-- No authenticated insert, update, or delete policy is intentionally provided.
-- Future Stripe webhook code should use the Supabase service role, which bypasses RLS.
create policy "Users can read their own premium access"
  on public.premium_access
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

comment on policy "Users can read their own premium access" on public.premium_access is
  'Users can check their entitlement but cannot grant or modify premium access from the browser.';

-- Quiz progress: users have full CRUD access only to rows they own.
create policy "Users can read their own quiz progress"
  on public.quiz_progress
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

comment on policy "Users can read their own quiz progress" on public.quiz_progress is
  'Restricts quiz history reads to the authenticated owner.';

create policy "Users can insert their own quiz progress"
  on public.quiz_progress
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

comment on policy "Users can insert their own quiz progress" on public.quiz_progress is
  'Accepts progress only when user_id matches the authenticated user.';

create policy "Users can update their own quiz progress"
  on public.quiz_progress
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

comment on policy "Users can update their own quiz progress" on public.quiz_progress is
  'Restricts updates and prevents transferring progress rows to another user.';

create policy "Users can delete their own quiz progress"
  on public.quiz_progress
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

comment on policy "Users can delete their own quiz progress" on public.quiz_progress is
  'Allows deletion only from the authenticated user history.';

-- Mock tests: users have full CRUD access only to attempts they own.
create policy "Users can read their own mock tests"
  on public.mock_tests
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

comment on policy "Users can read their own mock tests" on public.mock_tests is
  'Restricts mock-test history reads to the authenticated owner.';

create policy "Users can insert their own mock tests"
  on public.mock_tests
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

comment on policy "Users can insert their own mock tests" on public.mock_tests is
  'Accepts attempts only when user_id matches the authenticated user.';

create policy "Users can update their own mock tests"
  on public.mock_tests
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

comment on policy "Users can update their own mock tests" on public.mock_tests is
  'Restricts updates and prevents transferring attempts to another user.';

create policy "Users can delete their own mock tests"
  on public.mock_tests
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

comment on policy "Users can delete their own mock tests" on public.mock_tests is
  'Allows deletion only from the authenticated user test history.';

-- Bookmarks: users have full CRUD access only to bookmarks they own.
create policy "Users can read their own bookmarks"
  on public.bookmarks
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

comment on policy "Users can read their own bookmarks" on public.bookmarks is
  'Restricts bookmark reads to the authenticated owner.';

create policy "Users can insert their own bookmarks"
  on public.bookmarks
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

comment on policy "Users can insert their own bookmarks" on public.bookmarks is
  'Accepts bookmarks only when user_id matches the authenticated user.';

create policy "Users can update their own bookmarks"
  on public.bookmarks
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

comment on policy "Users can update their own bookmarks" on public.bookmarks is
  'Restricts bookmark updates and prevents ownership changes.';

create policy "Users can delete their own bookmarks"
  on public.bookmarks
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

comment on policy "Users can delete their own bookmarks" on public.bookmarks is
  'Allows users to remove only their own bookmarks.';


-- >>> 20260728162000_add_stripe_webhook_grant.sql
-- Add the fields and atomic service-role RPC required by Stripe webhooks.
-- This migration follows 20260728154400_create_core_schema.sql.

alter type public.premium_plan rename value 'week' to 'one_week';

comment on type public.premium_plan is
  'Premium access products: one_week, two_weeks, four_weeks, and lifetime.';

alter table public.premium_access
  add column stripe_checkout_session_id text,
  add column stripe_customer_id text;

comment on column public.premium_access.stripe_checkout_session_id is
  'Verified Stripe Checkout Session ID that most recently granted this user Premium access.';
comment on column public.premium_access.stripe_customer_id is
  'Stripe Customer ID associated with the latest successful Premium purchase.';

alter table public.premium_access
  add constraint premium_access_checkout_session_not_blank
    check (
      stripe_checkout_session_id is null
      or char_length(btrim(stripe_checkout_session_id)) > 0
    ),
  add constraint premium_access_customer_id_not_blank
    check (
      stripe_customer_id is null
      or char_length(btrim(stripe_customer_id)) > 0
    );

-- Preserve only the latest existing entitlement per user before enforcing one row per user.
-- A later purchase overwrites the previous entitlement by business requirement.
delete from public.premium_access as older
using public.premium_access as newer
where older.user_id = newer.user_id
  and (
    older.purchase_date < newer.purchase_date
    or (
      older.purchase_date = newer.purchase_date
      and older.id < newer.id
    )
  );

create unique index premium_access_user_unique
  on public.premium_access (user_id);

create unique index premium_access_checkout_session_unique
  on public.premium_access (stripe_checkout_session_id)
  where stripe_checkout_session_id is not null;

create index premium_access_stripe_customer_idx
  on public.premium_access (stripe_customer_id)
  where stripe_customer_id is not null;

-- Atomically grant or replace Premium access after a verified Stripe webhook.
--
-- Idempotency:
-- - Retrying the same Checkout Session updates the same user row harmlessly.
-- - stripe_checkout_session_id is globally unique.
-- - An older event cannot overwrite access from a newer purchase.
--
-- Security:
-- - Only service_role can execute this function.
-- - Browser roles retain SELECT-only access through the existing RLS policy.
create or replace function public.grant_premium_access_from_stripe(
  p_user_id uuid,
  p_plan public.premium_plan,
  p_purchase_date timestamptz,
  p_expires_at timestamptz,
  p_is_lifetime boolean,
  p_stripe_checkout_session_id text,
  p_stripe_customer_id text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected_rows integer;
begin
  if p_user_id is null then
    raise exception 'A user ID is required';
  end if;

  if p_stripe_checkout_session_id is null
    or char_length(btrim(p_stripe_checkout_session_id)) = 0 then
    raise exception 'A Stripe Checkout Session ID is required';
  end if;

  if p_stripe_customer_id is null
    or char_length(btrim(p_stripe_customer_id)) = 0 then
    raise exception 'A Stripe Customer ID is required';
  end if;

  if (
    p_plan = 'lifetime'
    and (p_is_lifetime is distinct from true or p_expires_at is not null)
  ) or (
    p_plan <> 'lifetime'
    and (
      p_is_lifetime is distinct from false
      or p_expires_at is null
      or p_expires_at <= p_purchase_date
    )
  ) then
    raise exception 'Premium plan and expiry values are inconsistent';
  end if;

  insert into public.premium_access (
    user_id,
    plan,
    purchase_date,
    expires_at,
    is_lifetime,
    stripe_payment_id,
    stripe_checkout_session_id,
    stripe_customer_id,
    created_at
  )
  values (
    p_user_id,
    p_plan,
    p_purchase_date,
    p_expires_at,
    p_is_lifetime,
    p_stripe_checkout_session_id,
    p_stripe_checkout_session_id,
    p_stripe_customer_id,
    now()
  )
  on conflict (user_id) do update
  set
    plan = excluded.plan,
    purchase_date = excluded.purchase_date,
    expires_at = excluded.expires_at,
    is_lifetime = excluded.is_lifetime,
    stripe_payment_id = excluded.stripe_payment_id,
    stripe_checkout_session_id = excluded.stripe_checkout_session_id,
    stripe_customer_id = excluded.stripe_customer_id,
    created_at = now()
  where
    public.premium_access.purchase_date <= excluded.purchase_date
    or public.premium_access.stripe_checkout_session_id =
      excluded.stripe_checkout_session_id;

  get diagnostics affected_rows = row_count;
  return affected_rows > 0;
end;
$$;

comment on function public.grant_premium_access_from_stripe(
  uuid,
  public.premium_plan,
  timestamptz,
  timestamptz,
  boolean,
  text,
  text
) is
  'Service-role-only, idempotent Premium grant used after a verified paid checkout.session.completed event.';

revoke all on function public.grant_premium_access_from_stripe(
  uuid,
  public.premium_plan,
  timestamptz,
  timestamptz,
  boolean,
  text,
  text
) from public, anon, authenticated;

grant execute on function public.grant_premium_access_from_stripe(
  uuid,
  public.premium_plan,
  timestamptz,
  timestamptz,
  boolean,
  text,
  text
) to service_role;


-- >>> 20260728163500_add_progress_metrics.sql
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


-- >>> 20260728170000_add_question_admin.sql
-- Secure question-management schema for the Life in the UK admin dashboard.
-- This migration follows 20260728163500_add_progress_metrics.sql.

create type public.question_status as enum ('draft', 'published');
create type public.question_audit_action as enum ('create', 'update', 'delete');

create extension if not exists pg_trgm with schema extensions;

create table public.admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null
);

comment on table public.admin_users is
  'Explicit allow-list of Supabase Auth users permitted to access question administration.';
comment on column public.admin_users.created_by is
  'Trusted administrator or service-role actor that granted admin access.';

create table public.question_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint question_categories_name_length
    check (char_length(btrim(name)) between 1 and 100),
  constraint question_categories_slug_format
    check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

comment on table public.question_categories is
  'Categories used to organise Life in the UK questions in the learner and admin interfaces.';

create or replace function public.valid_question_options(value jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select
    jsonb_typeof(value) = 'array'
    and jsonb_array_length(value) = 4
    and not exists (
      select 1
      from jsonb_array_elements_text(value) as option_text
      where char_length(btrim(option_text)) = 0
    );
$$;

comment on function public.valid_question_options(jsonb) is
  'Validates that question options contain exactly four non-empty strings.';

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  external_id text not null unique,
  category_id uuid not null references public.question_categories (id) on delete restrict,
  prompt text not null,
  options jsonb not null,
  correct_index smallint not null,
  explanation_markdown text not null,
  status public.question_status not null default 'draft',
  created_by uuid not null references auth.users (id) on delete restrict,
  updated_by uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  constraint questions_external_id_format
    check (external_id ~ '^[a-z0-9][a-z0-9_-]{2,119}$'),
  constraint questions_prompt_length
    check (char_length(btrim(prompt)) between 1 and 1000),
  constraint questions_valid_options
    check (public.valid_question_options(options)),
  constraint questions_correct_index
    check (correct_index between 0 and 3),
  constraint questions_explanation_length
    check (char_length(btrim(explanation_markdown)) between 1 and 20000),
  constraint questions_published_at_consistency
    check (
      (status = 'published' and published_at is not null)
      or
      (status = 'draft' and published_at is null)
    )
);

comment on table public.questions is
  'Admin-managed Life in the UK multiple-choice questions with Markdown explanations and draft/published workflow.';
comment on column public.questions.external_id is
  'Stable application/import identifier used by progress and bulk operations.';
comment on column public.questions.options is
  'JSON array containing exactly four non-empty answer strings.';
comment on column public.questions.correct_index is
  'Zero-based index of the correct option.';
comment on column public.questions.explanation_markdown is
  'Markdown explanation rendered without raw HTML in the admin preview.';

create index questions_category_status_idx
  on public.questions (category_id, status);
create index questions_status_updated_idx
  on public.questions (status, updated_at desc);
create index questions_prompt_trigram_idx
  on public.questions using gin (prompt extensions.gin_trgm_ops);

create table public.question_audit_log (
  id bigint generated always as identity primary key,
  question_id uuid references public.questions (id) on delete set null,
  question_external_id text not null,
  admin_user_id uuid references auth.users (id) on delete set null,
  action public.question_audit_action not null,
  old_record jsonb,
  new_record jsonb,
  created_at timestamptz not null default now()
);

comment on table public.question_audit_log is
  'Immutable audit history generated automatically for every question create, update, and delete.';
comment on column public.question_audit_log.old_record is
  'Question row before update/delete, captured as JSON.';
comment on column public.question_audit_log.new_record is
  'Question row after create/update, captured as JSON.';

create index question_audit_log_created_idx
  on public.question_audit_log (created_at desc);
create index question_audit_log_question_idx
  on public.question_audit_log (question_external_id, created_at desc);
create index question_audit_log_admin_idx
  on public.question_audit_log (admin_user_id, created_at desc);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.admin_users
    where user_id = (select auth.uid())
  );
$$;

comment on function public.is_admin() is
  'Returns true only when auth.uid() is present in the server-managed admin allow-list.';

revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger question_categories_set_updated_at
  before update on public.question_categories
  for each row execute function public.set_updated_at();

create or replace function public.set_question_metadata()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
begin
  if tg_op = 'INSERT' then
    new.created_by = coalesce(actor_id, new.created_by);
  else
    new.created_by = old.created_by;
  end if;

  new.updated_by = coalesce(actor_id, new.updated_by);
  new.updated_at = now();

  if new.status = 'published' and (
    tg_op = 'INSERT'
    or old.status is distinct from 'published'
    or new.published_at is null
  ) then
    new.published_at = now();
  elsif new.status = 'draft' then
    new.published_at = null;
  end if;

  return new;
end;
$$;

create trigger questions_set_metadata
  before insert or update on public.questions
  for each row execute function public.set_question_metadata();

create or replace function public.audit_question_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.question_audit_log (
      question_id,
      question_external_id,
      admin_user_id,
      action,
      old_record,
      new_record
    )
    values (
      new.id,
      new.external_id,
      (select auth.uid()),
      'create',
      null,
      to_jsonb(new)
    );
    return new;
  elsif tg_op = 'UPDATE' then
    insert into public.question_audit_log (
      question_id,
      question_external_id,
      admin_user_id,
      action,
      old_record,
      new_record
    )
    values (
      new.id,
      new.external_id,
      (select auth.uid()),
      'update',
      to_jsonb(old),
      to_jsonb(new)
    );
    return new;
  else
    insert into public.question_audit_log (
      question_id,
      question_external_id,
      admin_user_id,
      action,
      old_record,
      new_record
    )
    values (
      null,
      old.external_id,
      (select auth.uid()),
      'delete',
      to_jsonb(old),
      null
    );
    return old;
  end if;
end;
$$;

comment on function public.audit_question_change() is
  'Security-definer trigger that records immutable question changes regardless of client audit-table permissions.';

create trigger questions_write_audit_log
  after insert or update or delete on public.questions
  for each row execute function public.audit_question_change();

alter table public.admin_users enable row level security;
alter table public.question_categories enable row level security;
alter table public.questions enable row level security;
alter table public.question_audit_log enable row level security;

-- Admin allow-list: an admin can confirm their own membership, but browser clients
-- cannot grant or revoke admin roles.
create policy "Admins can read their own admin membership"
  on public.admin_users
  for select
  to authenticated
  using (user_id = (select auth.uid()));

comment on policy "Admins can read their own admin membership" on public.admin_users is
  'Exposes only the current user allow-list row; admin role mutations remain service-role-only.';

-- Categories are readable by authenticated learners and manageable only by admins.
create policy "Authenticated users can read question categories"
  on public.question_categories
  for select
  to authenticated
  using (true);

create policy "Admins can manage question categories"
  on public.question_categories
  for all
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

comment on policy "Admins can manage question categories" on public.question_categories is
  'Only allow-listed administrators can create, update, or delete categories.';

-- Learners see published questions only; admins see and manage both statuses.
create policy "Authenticated users can read published questions"
  on public.questions
  for select
  to authenticated
  using (status = 'published');

comment on policy "Authenticated users can read published questions" on public.questions is
  'Prevents learners from seeing draft question content.';

create policy "Admins can manage all questions"
  on public.questions
  for all
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

comment on policy "Admins can manage all questions" on public.questions is
  'Allows only allow-listed administrators to read drafts and perform question CRUD.';

-- Audit history is read-only for admins; writes happen only through the trigger.
create policy "Admins can read question audit history"
  on public.question_audit_log
  for select
  to authenticated
  using ((select public.is_admin()));

comment on policy "Admins can read question audit history" on public.question_audit_log is
  'Only administrators can inspect the immutable question audit trail.';

revoke insert, update, delete on public.admin_users from anon, authenticated;
revoke insert, update, delete on public.question_audit_log from anon, authenticated;

-- Bootstrap the first administrator manually with the service role or SQL Editor:
-- insert into public.admin_users (user_id) values ('AUTH_USER_UUID');


-- >>> 20260729153500_add_anonymous_progress_migration.sql
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

