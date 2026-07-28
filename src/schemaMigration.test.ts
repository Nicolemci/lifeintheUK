import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve("supabase/migrations/20260728154400_create_core_schema.sql"),
  "utf8",
).toLowerCase();

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
});
