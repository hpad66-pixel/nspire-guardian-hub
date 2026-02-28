import { createContext, useContext, ReactNode } from 'react';
import { useWorkspace, UseWorkspaceReturn } from '@/hooks/useWorkspace';
import { useAuth } from '@/hooks/useAuth';
import { AlertTriangle } from 'lucide-react';

const WorkspaceContext = createContext<UseWorkspaceReturn | undefined>(undefined);

function WorkspaceNullGuard({ children, workspace }: { children: ReactNode; workspace: UseWorkspaceReturn }) {
  const { user, loading: authLoading } = useAuth();

  // Still loading — don't show warning yet
  if (workspace.isLoading || authLoading) {
    return <>{children}</>;
  }

  // User is logged in but has no workspace assigned
  if (user && !workspace.workspaceId) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="mx-auto max-w-md rounded-xl border border-destructive/30 bg-card p-8 text-center shadow-lg">
          <AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">Workspace Not Assigned</h2>
          <p className="text-muted-foreground text-sm mb-4">
            Your account is not assigned to any workspace. This usually means your profile was not
            properly provisioned during onboarding.
          </p>
          <p className="text-muted-foreground text-sm">
            Please contact your platform administrator (Hardeep Anand) to resolve this issue.
          </p>
          <p className="text-xs text-muted-foreground/60 mt-6 font-mono">
            User ID: {user.id}
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const workspace = useWorkspace();
  return (
    <WorkspaceContext.Provider value={workspace}>
      <WorkspaceNullGuard workspace={workspace}>
        {children}
      </WorkspaceNullGuard>
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
