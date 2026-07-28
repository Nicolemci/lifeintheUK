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
