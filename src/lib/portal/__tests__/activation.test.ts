import { describe, expect, it } from "vitest";
import {
  buildClientPortalLoginUrl,
  buildOwnerPortalPreviewUrl,
  buildPortalInviteUrl,
  getPortalGoLiveChecklist,
  getPortalLiveState,
  isPortalLive,
} from "../activation";

describe("portal activation helpers", () => {
  it("treats only active + is_active portals as live", () => {
    expect(isPortalLive({ is_active: true, status: "active" })).toBe(true);
    expect(isPortalLive({ is_active: false, status: "active" })).toBe(false);
    expect(isPortalLive({ is_active: true, status: "draft" })).toBe(false);
    expect(isPortalLive(null)).toBe(false);
  });

  it("classifies missing, draft, live, and archived states", () => {
    expect(getPortalLiveState(null)).toBe("missing");
    expect(getPortalLiveState({ is_active: false, status: "draft" })).toBe("draft");
    expect(getPortalLiveState({ is_active: true, status: "active" })).toBe("live");
    expect(getPortalLiveState({ is_active: false, status: "archived" })).toBe("archived");
  });

  it("builds the secure invite URL, never the legacy slug/auth token path", () => {
    expect(buildPortalInviteUrl("https://projos.ai/", "abc123")).toBe("https://projos.ai/portal-invite/abc123");
    expect(buildClientPortalLoginUrl("https://projos.ai", "acme-tower")).toBe("https://projos.ai/portal/acme-tower");
    expect(buildOwnerPortalPreviewUrl("proj-1")).toBe("/owner-portal?project=proj-1");
    expect(buildOwnerPortalPreviewUrl()).toBe("/owner-portal");
  });

  it("requires at least one curated artifact before activation", () => {
    const empty = getPortalGoLiveChecklist({
      publishedUpdates: 0,
      sharedDocuments: 0,
      invitedContacts: 0,
      live: false,
    });
    expect(empty.readyToActivate).toBe(false);
    expect(empty.items.every((item) => !item.done)).toBe(true);

    const ready = getPortalGoLiveChecklist({
      publishedUpdates: 1,
      sharedDocuments: 2,
      invitedContacts: 0,
      live: false,
    });
    expect(ready.readyToActivate).toBe(true);
    expect(ready.items.find((item) => item.id === "briefing")?.done).toBe(true);
    expect(ready.items.find((item) => item.id === "documents")?.done).toBe(true);
  });
});
