import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ClientUpdateView } from "@/components/portal/ClientUpdateView";
import type { ClientUpdate } from "@/hooks/useClientUpdates";

const update: ClientUpdate = {
  id: "update-1",
  tenant_id: "tenant-1",
  project_id: "project-1",
  title: "Final inspection passed",
  update_type: "milestone",
  period_label: "August 19, 2026",
  health: "on_track",
  summary: "The final sewer inspection passed today.",
  accomplishments: ["Inspection completed and accepted"],
  risks: [{ text: "Restoration depends on dry weather", severity: "medium" }],
  decisions: [{ text: "Approve the restoration color", status: "needed" }],
  action_items: [{ text: "Confirm restoration color", owner: "Client", done: false }],
  next_steps: ["Begin surface restoration"],
  statement_pdf_path: "https://example.com/statement.pdf",
  status: "published",
  published_at: "2026-08-19T16:00:00.000Z",
  created_at: "2026-08-19T15:00:00.000Z",
  updated_at: "2026-08-19T16:00:00.000Z",
};

describe("ClientUpdateView", () => {
  it("renders the approved milestone briefing with every client section", () => {
    render(<ClientUpdateView update={update} />);

    expect(screen.getByText("Milestone reached")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Final inspection passed" })).toBeInTheDocument();
    expect(screen.getByText("What this milestone means")).toBeInTheDocument();
    expect(screen.getByText("Decisions")).toBeInTheDocument();
    expect(screen.getByText("Risks & issues")).toBeInTheDocument();
    expect(screen.getByText("Responsible parties & actions")).toBeInTheDocument();
    expect(screen.getByText("Coming next")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /download financial statement/i })).toHaveAttribute("href", "https://example.com/statement.pdf");
  });

  it("does not render empty optional sections", () => {
    render(<ClientUpdateView update={{ ...update, update_type: "general", accomplishments: [], risks: [], decisions: [], action_items: [], next_steps: [], statement_pdf_path: null }} />);

    expect(screen.getByText("Project note")).toBeInTheDocument();
    expect(screen.queryByText("Risks & issues")).not.toBeInTheDocument();
    expect(screen.queryByText("Supporting document")).not.toBeInTheDocument();
  });
});
