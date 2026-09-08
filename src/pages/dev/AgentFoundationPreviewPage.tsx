import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AgentPanel } from "@/components/agent/AgentPanel";

export default function AgentFoundationPreviewPage() {
  const [open, setOpen] = useState(true);

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--apas-sapphire)]/10 text-[var(--apas-sapphire)]">
          <Sparkles className="h-5 w-5" />
        </div>
        <h1 className="text-xl font-semibold tracking-tight">Agent panel visual check</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          This local route exercises the scoped Agent boundary with synthetic task records. The production panel remains feature-flagged and project-scoped.
        </p>
        <Button className="mt-5" onClick={() => setOpen(true)}>Open Agent panel</Button>
      </div>
      <AgentPanel
        projectId="10000000-0000-4000-8000-000000000003"
        projectName="Glorieta Gardens · Building Improvements"
        open={open}
        onOpenChange={setOpen}
      />
    </main>
  );
}
