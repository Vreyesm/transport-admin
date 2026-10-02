import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

test("local startup without seed prepares public configuration without an admin key or seed files", () => {
  const dir = mkdtempSync(join(tmpdir(), "transport-provision-"));
  try {
    const result = spawnSync(
      process.execPath,
      [resolve("scripts/provision-local.mjs")],
      {
        cwd: dir,
        input: JSON.stringify({
          API_URL: "http://127.0.0.1:54321",
          ANON_KEY: "public-test",
        }),
        encoding: "utf8",
      },
    );
    assert.equal(result.status, 0, result.stderr);
    assert.equal(
      readFileSync(join(dir, ".env.docker.local"), "utf8"),
      "NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321\nNEXT_PUBLIC_SUPABASE_ANON_KEY=public-test\n",
    );
    assert.equal(
      result.stdout.includes("Administrador local disponible"),
      false,
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("admin seed requires explicit opt-in and private local credentials; remote provisioning is rejected", () => {
  for (const [args, status] of [
    [
      ["--seed-admin"],
      { API_URL: "http://127.0.0.1:54321", ANON_KEY: "public-test" },
    ],
    [[], { API_URL: "https://project.supabase.co", ANON_KEY: "public-test" }],
  ] as const) {
    const result = spawnSync(
      process.execPath,
      [resolve("scripts/provision-local.mjs"), ...args],
      {
        input: JSON.stringify(status),
        encoding: "utf8",
      },
    );
    assert.notEqual(result.status, 0);
  }
});
