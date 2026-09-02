import { describe, expect, it } from "vitest";
import {
  buildOwnerProjectTabs,
  filterOwnerProjectsForClient,
  isOwnerPortalProjectPath,
  ownerPortalPath,
  ownerPortalProjectSwitchPath,
  ownerPortalSection,
  rewriteOwnerPortalPath,
  uniqueOwnerProjects,
} from "@/lib/portal/ownerPortalPaths";

describe("ownerPortalPaths", () => {
  it("builds project-scoped paths", () => {
    expect(ownerPortalPath("abc")).toBe("/owner-portal/projects/abc");
    expect(ownerPortalPath("abc", "/documents")).toBe("/owner-portal/projects/abc/documents");
    expect(ownerPortalPath("abc", "", "#decisions")).toBe("/owner-portal/projects/abc#decisions");
    expect(ownerPortalPath(null, "/contract")).toBe("/owner-portal/contract");
  });

  it("reads the current section from a project path", () => {
    expect(ownerPortalSection("/owner-portal/projects/abc")).toBe("");
    expect(ownerPortalSection("/owner-portal/projects/abc/documents")).toBe("/documents");
    expect(ownerPortalSection("/owner-portal/contract")).toBe("");
  });

  it("rewrites legacy flat routes onto a project", () => {
    expect(rewriteOwnerPortalPath("/owner-portal", "p1")).toBe("/owner-portal/projects/p1");
    expect(rewriteOwnerPortalPath("/owner-portal/contract", "p1")).toBe("/owner-portal/projects/p1/contract");
    expect(rewriteOwnerPortalPath("/owner-portal/cos/co-1", "p1")).toBe("/owner-portal/projects/p1/cos/co-1");
    expect(rewriteOwnerPortalPath("/owner-portal/projects/p1/documents", "p2")).toBeNull();
  });

  it("preserves section when switching projects, except record pages", () => {
    expect(ownerPortalProjectSwitchPath("/owner-portal/projects/a/documents", "b"))
      .toBe("/owner-portal/projects/b/documents");
    expect(ownerPortalProjectSwitchPath("/owner-portal/projects/a/cos/co-1", "b"))
      .toBe("/owner-portal/projects/b");
    expect(isOwnerPortalProjectPath("/owner-portal/projects/a")).toBe(true);
  });

  it("deduplicates contracts onto one tab per project", () => {
    const tabs = uniqueOwnerProjects([
      { project_id: "p1", title: "Contract A", project_name: "Glorieta" },
      { project_id: "p1", title: "Contract B", project_name: "Glorieta" },
      { project_id: "p2", title: "Stucco", project_name: null },
    ]);
    expect(tabs.map((tab) => tab.id)).toEqual(["p1", "p2"]);
    expect(tabs[0].name).toBe("Glorieta");
    expect(tabs[1].name).toBe("Stucco");
  });

  it("includes projects that have no prime contract", () => {
    const tabs = buildOwnerProjectTabs(
      [
        { id: "p1", name: "Conveyance", client_id: "r4", client_name: "R4 Capital" },
        { id: "p2", name: "Stormdrain Maintenence", client_id: "r4", client_name: "R4 Capital" },
      ],
      [{ project_id: "p1", title: "PC-01", project_name: "Conveyance" }],
    );
    expect(tabs.map((tab) => tab.id)).toEqual(["p1", "p2"]);
    expect(tabs[0].contract?.title).toBe("PC-01");
    expect(tabs[1].contract).toBeNull();
    expect(tabs[1].name).toBe("Stormdrain Maintenence");
  });

  it("scopes staff preview tabs to the same client", () => {
    const tabs = buildOwnerProjectTabs([
      { id: "p1", name: "Conveyance", client_id: "r4" },
      { id: "p2", name: "Stormdrain", client_id: "r4" },
      { id: "p3", name: "Larkin MRI", client_id: "larkin" },
    ]);
    expect(filterOwnerProjectsForClient(tabs, "p2").map((tab) => tab.id)).toEqual(["p1", "p2"]);
    expect(filterOwnerProjectsForClient(tabs, "p3").map((tab) => tab.id)).toEqual(["p3"]);
  });
});
