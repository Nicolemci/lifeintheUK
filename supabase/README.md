# Supabase migrations

The migration files in this directory are intended for the Supabase CLI migration workflow.

## Apply the schema

After linking the local repository to the correct Supabase project:

```bash
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

Alternatively, review the migration and run it once through the Supabase SQL Editor.

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
