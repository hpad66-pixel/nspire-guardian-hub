import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FinancialProposalWorkflow } from "../FinancialProposalWorkflow";

describe("FinancialProposalWorkflow", () => {
  it("checks every workflow step when the final client-signed proposal is executed", () => {
    render(
      <FinancialProposalWorkflow
        proposal={{
          status: "approved",
          locked: true,
          created_at: "2026-08-01T12:00:00.000Z",
          submitted_signed_at: "2026-08-02T12:00:00.000Z",
          sent_to_client_at: "2026-08-03T12:00:00.000Z",
          accepted_signed_at: "2026-08-18T12:00:00.000Z",
          accepted_signed_name: "Jane Client",
          client_name: "Larkin Hospital",
          client_email: "client@example.com",
          acceptance_method: "offline",
          delivery_history: [{ to: "client@example.com", at: "2026-08-03T12:00:00.000Z", kind: "sent" }],
          amendment_history: [],
          revision_no: 0,
        } as any}
      />,
    );

    for (const label of ["Draft created", "Consultant signed", "Sent to client", "Client approved", "Executed"]) {
      const card = screen.getByText(label, { selector: "p" }).closest(".relative");
      expect(card?.className).toContain("border-emerald-200");
    }
    expect(screen.getByText("Executed & locked")).toBeInTheDocument();
  });

  it("treats a returned executed copy as satisfying prior delivery checkpoints", () => {
    render(
      <FinancialProposalWorkflow
        proposal={{
          status: "approved",
          locked: true,
          created_at: "2026-08-01T12:00:00.000Z",
          submitted_signed_at: null,
          sent_to_client_at: null,
          accepted_signed_at: "2026-08-18T12:00:00.000Z",
          accepted_signed_name: "Jane Client",
          client_name: "Larkin Hospital",
          acceptance_method: "offline",
          delivery_history: [],
          amendment_history: [],
          revision_no: 0,
        } as any}
      />,
    );

    expect(screen.getByText("Included in final executed PDF")).toBeInTheDocument();
    expect(screen.getByText("Satisfied by returned client-signed copy")).toBeInTheDocument();
  });
});
