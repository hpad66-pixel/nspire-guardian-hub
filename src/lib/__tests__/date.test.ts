/**
 * WS-2 · date-only helpers (bug #6 off-by-one).
 *
 * happy:      toDateOnly serializes the LOCAL calendar day.
 * validation: round-trip through fromDateOnly never crosses a day
 *             boundary (the noon anchor), in any timezone.
 * permission: pure functions — no auth surface (RLS gates the writes
 *             that consume these strings).
 *
 * These assertions hold regardless of the machine timezone because
 * new Date(y, m, d) is local midnight and format() renders local time.
 * Run under `TZ=Asia/Dubai` (UTC+4) and `TZ=America/Los_Angeles`
 * (UTC-8) to confirm — the old `.toISOString().split('T')[0]` would
 * return 2026-06-10 under UTC+4.
 */
import { describe, it, expect } from "vitest";
import { toDateOnly, fromDateOnly } from "@/lib/date";

describe("toDateOnly", () => {
  it("happy: returns the local calendar day, not the UTC day", () => {
    // Local midnight, June 11 2026.
    expect(toDateOnly(new Date(2026, 5, 11))).toBe("2026-06-11");
    // Late-evening local time must still be the same calendar day.
    expect(toDateOnly(new Date(2026, 5, 11, 23, 30))).toBe("2026-06-11");
  });

  it("regression: differs from the old toISOString().split() bug for positive offsets", () => {
    const d = new Date(2026, 5, 11); // local midnight
    // Whatever the machine TZ, toDateOnly is stable to the local day.
    expect(toDateOnly(d)).toBe("2026-06-11");
  });
});

describe("fromDateOnly -> toDateOnly round-trip", () => {
  it("validation: a yyyy-MM-dd string survives a round-trip unchanged", () => {
    for (const s of ["2026-01-01", "2026-06-11", "2026-12-31", "2024-02-29"]) {
      expect(toDateOnly(fromDateOnly(s))).toBe(s);
    }
  });

  it("validation: parsed date sits at local noon so it never rolls a day", () => {
    const d = fromDateOnly("2026-06-11");
    expect(d.getHours()).toBe(12);
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(5);
    expect(d.getDate()).toBe(11);
  });
});
