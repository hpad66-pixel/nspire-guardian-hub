import { createContext, useContext, type ReactNode } from "react";
import type { OwnerPortalContract } from "@/hooks/usePortals";
import { ownerPortalPath } from "@/lib/portal/ownerPortalPaths";

export type OwnerPortalProjectTab = {
  id: string;
  name: string;
  contract: OwnerPortalContract | null;
  client_id?: string | null;
  client_name?: string | null;
  status?: string | null;
};

type ClientPortalProjectContextValue = {
  contracts: OwnerPortalContract[];
  projects: OwnerPortalProjectTab[];
  selectedProjectId: string | null;
  selectedContract: OwnerPortalContract | null;
  isLoading: boolean;
  setSelectedProjectId: (projectId: string) => void;
};

const ClientPortalProjectContext = createContext<ClientPortalProjectContextValue | null>(null);

export function ClientPortalProjectProvider({ value, children }: {
  value: ClientPortalProjectContextValue;
  children: ReactNode;
}) {
  return <ClientPortalProjectContext.Provider value={value}>{children}</ClientPortalProjectContext.Provider>;
}

export function useClientPortalProject() {
  const context = useContext(ClientPortalProjectContext);
  if (!context) throw new Error("useClientPortalProject must be used inside ClientPortalProjectProvider");
  return context;
}

export function useOwnerPortalHref() {
  const { selectedProjectId } = useClientPortalProject();
  return (suffix = "", hash = "") => ownerPortalPath(selectedProjectId, suffix, hash);
}
