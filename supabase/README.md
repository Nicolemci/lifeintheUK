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
