import { describe, expect, it } from "vitest";
import { fieldsToContact } from "./cardIntake";

describe("business card field mapping", () => {
  it("maps a synthetic card into editable APAS CRM fields", () => {
    const result = fieldsToContact([
      { field: "name", value: "Morgan Rivera", confidence: 0.98, sourceSide: "front", reviewRequired: false },
      { field: "organization", value: "Harbor Build Partners", confidence: 0.95, sourceSide: "front", reviewRequired: false },
      { field: "email", value: "morgan@example.test", confidence: 0.99, sourceSide: "front", reviewRequired: false },
    ]);
    expect(result).toMatchObject({ firstName: "Morgan", lastName: "Rivera", organization: "Harbor Build Partners", email: "morgan@example.test" });
  });
});
