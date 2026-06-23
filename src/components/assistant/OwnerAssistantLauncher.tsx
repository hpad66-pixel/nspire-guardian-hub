/**
 * OwnerAssistantLauncher — floating assistant for the owner/client portal. Active
 * only on /owner-portal routes, always available (it's a portal feature, not gated
 * by the GC's settings toggle), and runs with audience="owner" so the edge function
 * exposes ONLY owner-safe tools (no subcontractor costs or margins).
 */
import { useState } from "react";
import { useLocation } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { useOwnerPortalData } from "@/hooks/usePortals";
import { AssistantPanel } from "./AssistantPanel";

export function OwnerAssistantLauncher() {
  const location = useLocation();
  const onOwnerPortal = location.pathname.startsWith("/owner-portal");
  const { data } = useOwnerPortalData();
  const [open, setOpen] = useState(false);

  const contract = (data?.primeContracts as any[] | undefined)?.[0];
  const projectId = contract?.project_id ?? null;

  if (!onOwnerPortal || !projectId) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Ask about your contract"
        className="fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full bg-[var(--apas-sapphire)] text-white shadow-lg shadow-[var(--apas-sapphire)]/30 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
        aria-label="Open client assistant"
      >
        <Sparkles className="h-6 w-6" />
      </button>
      <AssistantPanel
        projectId={projectId}
        projectName={contract?.title}
        audience="owner"
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}
