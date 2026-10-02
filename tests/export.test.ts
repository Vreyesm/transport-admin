import { test } from "node:test";
import assert from "node:assert/strict";
import { scheduleRows, scheduleCSV, csvCell } from "../src/lib/export";
import { UnsavedChanges } from "../src/lib/unsaved";
import { Vehicle, Occupation } from "../src/lib/types";
const vehicle = { id: "v", name: "Bus, municipal", plate: "AB1234" } as Vehicle;
const trip: Occupation = {
  id: "o",
  vehicle_id: "v",
  kind: "reservation",
  cancelled: false,
  starts_at: "2026-10-01T23:00:00Z",
  ends_at: "2026-10-03T03:00:00Z",
  responsible: "PRIVATE-RESPONSIBLE",
  destination: "PRIVATE-DESTINATION",
  contact: "PRIVATE-CONTACT",
  notes: "PRIVATE-NOTE",
};
test("public exports use an allowlist even when passed administrative data", () => {
  const report = scheduleRows(
    [trip, { ...trip, id: "cancelled", cancelled: true }],
    [vehicle],
    "2026-10-02",
    false,
    false,
    true,
  );
  assert.equal(report.rows.length, 1);
  const csv = scheduleCSV(report.headers, report.rows);
  assert.ok(!csv.includes("PRIVATE"));
  assert.ok(!csv.includes("Responsable"));
  assert.ok(csv.includes("2026-10-01 20:00"));
  assert.ok(csv.includes("2026-10-03 00:00"));
});
test("admin export respects vehicle filters, week, overlap boundaries and explicit cancellation", () => {
  const report = scheduleRows(
    [trip, { ...trip, id: "c", cancelled: true }],
    [vehicle],
    "2026-10-02",
    true,
    true,
  );
  assert.equal(report.start, "2026-09-28");
  assert.equal(report.end, "2026-10-04");
  assert.equal(report.rows.length, 1);
  assert.ok(
    scheduleCSV(report.headers, report.rows).includes("PRIVATE-CONTACT"),
  );
  assert.equal(
    scheduleRows([trip], [], "2026-10-02", false, true).rows.length,
    0,
  );
  assert.equal(
    scheduleRows(
      [{ ...trip, cancelled: true }],
      [vehicle],
      "2026-10-02",
      false,
      true,
      true,
    ).rows.length,
    1,
  );
  assert.equal(
    scheduleRows([trip], [vehicle], "2026-10-03", false, true).rows.length,
    0,
  );
});
test("CSV escapes cells and neutralizes formula prefixes including controls", () => {
  for (const value of [
    "=1+1",
    "+cmd",
    "-1",
    "@SUM(A1)",
    " \t=CMD()",
    "\rvalue",
    "\nvalue",
    "\tvalue",
  ])
    assert.ok(csvCell(value).startsWith("\"'"));
  assert.equal(csvCell('Bus, "A"'), '"Bus, ""A"""');
  assert.ok(scheduleCSV(["a"], [["a\nb"]]).includes('"a\nb"'));
});
test("discard refusal preserves dirtiness; acceptance invokes only the pending action", () => {
  const guard = new UnsavedChanges();
  guard.authorize(true);
  let exits = 0;
  guard.request(() => exits++);
  assert.equal(exits, 1);
  guard.mark();
  guard.request(() => exits++);
  assert.equal(exits, 1);
  guard.reject();
  assert.equal(guard.isDirty(), true);
  assert.equal(exits, 1);
  guard.request(() => exits++);
  guard.accept();
  assert.equal(exits, 2);
  assert.equal(guard.isDirty(), false);
});
test("cancellation requires explicit confirmation even for a clean editor", () => {
  const guard = new UnsavedChanges();
  guard.authorize(true);
  let cancelled = false;
  guard.request(() => {
    cancelled = true;
  }, "Cancel assignment?");
  assert.equal(cancelled, false);
  guard.reject();
  assert.equal(cancelled, false);
  guard.request(() => {
    cancelled = true;
  }, "Cancel assignment?");
  guard.accept();
  assert.equal(cancelled, true);
});
test("authorization loss discards pending actions and never blocks public closure", () => {
  const guard = new UnsavedChanges();
  guard.authorize(true);
  guard.mark();
  let exits = 0;
  guard.request(() => exits++);
  guard.authorize(false);
  guard.accept();
  assert.equal(exits, 0);
  assert.equal(guard.pending, null);
  assert.equal(guard.isDirty(), false);
  guard.request(() => exits++);
  assert.equal(exits, 1);
});

test("confirmed mutation preserves dirty draft until successful persistence", () => {
  const guard = new UnsavedChanges();
  guard.authorize(true);
  guard.mark();
  guard.request(() => {}, "Cancel assignment?");
  guard.accept();
  assert.equal(guard.isDirty(), true);
  guard.clear();
  assert.equal(guard.isDirty(), false);
});
