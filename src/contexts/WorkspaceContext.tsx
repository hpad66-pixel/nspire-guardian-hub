import { createContext, useContext, ReactNode } from 'react';
import { useWorkspace, UseWorkspaceReturn } from '@/hooks/useWorkspace';

const WorkspaceContext = createContext<UseWorkspaceReturn | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const workspace = useWorkspace();
  return (
    <WorkspaceContext.Provider value={workspace}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspaceContext(): UseWorkspaceReturn {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) {
    throw new Error('useWorkspaceContext must be used within a WorkspaceProvider');
  }
  return ctx;
}
