/**
 * Owner portal — Project Updates. The client reads the briefings the GC publishes:
 * latest update front and center, with the history alongside.
 */
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, ShieldCheck } from "lucide-react";
import { useClientUpdates } from "@/hooks/useClientUpdates";
import { ClientUpdateView } from "@/components/portal/ClientUpdateView";
import { UPDATE_TYPES } from "@/lib/clientUpdates/presentation";
import { useClientPortalProject, useOwnerPortalHref } from "@/components/portal/ClientPortalProjectContext";

export default function OwnerUpdatesPage() {
  const href = useOwnerPortalHref();
  const { selectedProjectId: projectId } = useClientPortalProject();
  const { data: updates = [], isLoading } = useClientUpdates(projectId, { publishedOnly: true });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = useMemo(() => updates.find((u) => u.id === selectedId) ?? updates[0] ?? null, [updates, selectedId]);

  return (
    <div className="container mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
        <Link to={href()} className="text-sm text-muted-foreground hover:underline">← Portal overview</Link>
        <h1 className="mt-2 text-4xl font-medium">Project briefings</h1>
        <p className="mt-1 text-muted-foreground">Clear, approved updates from your project team.</p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800"><ShieldCheck className="h-4 w-4" />Published information only</span>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground p-8 justify-center"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
      ) : updates.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">No updates published yet.</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-[250px_1fr]">
          <div className="space-y-2 md:sticky md:top-4 md:self-start">
            {updates.map((u) => {
              const meta = UPDATE_TYPES[u.update_type ?? "general"] ?? UPDATE_TYPES.general;
              const Icon = meta.icon;
              return (
                <button key={u.id} onClick={() => setSelectedId(u.id)} className={`w-full rounded-2xl border p-3.5 text-left transition-colors ${selected?.id === u.id ? "border-[#0d6b57] bg-emerald-50/70 shadow-sm" : "border-slate-200 bg-white/70 hover:border-slate-300"}`}>
                  <div className="flex items-start gap-2.5"><span className="mt-0.5 grid h-8 w-8 flex-shrink-0 place-items-center rounded-xl bg-white shadow-sm"><Icon className={`h-4 w-4 ${meta.accent}`} /></span><span className="min-w-0"><strong className="block truncate text-sm text-[#082b23]">{u.title}</strong><small className="mt-1 block text-slate-500">{u.period_label || (u.published_at ? new Date(u.published_at).toLocaleDateString() : "")}</small></span></div>
                </button>
              );
            })}
          </div>
          <Card className="border-0 bg-transparent shadow-none">
            <CardContent className="p-0">
              {selected && <ClientUpdateView update={selected} />}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
