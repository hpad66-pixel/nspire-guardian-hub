import { describe, expect, it } from "vitest";
import { isPlatformSuperAdmin } from "../platformAdmin";

describe("isPlatformSuperAdmin", () => {
  it("recognizes the protected super-admin claim", () => {
    expect(isPlatformSuperAdmin({ app_metadata: { role: "super_admin" } })).toBe(true);
  });

  it("does not elevate ordinary or missing claims", () => {
    expect(isPlatformSuperAdmin({ app_metadata: { role: "authenticated" } })).toBe(false);
    expect(isPlatformSuperAdmin({})).toBe(false);
    expect(isPlatformSuperAdmin(null)).toBe(false);
  });
});
