import { test } from "node:test";
import assert from "node:assert/strict";
import { toUTC, localInput, overlaps, dayStart } from "../src/lib/time";
test("Chile summer and winter offset", () => {
  assert.equal(toUTC("2026-01-15T09:00"), "2026-01-15T12:00:00.000Z");
  assert.equal(toUTC("2026-07-15T09:00"), "2026-07-15T13:00:00.000Z");
});
test("round trip and multi-day", () => {
  assert.equal(localInput(toUTC("2026-10-01T09:30")), "2026-10-01T09:30");
  assert.ok(toUTC("2026-10-03T18:00") > toUTC("2026-10-01T09:00"));
});
test("half-open intervals allow adjacent reservations", () => {
  const a = {
    starts_at: toUTC("2026-10-01T09:00"),
    ends_at: toUTC("2026-10-01T10:00"),
  };
  assert.equal(
    overlaps(a, { starts_at: a.ends_at, ends_at: toUTC("2026-10-01T11:00") }),
    false,
  );
  assert.equal(
    overlaps(a, {
      starts_at: toUTC("2026-10-01T09:30"),
      ends_at: toUTC("2026-10-01T11:00"),
    }),
    true,
  );
});
test("nonexistent Chile DST hour is rejected", () => {
  assert.throws(() => toUTC("2026-09-06T00:30"));
});
test("day boundaries include shortened DST day", () => {
  assert.equal(dayStart("2026-09-06"), "2026-09-06T04:00:00.000Z");
  assert.equal(
    (Date.parse(dayStart("2026-09-07")) - Date.parse(dayStart("2026-09-06"))) /
      3600000,
    23,
  );
});
test("equivalent timestamp formats preserve adjacent intervals", () => {
  assert.equal(
    overlaps(
      {
        starts_at: "2026-10-01T12:00:00+00:00",
        ends_at: "2026-10-01T13:00:00+00:00",
      },
      {
        starts_at: "2026-10-01T13:00:00.000Z",
        ends_at: "2026-10-01T14:00:00.000Z",
      },
    ),
    false,
  );
});
