import { useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { useProject } from "@/hooks/useProjects";
import { useAgentEntitlement } from "@/hooks/useAgentEntitlement";
import { AgentPanel } from "./AgentPanel";

export function AgentLauncher() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const projectId = useMemo(() => {
    const match = location.pathname.match(/\/projects\/([0-9a-f-]{36})(?:\/|$)/i);
    return match?.[1] ?? null;
  }, [location.pathname]);
  const { data: project } = useProject(projectId);
  const { data: isEntitled, isLoading: entitlementLoading } = useAgentEntitlement(projectId);

  if (!projectId || entitlementLoading || !isEntitled) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-4 z-40 flex h-12 items-center gap-2 rounded-full border border-white/20 bg-[var(--apas-sapphire)] px-4 text-sm font-semibold text-white shadow-lg shadow-[var(--apas-sapphire)]/25 transition-transform hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-[0.98] lg:bottom-6 lg:right-6"
        aria-label="Open project Agent"
      >
        <Sparkles className="h-4 w-4" aria-hidden="true" />
        Agent
      </button>
      <AgentPanel
        projectId={projectId}
        projectName={project?.name ?? "Current project"}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}
