import { test } from "node:test";
import assert from "node:assert/strict";
import { calendarDays, shiftDay, shiftMonth } from "../src/lib/calendar";
import { localDate } from "../src/lib/time";
test("calendar columns and navigation stay on Chile civil dates across browser zones", () => {
  const zone = process.env.TZ;
  try {
    for (const tz of [
      "America/Santiago",
      "UTC",
      "Asia/Tokyo",
      "Pacific/Auckland",
      "America/Los_Angeles",
    ]) {
      process.env.TZ = tz;
      const day = localDate(new Date("2026-10-02T01:00:00Z"));
      assert.equal(day, "2026-10-01");
      const month = calendarDays(day, false);
      assert.equal(month[0], "2026-09-28");
      assert.equal(month[3], "2026-10-01");
      assert.deepEqual(calendarDays(day, true), [
        "2026-09-28",
        "2026-09-29",
        "2026-09-30",
        "2026-10-01",
        "2026-10-02",
        "2026-10-03",
        "2026-10-04",
      ]);
      assert.equal(shiftMonth("2026-12-31", 1), "2027-01-01");
      assert.equal(shiftDay("2026-09-05", 1), "2026-09-06");
    }
  } finally {
    if (zone === undefined) delete process.env.TZ;
    else process.env.TZ = zone;
  }
});
