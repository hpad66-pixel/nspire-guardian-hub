import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AgentPanel } from "../AgentPanel";

vi.mock("@/hooks/useProjectAgent", () => ({
  useProjectAgent: () => ({
    messages: [],
    status: "idle",
    progress: "Ready when you are",
    profile: null,
    error: null,
    approval: null,
    memories: [],
    isBusy: false,
    isConfigured: false,
    send: vi.fn(),
    cancel: vi.fn(),
    reset: vi.fn(),
  }),
}));

describe("AgentPanel", () => {
  it("clearly presents the scoped read-only pilot without premature card scanning", () => {
    render(
      <AgentPanel
        projectId="10000000-0000-4000-8000-000000000003"
        projectName="Glorieta Gardens"
        open
        onOpenChange={vi.fn()}
      />,
    );

    expect(screen.getByText("Project Agent")).toBeInTheDocument();
    expect(screen.getByText("Read-only pilot")).toBeInTheDocument();
    expect(screen.getByText("Glorieta Gardens")).toBeInTheDocument();
    expect(screen.getByText(/cannot create, update, approve, or send anything/i)).toBeInTheDocument();
    expect(screen.getByText(/runtime connection has not been configured/i)).toBeInTheDocument();
    expect(screen.queryByText(/business card|scan a card/i)).not.toBeInTheDocument();
  });
});
