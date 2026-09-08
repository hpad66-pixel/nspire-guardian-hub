import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AgentLauncher } from "../AgentLauncher";

let entitled = false;
vi.mock("react-router-dom", () => ({
  useLocation: () => ({ pathname: "/projects/10000000-0000-4000-8000-000000000003" }),
}));
vi.mock("@/hooks/useProjects", () => ({ useProject: () => ({ data: { name: "Pilot project" } }) }));
vi.mock("@/hooks/useAgentEntitlement", () => ({
  useAgentEntitlement: () => ({ data: entitled, isLoading: false }),
}));
vi.mock("../AgentPanel", () => ({ AgentPanel: () => null }));

describe("AgentLauncher entitlement visibility", () => {
  beforeEach(() => { entitled = false; });

  it("fails closed when the current user/project is not enrolled", () => {
    render(<AgentLauncher />);
    expect(screen.queryByRole("button", { name: /open project agent/i })).not.toBeInTheDocument();
  });

  it("shows the launcher only after the server-owned entitlement check", () => {
    entitled = true;
    render(<AgentLauncher />);
    expect(screen.getByRole("button", { name: /open project agent/i })).toBeInTheDocument();
  });
});
