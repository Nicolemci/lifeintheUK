# Supabase migrations

The migration files in this directory are intended for the Supabase CLI migration workflow.

## Apply the schema

Premium status and Checkout activation both require these migrations to be applied to the live
Supabase project. If `premium_access` is missing, the app shows Premium status errors and the
Stripe webhook cannot grant access after payment.

Project ref used by this app:

`qkvgbguigytbqwxglayy`

After linking the local repository to the correct Supabase project:

```bash
npx supabase link --project-ref qkvgbguigytbqwxglayy
npx supabase db push
```

Alternatively, open the Supabase SQL Editor and run every file in `supabase/migrations/` in
filename order:

1. `20260728154400_create_core_schema.sql`
2. `20260728162000_add_stripe_webhook_grant.sql`
3. `20260728163500_add_progress_metrics.sql`
4. `20260728170000_add_question_admin.sql`
5. `20260729153500_add_anonymous_progress_migration.sql`

## Security model

- Every application table has Row Level Security enabled.
- Authenticated users can access only rows owned by their `auth.uid()`.
- `premium_access` intentionally has an owner-only `SELECT` policy and no browser write policies.
- The Stripe webhook writes Premium access through the service-role-only
  `grant_premium_access_from_stripe` RPC.
- The RPC makes Checkout retries idempotent and prevents an older delayed event from replacing a
  newer entitlement.
- `get_user_progress_summary` calculates dashboard metrics and latest wrong-question IDs for
  `auth.uid()` in one RLS-protected database call.
- Each answer is appended to `quiz_progress`; each completed mock stores correct-answer score,
  percentage, completion time, and duration.
- Never expose the service-role key in Vite or other browser code.

## Bootstrap the first administrator

There is intentionally no browser policy for granting admin access. After the admin migration is
applied, add the first trusted Auth user through the Supabase SQL Editor:

```sql
insert into public.admin_users (user_id)
values ('AUTH_USER_UUID');
```

All `/admin/*` routes check this allow-list, and all question/category/audit operations are also
protected by RLS.

## Bulk question format

The admin dashboard imports and exports JSON in this shape:

```json
{
  "questions": [
    {
      "external_id": "history-magna-carta-001",
      "category_slug": "history",
      "prompt": "When was Magna Carta agreed?",
      "options": ["1066", "1215", "1689", "1707"],
      "correct_index": 1,
      "explanation_markdown": "**Magna Carta** was agreed in 1215.",
      "status": "published"
    }
  ]
}
```

Categories must exist before importing. Imports upsert by `external_id`, and the question audit
trigger records each created or updated row.

## Frictionless signup setting

The onboarding flow requires an active session immediately after email/password signup. In the
Supabase Dashboard:

1. Open **Authentication → Providers → Email**.
2. Turn off **Confirm email**.

The application deliberately treats a signup without a returned session as a configuration error
and does not show an email-confirmation flow.

Anonymous answers and the first five anonymous mock tests are stored in localStorage. After signup
or login, `migrate_anonymous_progress` transfers that browser batch atomically into the user's
Supabase progress and clears the local copy. The migration ID prevents duplicate imports on retry.

## Vercel environment variables for Stripe

Set these on the Vercel project (Production + Preview):

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_ONE_WEEK` (alias: `STRIPE_PRICE_1_WEEK`)
- `STRIPE_PRICE_TWO_WEEKS` (alias: `STRIPE_PRICE_2_WEEKS`)
- `STRIPE_PRICE_FOUR_WEEKS` (alias: `STRIPE_PRICE_4_WEEKS`)
- `STRIPE_PRICE_LIFETIME`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (webhook only)
