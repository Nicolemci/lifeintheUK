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
- Future Stripe webhook code must write premium access using a trusted server environment and the Supabase service-role key.
- Never expose the service-role key in Vite or other browser code.
