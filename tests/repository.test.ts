import { test } from "node:test";
import assert from "node:assert/strict";

test("admin calendar loads legacy and migrated schemas without requesting a missing column", async () => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://repository.test";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-key";
  const { supabase } = await import("../src/lib/supabase");
  const { loadData } = await import("../src/lib/repository");
  const originalFetch = globalThis.fetch;
  const originalGetUser = supabase!.auth.getUser;
  supabase!.auth.getUser = async () =>
    ({ data: { user: { id: "admin" } }, error: null }) as Awaited<
      ReturnType<typeof originalGetUser>
    >;
  let migrated = false;
  let denied = false;
  globalThis.fetch = async (input) => {
    const url = new URL(String(input));
    const table = url.pathname.split("/").at(-1);
    if (table === "settings") assert.equal(url.searchParams.get("select"), "*");
    const version = migrated ? { version: 1 } : {};
    const body = denied
      ? { code: "42501", message: "permission denied" }
      : table === "admin_profiles"
        ? { id: "admin" }
        : table === "settings"
          ? { name: "Municipalidad", color: "#2563eb", logo: "", ...version }
          : [{ id: table, ...version }];
    return new Response(JSON.stringify(body), {
      status: denied ? 403 : 200,
      headers: { "Content-Type": "application/json" },
    });
  };
  try {
    const legacy = await loadData(true);
    assert.equal(legacy.requiresMigration, true);
    assert.equal(legacy.vehicles.length, 1);
    assert.equal(legacy.occupations.length, 1);
    assert.equal(legacy.settings.name, "Municipalidad");
    migrated = true;
    const current = await loadData(true);
    assert.equal(current.requiresMigration, false);
    assert.equal(current.settings.version, 1);
    denied = true;
    await assert.rejects(loadData(true), { code: "42501" });
  } finally {
    globalThis.fetch = originalFetch;
    supabase!.auth.getUser = originalGetUser;
  }
});
