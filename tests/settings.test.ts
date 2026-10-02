import { test } from "node:test";
import assert from "node:assert/strict";

test("settings save requires a returned row and rejects an RLS-hidden update", async () => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://settings.test";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-key";
  const { saveSettings } = await import("../src/modules/settings/repository");
  const originalFetch = globalThis.fetch;
  let visible = true;
  globalThis.fetch = async (_input, init) => {
    const headers = new Headers(init?.headers);
    assert.equal(headers.get("accept"), "application/vnd.pgrst.object+json");
    return new Response(
      JSON.stringify(
        visible
          ? { id: 1 }
          : { code: "PGRST116", message: "The result contains 0 rows" },
      ),
      {
        status: visible ? 200 : 406,
        headers: { "Content-Type": "application/json" },
      },
    );
  };
  try {
    const draft = {
      name: "Municipalidad",
      color: "#2563eb",
      logo: "",
      version: 1,
    };
    await saveSettings(draft);
    visible = false;
    await assert.rejects(saveSettings(draft), { code: "PGRST116" });
  } finally {
    globalThis.fetch = originalFetch;
  }
});
