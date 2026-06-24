import { useState } from "react";
import { useParams } from "react-router-dom";
import { Sparkles, Send } from "lucide-react";
import { usePunchList } from "@/hooks/usePunchList";
import { useProject } from "@/hooks/useProjects";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AIPunchBuilderDialog } from "@/components/projects/AIPunchBuilderDialog";
import { SendPunchTransmittalDialog } from "@/components/projects/SendPunchTransmittalDialog";
import { PunchTransmittalsPanel } from "@/components/projects/PunchTransmittalsPanel";

const PRIORITY_CLS: Record<string, string> = { high: "text-[var(--apas-rose)]", medium: "text-amber-600", low: "text-muted-foreground" };
const SUB_STATUS: Record<string, { label: string; cls: string }> = {
  acknowledged: { label: "Acknowledged", cls: "bg-[var(--apas-sapphire)]/10 text-[var(--apas-sapphire)]" },
  in_progress: { label: "In progress", cls: "bg-amber-100 text-amber-700" },
  completed: { label: "Completed", cls: "bg-emerald-100 text-emerald-700" },
  disputed: { label: "Disputed", cls: "bg-[var(--apas-rose)]/10 text-[var(--apas-rose)]" },
};

export default function PunchListPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data: items = [], isLoading } = usePunchList(projectId ?? null);
  const { data: project } = useProject(projectId ?? null);

  const [aiOpen, setAiOpen] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [preselect, setPreselect] = useState<string[]>([]);

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      <div className="flex items-start justify-between mb-6 gap-3">
        <div>
          <h1 className="text-3xl font-bold mb-1">Punch List</h1>
          <p className="text-muted-foreground">Generate items with AI, send to a sub, and track each response.</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" onClick={() => { setPreselect([]); setSendOpen(true); }}>
            <Send className="h-4 w-4 mr-1.5" /> Send to sub
          </Button>
          <Button onClick={() => setAiOpen(true)}>
            <Sparkles className="h-4 w-4 mr-1.5" /> Generate with AI
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <div className="text-muted-foreground">Loading…</div>
        ) : items.length === 0 ? (
          <Card><CardContent className="p-8 text-center text-muted-foreground">
            No punch items yet. Click <strong>Generate with AI</strong> to dictate or type a walkthrough.
          </CardContent></Card>
        ) : (
          <div className="grid gap-2">
            {(items as any[]).map((it) => {
              const ss = it.sub_status ? SUB_STATUS[it.sub_status] : null;
              return (
                <Card key={it.id}>
                  <CardContent className="flex items-center justify-between gap-3 p-3">
                    <div className="min-w-0">
                      <div className="font-medium">{it.description ?? "Punch item"}</div>
                      <div className="text-xs text-muted-foreground">
                        {it.location || "—"} · <span className={`capitalize ${PRIORITY_CLS[it.priority] ?? ""}`}>{it.priority}</span>
                        {it.due_date ? ` · due ${it.due_date}` : ""}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {ss && <Badge className={`text-[10px] ${ss.cls}`}>{ss.label}</Badge>}
                      {it.closed_at ? <Badge>Closed</Badge> : <Badge variant="outline">Open</Badge>}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {projectId && <PunchTransmittalsPanel projectId={projectId} />}
      </div>

      {projectId && (
        <>
          <AIPunchBuilderDialog
            open={aiOpen} onOpenChange={setAiOpen}
            projectId={projectId} projectName={project?.name}
            onSaved={(ids, send) => { if (send) { setPreselect(ids); setSendOpen(true); } }}
          />
          <SendPunchTransmittalDialog
            open={sendOpen} onOpenChange={setSendOpen}
            projectId={projectId} projectName={project?.name}
            preselectedIds={preselect}
          />
        </>
      )}
    </div>
  );
}
