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
