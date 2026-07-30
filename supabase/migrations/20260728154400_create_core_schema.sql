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
