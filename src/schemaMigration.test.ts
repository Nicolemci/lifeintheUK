import { describe, expect, it } from "vitest";
import migrationSql from "../supabase/migrations/20260728154400_create_core_schema.sql?raw";
import webhookMigrationSql from "../supabase/migrations/20260728162000_add_stripe_webhook_grant.sql?raw";
import progressMigrationSql from "../supabase/migrations/20260728163500_add_progress_metrics.sql?raw";
import adminMigrationSql from "../supabase/migrations/20260728170000_add_question_admin.sql?raw";

const migration = migrationSql.toLowerCase();
const webhookMigration = webhookMigrationSql.toLowerCase();
const progressMigration = progressMigrationSql.toLowerCase();
const adminMigration = adminMigrationSql.toLowerCase();

const tables = ["profiles", "premium_access", "quiz_progress", "mock_tests", "bookmarks"];

describe("Supabase core schema migration", () => {
  it("creates every requested table with auth user ownership", () => {
    tables.forEach((table) => {
      expect(migration).toContain(`create table public.${table}`);
    });

    expect(migration.match(/references auth\.users \(id\) on delete cascade/g)).toHaveLength(5);
  });

  it("enables RLS on every application table", () => {
    tables.forEach((table) => {
      expect(migration).toContain(`alter table public.${table} enable row level security`);
    });
  });

  it("uses auth.uid ownership checks for user-owned data", () => {
    expect(migration).toContain("(select auth.uid()) = id");
    expect(migration).toContain("(select auth.uid()) = user_id");
  });

  it("keeps premium writes restricted to trusted server code", () => {
    expect(migration).toContain('create policy "users can read their own premium access"');
    expect(migration).not.toContain('create policy "users can insert their own premium access"');
    expect(migration).not.toContain('create policy "users can update their own premium access"');
    expect(migration).not.toContain('create policy "users can delete their own premium access"');
  });

  it("constrains plans, scores, bookmarks, and Stripe payment IDs", () => {
    expect(migration).toContain("create type public.premium_plan as enum");
    expect(migration).toContain("check (score between 0 and 100)");
    expect(migration).toContain("unique (user_id, question_id)");
    expect(migration).toContain("premium_access_stripe_payment_id_unique");
  });

  it("adds webhook identity fields and one entitlement per user", () => {
    expect(webhookMigration).toContain("stripe_checkout_session_id text");
    expect(webhookMigration).toContain("stripe_customer_id text");
    expect(webhookMigration).toContain("premium_access_user_unique");
    expect(webhookMigration).toContain("premium_access_checkout_session_unique");
  });

  it("uses a service-role-only atomic Premium grant", () => {
    expect(webhookMigration).toContain(
      "function public.grant_premium_access_from_stripe",
    );
    expect(webhookMigration).toContain("on conflict (user_id) do update");
    expect(webhookMigration).toContain(
      "public.premium_access.purchase_date <= excluded.purchase_date",
    );
    expect(webhookMigration).toContain("from public, anon, authenticated");
    expect(webhookMigration).toContain("to service_role");
  });

  it("stores complete mock-test metrics", () => {
    expect(progressMigration).toContain("add column percentage smallint");
    expect(progressMigration).toContain("add column duration_seconds integer");
    expect(progressMigration).toContain("mock_tests_score_correct_answers");
    expect(progressMigration).toContain("mock_tests_duration_non_negative");
  });

  it("adds an authenticated cross-device progress summary", () => {
    expect(progressMigration).toContain("function public.get_user_progress_summary");
    expect(progressMigration).toContain("total_questions_answered bigint");
    expect(progressMigration).toContain("accuracy_percentage integer");
    expect(progressMigration).toContain("mock_tests_completed bigint");
    expect(progressMigration).toContain("average_score integer");
    expect(progressMigration).toContain("wrong_question_ids text[]");
    expect(progressMigration).toContain("where user_id = (select auth.uid())");
    expect(progressMigration).toContain("to authenticated");
  });

  it("creates admin, category, question, and immutable audit tables", () => {
    expect(adminMigration).toContain("create table public.admin_users");
    expect(adminMigration).toContain("create table public.question_categories");
    expect(adminMigration).toContain("create table public.questions");
    expect(adminMigration).toContain("create table public.question_audit_log");
    expect(adminMigration).toContain("create trigger questions_write_audit_log");
  });

  it("enables RLS and separates learner and administrator question access", () => {
    expect(adminMigration).toContain("alter table public.admin_users enable row level security");
    expect(adminMigration).toContain(
      "alter table public.question_categories enable row level security",
    );
    expect(adminMigration).toContain("alter table public.questions enable row level security");
    expect(adminMigration).toContain(
      "alter table public.question_audit_log enable row level security",
    );
    expect(adminMigration).toContain(
      'create policy "authenticated users can read published questions"',
    );
    expect(adminMigration).toContain('create policy "admins can manage all questions"');
    expect(adminMigration).toContain("status = 'published'");
    expect(adminMigration).toContain("(select public.is_admin())");
  });

  it("keeps admin grants and audit writes server controlled", () => {
    expect(adminMigration).toContain(
      "revoke insert, update, delete on public.admin_users from anon, authenticated",
    );
    expect(adminMigration).toContain(
      "revoke insert, update, delete on public.question_audit_log from anon, authenticated",
    );
    expect(adminMigration).toContain("security definer");
    expect(adminMigration).toContain("insert into public.admin_users");
  });
});
