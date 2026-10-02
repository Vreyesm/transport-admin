import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
const base = process.env.TEST_BASE_URL || "http://localhost:3000";
let cookie = "";
async function request(
  path,
  body,
  method = body === undefined ? "GET" : "POST",
  expected = 200,
) {
  const response = await fetch(base + "/api/" + path, {
    method,
    headers: {
      Origin: base,
      Cookie: cookie,
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  assert.equal(response.status, expected, await response.clone().text());
  if (response.headers.get("set-cookie"))
    cookie = response.headers.get("set-cookie").split(";")[0];
  return response.json();
}
await request("data?admin=1", undefined, "GET", 401);
await request("session", {
  email: process.env.ADMIN_EMAIL,
  password: process.env.ADMIN_PASSWORD,
});
const id = randomUUID();
const vehicle = {
  id,
  name: "Integration",
  plate: randomUUID().slice(0, 8),
  type: "bus",
  brand: "",
  model: "",
  year: 2020,
  capacity: 20,
  features: "",
  notes: "PRIVATE",
  archived: false,
  photos: [],
};
await request("vehicles", vehicle);
const occupation = {
  id: randomUUID(),
  vehicle_id: id,
  kind: "reservation",
  starts_at: "2030-01-01T10:00:00Z",
  ends_at: "2030-01-01T11:00:00Z",
  contact: "PRIVATE",
};
await request("occupations", occupation);
await request("occupations", { ...occupation, id: randomUUID() }, "POST", 409);
const data = await request("data?admin=1");
const saved = data.vehicles.find((v) => v.id === id);
await request("vehicles", { ...saved, name: "Updated" });
await request("vehicles", saved, "POST", 409);
const pub = await request("data");
assert.ok(!JSON.stringify(pub).includes("PRIVATE"));
assert.ok((await request("audit?entity=vehicles")).count > 0);
const photo = await fetch(base + "/api/photos", {
  method: "POST",
  headers: { Origin: base, Cookie: cookie, "Content-Type": "image/png" },
  body: Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jA1sAAAAASUVORK5CYII=",
    "base64",
  ),
});
assert.equal(photo.status, 200);
const { url } = await photo.json();
const latest = (await request("data?admin=1")).vehicles.find(
  (v) => v.id === id,
);
await request("vehicles", { ...latest, photos: [url] });
await request("photos", { urls: [url] }, "DELETE");
assert.equal((await fetch(base + url)).status, 200);
await request("session", {}, "DELETE");
await request("settings", data.settings, "POST", 401);
console.log(
  "Integration passed: auth, writes, overlap, stale versions, privacy, audit, photos, logout.",
);
