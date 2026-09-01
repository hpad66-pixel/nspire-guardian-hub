import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { OpsPortalContext } from '@/hooks/useOpsPortal';
import { opsHasModule, type OpsPortalModule } from '@/lib/portal/opsPortal';

interface OpsPortalPropertyValue {
  context: OpsPortalContext | null;
  propertyId: string | null;
  role: string | null;
  can: (module: OpsPortalModule) => boolean;
  isLoading: boolean;
}

const Ctx = createContext<OpsPortalPropertyValue>({
  context: null,
  propertyId: null,
  role: null,
  can: () => false,
  isLoading: true,
});

export function OpsPortalPropertyProvider({
  context,
  isLoading,
  children,
}: {
  context: OpsPortalContext | null;
  isLoading: boolean;
  children: ReactNode;
}) {
  const value = useMemo<OpsPortalPropertyValue>(() => {
    const role = context?.ops_role ?? null;
    const modules = context?.modules ?? null;
    return {
      context,
      propertyId: context?.property_id ?? null,
      role,
      isLoading,
      can: (module) => opsHasModule(role, module, modules),
    };
  }, [context, isLoading]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useOpsPortalProperty() {
  return useContext(Ctx);
}
