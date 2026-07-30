# Supabase migrations

The migration files in this directory are intended for the Supabase CLI migration workflow.

## Apply the schema (required)

Premium status and Checkout activation both require these migrations on the live Supabase
project. If `premium_access` is missing, Premium purchases cannot be stored.

**Project:** `qkvgbguigytbqwxglayy`

### Fastest method (SQL Editor)

1. Open the SQL Editor:  
   https://supabase.com/dashboard/project/qkvgbguigytbqwxglayy/sql/new
2. Paste the full contents of [`APPLY_ALL.sql`](./APPLY_ALL.sql)
3. Click **Run**
4. Refresh the website

### CLI method

```bash
npx supabase login
npx supabase link --project-ref qkvgbguigytbqwxglayy
npx supabase db push
```

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
