import type { ClientPortal } from "@/hooks/usePortal";

export type PortalLiveState = "live" | "draft" | "archived" | "missing";

export interface PortalGoLiveChecklistItem {
  id: "briefing" | "documents" | "invite";
  label: string;
  done: boolean;
  detail: string;
}

export interface PortalGoLiveChecklist {
  live: boolean;
  readyToActivate: boolean;
  items: PortalGoLiveChecklistItem[];
}

export function isPortalLive(portal?: Pick<ClientPortal, "is_active" | "status"> | null): boolean {
  return Boolean(portal && portal.is_active && portal.status === "active");
}

export function getPortalLiveState(
  portal?: Pick<ClientPortal, "is_active" | "status"> | null,
): PortalLiveState {
  if (!portal) return "missing";
  if (portal.status === "archived") return "archived";
  return isPortalLive(portal) ? "live" : "draft";
}

export function buildPortalInviteUrl(origin: string, token: string): string {
  return `${origin.replace(/\/$/, "")}/portal-invite/${token}`;
}

export function buildClientPortalLoginUrl(origin: string, slug: string): string {
  return `${origin.replace(/\/$/, "")}/portal/${slug}`;
}

export function buildOwnerPortalPreviewUrl(projectId?: string | null): string {
  if (!projectId) return "/owner-portal";
  return `/owner-portal?project=${encodeURIComponent(projectId)}`;
}

export function getPortalGoLiveChecklist(input: {
  publishedUpdates: number;
  sharedDocuments: number;
  invitedContacts: number;
  live: boolean;
}): PortalGoLiveChecklist {
  const items: PortalGoLiveChecklistItem[] = [
    {
      id: "briefing",
      label: "Published briefing",
      done: input.publishedUpdates > 0,
      detail: input.publishedUpdates > 0
        ? `${input.publishedUpdates} live update${input.publishedUpdates === 1 ? "" : "s"}`
        : "Write and publish a short owner summary",
    },
    {
      id: "documents",
      label: "Shared files",
      done: input.sharedDocuments > 0,
      detail: input.sharedDocuments > 0
        ? `${input.sharedDocuments} curated file${input.sharedDocuments === 1 ? "" : "s"}`
        : "Upload only the files the owner should see",
    },
    {
      id: "invite",
      label: "Owner invited",
      done: input.invitedContacts > 0,
      detail: input.invitedContacts > 0
        ? `${input.invitedContacts} recipient${input.invitedContacts === 1 ? "" : "s"}`
        : "Send a secure invite when you are ready",
    },
  ];

  return {
    live: input.live,
    readyToActivate: items.some((item) => item.done),
    items,
  };
}
