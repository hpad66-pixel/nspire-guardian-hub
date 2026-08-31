import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { RecipientsInput } from "../RecipientsInput";
import { filterContactsForEmail } from "@/lib/crm/contactAssignments";
import type { CRMContact } from "@/hooks/useCRMContacts";

vi.mock("@/hooks/useSavedRecipients", () => ({
  useSavedRecipients: () => ({ data: [] }),
}));

vi.mock("@/hooks/useCRMContacts", () => ({
  useCRMContacts: () => ({
    data: [
      {
        id: "c1",
        first_name: "On",
        last_name: "Project",
        company_name: null,
        email: "onproject@example.com",
        contact_type: "owner",
        is_favorite: false,
        property_id: null,
      },
      {
        id: "c2",
        first_name: "Master",
        last_name: "CRM",
        company_name: null,
        email: "master@example.com",
        contact_type: "vendor",
        is_favorite: false,
        property_id: null,
      },
    ],
  }),
}));

vi.mock("@/hooks/useContactAssignments", () => ({
  useProjectContactIds: () => ({ data: ["c1"] }),
}));

vi.mock("@/components/crm/ContactPicker", () => ({
  ContactPicker: ({
    defaultScope,
    trigger,
  }: {
    defaultScope?: string;
    trigger?: React.ReactNode;
  }) => (
    <div>
      <div data-testid="picker-scope">{defaultScope}</div>
      {trigger}
    </div>
  ),
}));

function contact(partial: Partial<CRMContact> & Pick<CRMContact, "id" | "first_name" | "email">): CRMContact {
  return {
    last_name: null,
    company_name: null,
    job_title: null,
    contact_type: "vendor",
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

describe("RecipientsInput", () => {
  it("defaults ContactPicker to all contacts even when a projectId is set", () => {
    render(
      <RecipientsInput
        value={[]}
        onChange={() => {}}
        projectId="proj-1"
      />,
    );

    expect(screen.getByTestId("picker-scope")).toHaveTextContent("workspace");
    expect(screen.getByRole("button", { name: /Browse all contacts/i })).toBeInTheDocument();
  });

  it("keeps non-project CRM contacts in the workspace emailable set (Doc Studio contract)", () => {
    const contacts = [
      contact({ id: "c1", first_name: "On", last_name: "Project", email: "onproject@example.com" }),
      contact({ id: "c2", first_name: "Master", last_name: "CRM", email: "master@example.com" }),
    ];
    const projectOnly = filterContactsForEmail(contacts, {
      scope: "project",
      projectContactIds: ["c1"],
    });
    const all = filterContactsForEmail(contacts, { scope: "workspace" });

    expect(projectOnly.map((c) => c.id)).toEqual(["c1"]);
    expect(all.map((c) => c.id)).toEqual(["c1", "c2"]);
  });
});
