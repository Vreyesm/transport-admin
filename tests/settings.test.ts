import { test } from "node:test";
import assert from "node:assert/strict";

test("settings save requires a returned row and rejects an RLS-hidden update", async () => {
  const { saveSettings } = await import("../src/modules/settings/repository");
  const originalFetch = globalThis.fetch;
  let visible = true;
  globalThis.fetch = async (_input, init) => {
    const headers = new Headers(init?.headers);
    assert.equal(headers.get("content-type"), "application/json");
    return new Response(
      JSON.stringify(
        visible ? { id: 1 } : { error: "El registro ya no existe." },
      ),
      {
        status: visible ? 200 : 409,
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
    await assert.rejects(saveSettings(draft), /El registro ya no existe/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
