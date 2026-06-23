/**
 * Owner portal — Project Updates. The client reads the briefings the GC publishes:
 * latest update front and center, with the history alongside.
 */
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { useOwnerPortalData } from "@/hooks/usePortals";
import { useClientUpdates } from "@/hooks/useClientUpdates";
import { ClientUpdateView } from "@/components/portal/ClientUpdateView";

export default function OwnerUpdatesPage() {
  const { data: portal } = useOwnerPortalData();
  const projectId = (portal?.primeContracts as any[] | undefined)?.[0]?.project_id ?? null;
  const { data: updates = [], isLoading } = useClientUpdates(projectId, { publishedOnly: true });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = useMemo(() => updates.find((u) => u.id === selectedId) ?? updates[0] ?? null, [updates, selectedId]);

  return (
    <div className="container mx-auto p-6 max-w-5xl space-y-4">
      <div>
        <Link to="/owner-portal" className="text-sm text-muted-foreground hover:underline">← Owner dashboard</Link>
        <h1 className="text-3xl font-bold mt-2">Project Updates</h1>
        <p className="text-muted-foreground">Regular briefings from your project team.</p>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground p-8 justify-center"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
      ) : updates.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">No updates published yet.</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-4">
          <div className="space-y-2">
            {updates.map((u) => (
              <button key={u.id} onClick={() => setSelectedId(u.id)}
                className={`w-full text-left rounded-md border p-3 transition-colors ${selected?.id === u.id ? "border-[var(--apas-sapphire)] bg-[var(--apas-sapphire)]/5" : "hover:bg-muted"}`}>
                <div className="font-medium text-sm truncate">{u.title}</div>
                <div className="text-xs text-muted-foreground">{u.period_label || (u.published_at ? new Date(u.published_at).toLocaleDateString() : "")}</div>
              </button>
            ))}
          </div>
          <Card>
            <CardContent className="p-6">
              {selected && <ClientUpdateView update={selected} />}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
