import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ClientPortalShell } from "../ClientPortalShell";

const mockPortalState = vi.hoisted(() => ({
  portalKind: "owner" as "main" | "owner",
  hasMainPortalMembership: false,
  userRole: null as "admin" | null,
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { email: "owner@example.com", user_metadata: { full_name: "Pat Owner" } },
    userRole: mockPortalState.userRole,
    signOut: vi.fn(),
  }),
}));

vi.mock("@/hooks/usePortals", () => ({
  useClientPortalContext: () => ({
    data: { client_name: "Glorieta HOA", portal_name: "Glorieta", project_name: "Sewer" },
  }),
  useHasMainPortalMembership: () => ({ data: mockPortalState.hasMainPortalMembership }),
  useMyPortalKind: () => ({ data: mockPortalState.portalKind }),
  useOwnerPortalData: () => ({
    isLoading: false,
    data: {
      primeContracts: [
        { id: "c1", project_id: "p1", title: "PC-01", project_name: "Sewer close-out" },
        { id: "c2", project_id: "p2", title: "PC-02", project_name: "Stucco repairs" },
      ],
      projects: [
        { id: "p1", name: "Sewer close-out", client_id: "r4", client_name: "R4 Capital" },
        { id: "p2", name: "Stucco repairs", client_id: "r4", client_name: "R4 Capital" },
        { id: "p3", name: "Stormdrain Maintenence", client_id: "r4", client_name: "R4 Capital" },
        {
          id: "p4",
          name: "Glorieta Gardens — Site Accountability",
          client_id: "r4",
          client_name: "R4 Capital",
          status: "active",
          program_meta: { feature_key: "site_accountability", owner_navigation_priority: true },
        },
        { id: "p5", name: "Larkin MRI", client_id: "larkin", client_name: "Larkin Consulting" },
      ],
      pendingOcos: [],
      pendingPayApps: [],
    },
  }),
}));

vi.mock("@/contexts/ModuleContext", () => ({
  useModules: () => ({
    isModuleEnabled: (module: string) => module === "siteAccountabilityEnabled",
  }),
}));

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<ClientPortalShell />}>
          <Route path="/owner-portal/projects/:projectId" element={<div>DASHBOARD</div>} />
          <Route path="/owner-portal/projects/:projectId/documents" element={<div>DOCS</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe("ClientPortalShell project tabs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPortalState.portalKind = "owner";
    mockPortalState.hasMainPortalMembership = false;
    mockPortalState.userRole = null;
  });

  it("renders a tab for each of the client's projects", () => {
    renderAt("/owner-portal/projects/p1");
    expect(screen.getByRole("complementary", { name: "Client project navigation" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Selected project" })).toBeInTheDocument();
    expect(screen.getByTestId("owner-portal-project-tabs")).toBeInTheDocument();
    expect(screen.getByTestId("owner-portal-project-tab-p1")).toHaveTextContent("Sewer close-out");
    expect(screen.getByTestId("owner-portal-project-tab-p2")).toHaveTextContent("Stucco repairs");
    expect(screen.getByTestId("owner-portal-project-tab-p3")).toHaveTextContent("Stormdrain Maintenence");
    expect(screen.getByTestId("owner-portal-project-tab-p1")).toHaveAttribute("aria-selected", "true");
    expect(screen.getByTestId("owner-portal-project-tab-p2")).toHaveAttribute("aria-selected", "false");
  });

  it("opens a project's main portal surface when switching project tabs", () => {
    renderAt("/owner-portal/projects/p1/documents");
    expect(screen.getByTestId("owner-portal-project-tab-p2")).toHaveAttribute(
      "href",
      "/owner-portal/projects/p2",
    );
    expect(screen.getByText("DOCS")).toBeInTheDocument();
  });

  it("keeps Site Accountability visible without moving the selected project", () => {
    renderAt("/owner-portal/projects/p1");
    const projectNavigation = screen.getByRole("navigation", { name: "Selected project" });
    expect(within(projectNavigation).getByRole("link", { name: "Site accountability" })).toHaveAttribute(
      "href",
      "/owner-portal/projects/p1/accountability",
    );
  });

  it("groups the APAS owner preview by client instead of hiding other clients", () => {
    mockPortalState.portalKind = "main";
    renderAt("/owner-portal/projects/p1");
    expect(screen.getByTestId("owner-portal-client-group-r4")).toHaveTextContent("R4 Capital");
    expect(screen.getByTestId("owner-portal-client-group-larkin")).toHaveTextContent("Larkin Consulting");
    expect(screen.getByTestId("owner-portal-project-tab-p1")).toHaveTextContent("Sewer close-out");
    expect(screen.getByTestId("owner-portal-project-tab-p5")).toHaveTextContent("Larkin MRI");
    expect(screen.getByTestId("owner-portal-project-tab-p5")).toHaveAttribute(
      "href",
      "/projects/p5/client-updates?compose=1",
    );
    expect(screen.getByTestId("owner-portal-workbench-tools")).toHaveTextContent("Write update");
    expect(screen.getByTestId("owner-portal-workbench-tools")).toHaveTextContent("Edit portal");
  });

  it("uses owner workbench navigation for main members even when portal kind resolves as owner", () => {
    mockPortalState.portalKind = "owner";
    mockPortalState.hasMainPortalMembership = true;
    renderAt("/owner-portal/projects/p1");
    expect(screen.getByTestId("owner-portal-project-tab-p2")).toHaveAttribute(
      "href",
      "/projects/p2/client-updates?compose=1",
    );
    expect(screen.getByTestId("owner-portal-workbench-tools")).toHaveTextContent("Write update");
  });

  it("uses owner workbench navigation for internal admin roles", () => {
    mockPortalState.userRole = "admin";
    renderAt("/owner-portal/projects/p1");
    expect(screen.getByTestId("owner-portal-project-tab-p2")).toHaveAttribute(
      "href",
      "/projects/p2/client-updates?compose=1",
    );
  });
});
