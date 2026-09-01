/**
 * AssistantLauncher — floating button that opens the financial assistant. Mounted
 * globally (AppLayout) but only renders when (a) the user enabled the assistant in
 * Settings and (b) we're inside a project route (the assistant is project-scoped).
 */
import { useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { useAssistantEnabled } from "@/hooks/useAssistantEnabled";
import { useIsCompactNav } from "@/hooks/use-mobile";
import { useProject } from "@/hooks/useProjects";
import { cn } from "@/lib/utils";
import { AssistantPanel } from "./AssistantPanel";

export function AssistantLauncher() {
  const [enabled] = useAssistantEnabled();
  const location = useLocation();
  const showMobileNav = useIsCompactNav();
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
        className={cn(
          "fixed right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--apas-sapphire)] text-white shadow-lg shadow-[var(--apas-sapphire)]/30 transition-transform hover:scale-105 active:scale-95 sm:right-6",
          showMobileNav
            ? "bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] lg:bottom-6"
            : "bottom-6",
        )}
        aria-label="Open financial assistant"
      >
        <Sparkles className="h-6 w-6" />
      </button>
      <AssistantPanel projectId={projectId} projectName={project?.name} open={open} onOpenChange={setOpen} />
    </>
  );
}
