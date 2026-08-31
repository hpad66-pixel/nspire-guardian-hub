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
vi.mock("../RecipientsInput", () => ({
  RecipientsInput: ({
    value,
    onChange,
    defaultScope,
  }: {
    value: string[];
    onChange: (v: string[]) => void;
    defaultScope?: string;
  }) => (
    <div>
      <div data-testid="recipients">{value.join(",")}</div>
      <div data-testid="default-scope">{defaultScope ?? "workspace"}</div>
      <button type="button" onClick={() => onChange(["chris@r4.com"])}>pick-chris</button>
      <button type="button" onClick={() => onChange(["outside@firm.com"])}>pick-outside</button>
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

  it("defaults the recipient picker to all workspace contacts", async () => {
    render(
      <SendAuthoredDocumentDialog
        open
        onOpenChange={() => {}}
        doc={doc}
        projectName="Conveyance"
        onSent={async () => {}}
      />,
    );

    expect(screen.getByTestId("default-scope")).toHaveTextContent("workspace");
    expect(screen.getByText(/every contact in your CRM/i)).toBeInTheDocument();
  });

  it("lets the user add any CRM recipient via the picker", async () => {
    render(
      <SendAuthoredDocumentDialog
        open
        onOpenChange={() => {}}
        doc={doc}
        projectName="Conveyance"
        onSent={async () => {}}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "pick-outside" }));
    expect(screen.getByTestId("recipients")).toHaveTextContent("outside@firm.com");
  });
});
