import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AgentPilotAdminCard } from "../AgentPilotAdminCard";

const setEnabled = vi.fn();
const pilot = {
  entitlements: new Map<string, boolean>(), isLoading: false, error: null,
  pendingUserId: null, setEnabled,
};

vi.mock("@/hooks/useAgentPilotAdmin", () => ({ useAgentPilotAdmin: () => pilot }));
vi.mock("@/hooks/useProjectTeam", () => ({
  useProjectTeamMembers: () => ({
    data: [{ user_id: "user-1", profile: { full_name: "Alex Morgan", email: "alex@example.test" } }],
    isLoading: false,
  }),
}));

describe("AgentPilotAdminCard", () => {
  beforeEach(() => { setEnabled.mockClear(); pilot.entitlements = new Map(); });

  it("enables only an existing project team member", () => {
    render(<AgentPilotAdminCard projectId="project-1" />);
    fireEvent.click(screen.getByRole("button", { name: "Enable" }));
    expect(setEnabled).toHaveBeenCalledWith("user-1", true);
    expect(screen.getByText(/writes, memory saving, and business-card scanning remain off/i)).toBeInTheDocument();
  });

  it("makes immediate revocation clear when disabling", () => {
    pilot.entitlements = new Map([["user-1", true]]);
    render(<AgentPilotAdminCard projectId="project-1" />);
    fireEvent.click(screen.getByRole("button", { name: "Disable" }));
    expect(setEnabled).toHaveBeenCalledWith("user-1", false);
    expect(screen.getByText(/immediately revokes/i)).toBeInTheDocument();
  });
});
