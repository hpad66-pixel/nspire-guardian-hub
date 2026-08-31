import { describe, it, expect } from "vitest";
import { g702LineCopy, g702SidebarRows } from "../g702Labels";

describe("g702Labels", () => {
  it("explains all nine progress-invoice lines with paid-to-date on line 7", () => {
    const rows = g702LineCopy(false);
    expect(rows).toHaveLength(9);
    expect(rows[6].label).toMatch(/paid to date/i);
    expect(rows[6].sub).toMatch(/paid/i);
    expect(rows[8].label).toMatch(/Balance to finish/i);
    expect(rows[8].sub).toMatch(/retainage still held/i);
  });

  it("rewrites line 9 for a final invoice as contract − completed (true unbuilt)", () => {
    const rows = g702LineCopy(true);
    expect(rows[7].label).toMatch(/FINAL/i);
    expect(rows[8].label).toMatch(/Unbilled|unbuilt/i);
    expect(rows[8].sub).toMatch(/Line 3.*Line 4/i);
    expect(rows[8].sub).toMatch(/will not be billed/i);
    expect(rows[8].sub).toMatch(/FINAL invoice closes the project/i);
    expect(rows[6].sub).toMatch(/paid/i);
  });

  it("builds sidebar rows with numbered labels", () => {
    const side = g702SidebarRows(true);
    expect(side[0][0]).toMatch(/^1\./);
    expect(side[8][1]).toBe("balance_to_finish");
    expect(side[8][0]).toMatch(/Unbilled/i);
  });
});
