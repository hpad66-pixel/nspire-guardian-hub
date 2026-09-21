import { describe, expect, it } from "vitest";
import { clientPortalRootDestination } from "@/pages/RootRedirect";

describe("clientPortalRootDestination", () => {
  it("sends client.projos.ai guests into the client magic-link auth flow", () => {
    expect(clientPortalRootDestination("client.projos.ai", false))
      .toBe("/auth?portal=client&next=%2Fowner-portal");
  });

  it("sends authenticated users on client.projos.ai into the scoped portal", () => {
    expect(clientPortalRootDestination("client.projos.ai", true)).toBe("/owner-portal");
  });

  it("leaves the main app root behavior unchanged on other hosts", () => {
    expect(clientPortalRootDestination("projos.ai", false)).toBeNull();
  });
});
