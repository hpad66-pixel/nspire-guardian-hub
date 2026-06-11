/**
 * WS-4 · global search helpers (#9).
 *
 * happy:      matchesQuery finds a case-insensitive substring across fields;
 *             route builders produce the correct deep links.
 * validation: empty / whitespace query matches nothing (no firehose).
 * permission: N/A in pure layer — the data hooks return only RLS-scoped
 *             rows, so the user can never match what they cannot see.
 */
import { describe, it, expect } from "vitest";
import {
  matchesQuery,
  rfiRoute,
  submittalRoute,
  contactsRoute,
  documentsRoute,
} from "@/lib/global-search";

describe("matchesQuery", () => {
  it("happy: case-insensitive substring across multiple fields", () => {
    expect(matchesQuery(["Foundation pour", "rfi-12"], "found")).toBe(true);
    expect(matchesQuery(["Foundation pour", "rfi-12"], "RFI-12")).toBe(true);
    expect(matchesQuery([null, "ACME Concrete"], "acme")).toBe(true);
  });

  it("happy: no match returns false", () => {
    expect(matchesQuery(["Foundation pour"], "electrical")).toBe(false);
  });

  it("validation: empty / whitespace query matches nothing", () => {
    expect(matchesQuery(["anything"], "")).toBe(false);
    expect(matchesQuery(["anything"], "   ")).toBe(false);
  });

  it("validation: tolerates null/undefined fields", () => {
    expect(matchesQuery([null, undefined], "x")).toBe(false);
  });
});

describe("detail routes", () => {
  it("rfi / submittal deep-link to the right project tab", () => {
    expect(rfiRoute("p1")).toBe("/projects/p1?tab=rfis");
    expect(submittalRoute("p1")).toBe("/projects/p1?tab=submittals");
  });

  it("contacts / documents point at their org list pages", () => {
    expect(contactsRoute).toBe("/contacts");
    expect(documentsRoute).toBe("/documents");
  });
});
