import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ClientPortalShell } from "../ClientPortalShell";

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { email: "owner@example.com", user_metadata: { full_name: "Pat Owner" } },
    signOut: vi.fn(),
  }),
}));

vi.mock("@/hooks/usePortals", () => ({
  useClientPortalContext: () => ({
    data: { client_name: "Glorieta HOA", portal_name: "Glorieta", project_name: "Sewer" },
  }),
  useMyPortalKind: () => ({ data: "owner" }),
  useOwnerPortalData: () => ({
    isLoading: false,
    data: {
      primeContracts: [
        { id: "c1", project_id: "p1", title: "PC-01", project_name: "Sewer close-out" },
        { id: "c2", project_id: "p2", title: "PC-02", project_name: "Stucco repairs" },
      ],
      pendingOcos: [],
      pendingPayApps: [],
    },
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
  });

  it("renders a tab for each of the client's projects", () => {
    renderAt("/owner-portal/projects/p1");
    expect(screen.getByTestId("owner-portal-project-tabs")).toBeInTheDocument();
    expect(screen.getByTestId("owner-portal-project-tab-p1")).toHaveTextContent("Sewer close-out");
    expect(screen.getByTestId("owner-portal-project-tab-p2")).toHaveTextContent("Stucco repairs");
    expect(screen.getByTestId("owner-portal-project-tab-p1")).toHaveAttribute("aria-selected", "true");
    expect(screen.getByTestId("owner-portal-project-tab-p2")).toHaveAttribute("aria-selected", "false");
  });

  it("keeps the current section when switching project tabs", () => {
    renderAt("/owner-portal/projects/p1/documents");
    expect(screen.getByTestId("owner-portal-project-tab-p2")).toHaveAttribute(
      "href",
      "/owner-portal/projects/p2/documents",
    );
    expect(screen.getByText("DOCS")).toBeInTheDocument();
  });
});
