import { createContext, useContext, type Dispatch, type ReactNode, type SetStateAction } from "react";
import type { OwnerPortalContract } from "@/hooks/usePortals";

type ClientPortalProjectContextValue = {
  contracts: OwnerPortalContract[];
  selectedProjectId: string | null;
  selectedContract: OwnerPortalContract | null;
  setSelectedProjectId: Dispatch<SetStateAction<string | null>>;
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
