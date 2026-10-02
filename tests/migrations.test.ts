import { test } from "node:test";
import assert from "node:assert/strict";
import { migrationPlan, redact } from "../scripts/migration-plan.mjs";

const local = {
  NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "public-key",
  SUPABASE_DB_URL: "postgresql://postgres:secret@127.0.0.1:54322/postgres",
};

test("demo skips migration; configured app fails closed without database credentials", () => {
  assert.equal(migrationPlan({}), null);
  assert.throws(() =>
    migrationPlan({ NEXT_PUBLIC_SUPABASE_URL: local.NEXT_PUBLIC_SUPABASE_URL }),
  );
  assert.throws(() => migrationPlan({ ...local, SUPABASE_DB_URL: "" }));
  assert.throws(() =>
    migrationPlan({
      ...local,
      SUPABASE_DB_URL: "postgresql://postgres@localhost:54322/postgres",
    }),
  );
});

test("local and Docker startup use pending migrations without seed, keeping passwords off argv", () => {
  for (const host of ["127.0.0.1", "supabase_db_transport-admin"]) {
    const plan = migrationPlan({
      ...local,
      SUPABASE_DB_URL: `postgresql://postgres:secret@${host}:54322/postgres`,
    });
    assert.ok(plan);
    assert.equal(plan.password, "secret");
    assert.equal(plan.args.includes("--include-seed"), false);
    assert.equal(plan.args.join(" ").includes("secret"), false);
    assert.match(plan.args[3], /sslmode=disable/);
    assert.deepEqual(plan.args.slice(0, 3), ["db", "push", "--db-url"]);
  }
});

test("remote migrations require the same project and TLS", () => {
  const remote = {
    ...local,
    NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
  };
  for (const url of [
    "postgresql://postgres:secret@db.project.supabase.co/postgres",
    "postgresql://postgres.project:secret@aws-0-region.pooler.supabase.com:5432/postgres",
  ]) {
    const plan = migrationPlan({ ...remote, SUPABASE_DB_URL: url });
    assert.ok(plan);
    assert.match(plan.args[3], /sslmode=require/);
  }
  for (const url of [
    local.SUPABASE_DB_URL,
    "postgresql://postgres:secret@db.other.supabase.co/postgres",
    "postgresql://postgres:secret@db.project.supabase.co/postgres?sslmode=disable",
    "postgresql://postgres:secret@db.project.supabase.co/postgres?host=db.other.supabase.co",
    "postgresql://postgres.project:secret@aws-0-region.pooler.supabase.com:6543/postgres",
    "not-a-url",
  ]) {
    assert.throws(() => migrationPlan({ ...remote, SUPABASE_DB_URL: url }));
  }
});

test("CLI diagnostics redact plain and URL-encoded secrets", () => {
  assert.equal(
    redact("error p@ss p%40ss", ["p@ss"]),
    "error [REDACTADO] [REDACTADO]",
  );
});
