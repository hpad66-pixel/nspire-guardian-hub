import { describe, expect, it } from "vitest";
import {
  contactDisplayName,
  diffIds,
  filterContactsForEmail,
  mergeAssignmentIds,
} from "../contactAssignments";
import type { CRMContact } from "@/hooks/useCRMContacts";

function contact(partial: Partial<CRMContact> & Pick<CRMContact, "id" | "first_name">): CRMContact {
  return {
    last_name: null,
    company_name: null,
    job_title: null,
    contact_type: "vendor",
    email: null,
    phone: null,
    mobile: null,
    fax: null,
    address_line1: null,
    address_line2: null,
    city: null,
    state: null,
    zip_code: null,
    country: null,
    website: null,
    license_number: null,
    insurance_expiry: null,
    tags: [],
    notes: null,
    is_favorite: false,
    is_active: true,
    created_by: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    user_id: "u1",
    property_id: null,
    ...partial,
  };
}

describe("filterContactsForEmail", () => {
  const ada = contact({
    id: "c1",
    first_name: "Ada",
    last_name: "Lovelace",
    email: "ada@example.com",
    company_name: "Analytical",
  });
  const noEmail = contact({ id: "c2", first_name: "NoMail" });
  const bob = contact({
    id: "c3",
    first_name: "Bob",
    email: "bob@site.com",
  });

  it("workspace scope returns every emailable contact", () => {
    const result = filterContactsForEmail([ada, noEmail, bob], { scope: "workspace" });
    expect(result.map((c) => c.id)).toEqual(["c1", "c3"]);
  });

  it("project scope keeps only directory-linked contacts", () => {
    const result = filterContactsForEmail([ada, bob], {
      scope: "project",
      projectContactIds: ["c3"],
    });
    expect(result.map((c) => c.id)).toEqual(["c3"]);
  });

  it("search matches name, company, and email", () => {
    const byCompany = filterContactsForEmail([ada, bob], {
      scope: "workspace",
      search: "analytical",
    });
    expect(byCompany.map((c) => c.id)).toEqual(["c1"]);
  });
});

describe("mergeAssignmentIds / diffIds", () => {
  it("keeps the primary property plus extra links", () => {
    expect(mergeAssignmentIds("p1", ["p2", "p1"])).toEqual(["p1", "p2"]);
  });

  it("diffs additions and removals", () => {
    expect(diffIds(["a", "b"], ["b", "c"])).toEqual({
      toAdd: ["c"],
      toRemove: ["a"],
    });
  });

  it("formats a contact display name with company", () => {
    expect(
      contactDisplayName({ first_name: "Ada", last_name: "Lovelace", company_name: "AE" }),
    ).toBe("Ada Lovelace (AE)");
  });
});
