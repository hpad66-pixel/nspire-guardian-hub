import { describe, it, expect } from "vitest";
import { coLabel } from "../coLabel";

describe("coLabel", () => {
  it("formats as TYPE-### (3-digit pad) from the live co_no", () => {
    expect(coLabel("PCO", 7)).toBe("PCO-007");
    expect(coLabel("PCO", 10)).toBe("PCO-010");
    expect(coLabel("OCO", 123)).toBe("OCO-123");
  });
  it("defaults the type and returns empty for a null number", () => {
    expect(coLabel(null, 5)).toBe("CO-005");
    expect(coLabel("PCO", null)).toBe("");
  });
});
