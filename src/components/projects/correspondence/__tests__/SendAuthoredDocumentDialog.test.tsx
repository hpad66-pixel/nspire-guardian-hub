import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { SendAuthoredDocumentDialog } from "../SendAuthoredDocumentDialog";
import type { AuthoredDocument } from "@/hooks/useAuthoredDocuments";

vi.mock("@/hooks/useSendEmail", () => ({
  useSendEmail: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));
vi.mock("@/hooks/useProjectEmails", () => ({
  useProjectEmails: () => ({ create: { mutateAsync: vi.fn() } }),
}));
vi.mock("@/hooks/useSavedRecipients", () => ({
  useSavedRecipients: () => ({ rememberAll: vi.fn(), data: [] }),
}));
vi.mock("@/hooks/useProjectPeople", () => ({
  useProjectContacts: () => ({
    data: [
      { contactId: "c1", name: "Airia Austin", email: "airia@example.com", isKeyContact: false, roleLabel: null },
      { contactId: "c2", name: "Chris Sullivan", email: "chris@r4.com", isKeyContact: true, roleLabel: "Owner" },
    ],
  }),
}));
vi.mock("../RecipientsInput", () => ({
  RecipientsInput: ({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) => (
    <div>
      <div data-testid="recipients">{value.join(",")}</div>
      <button type="button" onClick={() => onChange(["chris@r4.com"])}>pick-chris</button>
    </div>
  ),
}));

const doc = {
  id: "d1",
  project_id: "p1",
  title: "Closeout Letter",
  sign_token: "tok",
  contractor_signed_at: "2026-08-31T12:00:00.000Z",
  contractor_signed_name: "Hardeep Anand",
} as AuthoredDocument;

describe("SendAuthoredDocumentDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not auto-select the first project contact as the recipient", async () => {
    render(
      <SendAuthoredDocumentDialog
        open
        onOpenChange={() => {}}
        doc={doc}
        projectName="Conveyance"
        onSent={async () => {}}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText(/Choose who receives this/i)).toBeInTheDocument();
    });
    expect(screen.getByTestId("recipients")).toHaveTextContent("");
    expect(screen.queryByDisplayValue("airia@example.com")).not.toBeInTheDocument();
  });

  it("lets the user add a recipient via the picker", async () => {
    render(
      <SendAuthoredDocumentDialog
        open
        onOpenChange={() => {}}
        doc={doc}
        projectName="Conveyance"
        onSent={async () => {}}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "pick-chris" }));
    expect(screen.getByTestId("recipients")).toHaveTextContent("chris@r4.com");
  });
});
