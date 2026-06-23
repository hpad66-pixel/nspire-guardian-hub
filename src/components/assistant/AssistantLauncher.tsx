/**
 * AssistantLauncher — floating button that opens the financial assistant. Mounted
 * globally (AppLayout) but only renders when (a) the user enabled the assistant in
 * Settings and (b) we're inside a project route (the assistant is project-scoped).
 */
import { useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { useAssistantEnabled } from "@/hooks/useAssistantEnabled";
import { useProject } from "@/hooks/useProjects";
import { AssistantPanel } from "./AssistantPanel";

export function AssistantLauncher() {
  const [enabled] = useAssistantEnabled();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  const projectId = useMemo(() => {
    const m = location.pathname.match(/\/projects\/([0-9a-f-]{36})/i);
    return m ? m[1] : null;
  }, [location.pathname]);

  const { data: project } = useProject(projectId);

  if (!enabled || !projectId) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Financial assistant"
        className="fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full bg-[var(--apas-sapphire)] text-white shadow-lg shadow-[var(--apas-sapphire)]/30 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
        aria-label="Open financial assistant"
      >
        <Sparkles className="h-6 w-6" />
      </button>
      <AssistantPanel projectId={projectId} projectName={project?.name} open={open} onOpenChange={setOpen} />
    </>
  );
}
