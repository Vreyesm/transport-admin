import { test } from "node:test";
import assert from "node:assert/strict";
import { persistPhotoDraft } from "../src/lib/photo-draft";
import type { Vehicle } from "../src/lib/types";
const vehicle: Vehicle = {
  id: "vehicle",
  name: "Bus",
  plate: "TEST01",
  type: "bus",
  brand: "",
  model: "",
  year: 2026,
  capacity: 20,
  features: "",
  archived: false,
  photos: ["blob:new", "https://photo/keep"],
};
const files = () =>
  new Map([
    ["blob:new", new File(["photo"], "photo.png", { type: "image/png" })],
  ]);
test("photo removal follows successful persistence, preserving photos still in the draft", async () => {
  const calls: string[] = [];
  await persistPhotoDraft(
    vehicle,
    files(),
    ["https://photo/keep", "https://photo/remove"],
    {
      upload: async () => "https://photo/new",
      save: async (v) => {
        assert.deepEqual(v.photos, ["https://photo/new", "https://photo/keep"]);
        calls.push("saved");
      },
      remove: async (urls) => {
        assert.deepEqual(urls, ["https://photo/remove"]);
        calls.push("removed");
      },
    },
    () => true,
  );
  assert.deepEqual(calls, ["saved", "removed"]);
});
test("a stale save cleans only new uploads, preserving original photos", async () => {
  const removed: string[][] = [];
  await assert.rejects(
    persistPhotoDraft(
      vehicle,
      files(),
      ["https://photo/keep"],
      {
        upload: async () => "https://photo/new",
        save: async () => {
          throw new Error("Otro administrador modificó este registro");
        },
        remove: async (urls) => {
          removed.push(urls);
        },
      },
      () => true,
    ),
    /Otro administrador/,
  );
  assert.deepEqual(removed, [["https://photo/new"]]);
});
test("logout during upload prevents the vehicle write and cleans the upload", async () => {
  let active = true;
  const removed: string[][] = [];
  await assert.rejects(
    persistPhotoDraft(
      vehicle,
      files(),
      [],
      {
        upload: async () => {
          active = false;
          return "https://photo/new";
        },
        save: async () => {
          assert.fail("No write after logout");
        },
        remove: async (urls) => {
          removed.push(urls);
        },
      },
      () => active,
    ),
    /sesión cambió/,
  );
  assert.deepEqual(removed, [["https://photo/new"]]);
});
test("cleanup failure after save is reported as a successful save with a warning", async () => {
  let saved = false;
  const warning = await persistPhotoDraft(
    { ...vehicle, photos: [] },
    new Map(),
    ["https://photo/remove"],
    {
      upload: async () => {
        assert.fail("No staged files");
      },
      save: async () => {
        saved = true;
      },
      remove: async () => {
        throw new Error("Offline");
      },
    },
    () => true,
  );
  assert.ok(saved);
  assert.match(warning!, /Cambios guardados/);
});
