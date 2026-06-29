import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Inbox } from "lucide-react";
import { useVendorSubmissions, type VendorSubmission } from "@/hooks/useVendorSubmissions";
import { useCommitments } from "@/hooks/useCommitments";
import { useArtifactUrl } from "@/hooks/useProjectArtifacts";

const STATUS_COLOR: Record<string, string> = {
  received: "bg-blue-100 text-blue-800",
  parsed: "bg-indigo-100 text-indigo-800",
  needs_review: "bg-amber-100 text-amber-800",
  processed: "bg-emerald-100 text-emerald-800",
  rejected: "bg-red-100 text-red-800",
};

interface Props { projectId: string; }

export function VendorSubmissionInbox({ projectId }: Props) {
  const { data: subs = [], process, reject, remove } = useVendorSubmissions(projectId);
  const { data: commitments = [] } = useCommitments(projectId);
  const [selected, setSelected] = useState<VendorSubmission | null>(null);
  const [commitmentId, setCommitmentId] = useState<string>("");
  const { data: previewUrl } = useArtifactUrl(selected?.artifact_id ?? null);

  async function handleProcess() {
    if (!selected) return;
    if (!commitmentId) { toast.error("Pick the vendor commitment first."); return; }
    try {
      const res = await process.mutateAsync({ submission: selected, commitmentId });
      toast.success(res.kind === "invoice" ? "Draft invoice created" : "Lien release created");
      setSelected(null); setCommitmentId("");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to process");
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* List */}
      <Card>
        <CardContent className="p-0">
          {subs.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Inbox className="h-8 w-8 mx-auto mb-2 opacity-50" />
              No vendor submissions yet.
            </div>
          ) : (
            <ul>
              {subs.map((s) => (
                <li key={s.id}
                    className={`flex items-center justify-between gap-2 p-3 border-b cursor-pointer hover:bg-muted/30 ${selected?.id === s.id ? "bg-muted/40" : ""}`}
                    onClick={() => setSelected(s)}>
                  <div className="min-w-0">
                    <div className="font-medium truncate">{s.subject ?? s.from_email ?? "Document"}</div>
                    <div className="text-xs text-muted-foreground">
                      {s.source} · {new Date(s.received_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <Badge variant="outline">{s.doc_type}</Badge>
                    <Badge className={STATUS_COLOR[s.status] ?? ""}>{s.status}</Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Detail */}
      <Card>
        <CardContent className="p-4 space-y-3">
          {!selected ? (
            <p className="text-sm text-muted-foreground">Select a submission to review.</p>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span className="font-medium">{selected.subject ?? "Document"}</span>
                <Badge variant="outline">{selected.doc_type}</Badge>
              </div>

              {selected.parsed && (
                <div className="text-sm rounded-md border p-3 bg-muted/20">
                  <div className="font-medium text-xs text-muted-foreground mb-1">Extracted</div>
                  <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(selected.parsed, null, 2)}</pre>
                </div>
              )}

              {previewUrl && (
                <a href={previewUrl} target="_blank" rel="noreferrer"
                   className="text-sm text-[var(--apas-sapphire)] underline">Open source PDF</a>
              )}

              {selected.status !== "processed" && selected.status !== "rejected" && (
                <div className="space-y-2 pt-2 border-t">
                  <label className="text-xs text-muted-foreground">Match to vendor commitment</label>
                  <select className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                    value={commitmentId} onChange={(e) => setCommitmentId(e.target.value)}>
                    <option value="">Select commitment…</option>
                    {commitments.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.commitment_no} — {c.title}</option>
                    ))}
                  </select>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleProcess} disabled={process.isPending}>
                      {selected.doc_type === "lien_release" ? "Create lien release" : "Create draft invoice"}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => reject.mutate(selected.id)}>Reject</Button>
                  </div>
                </div>
              )}

              <div className="pt-2 border-t">
                <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive"
                  onClick={() => { if (confirm("Delete this submission? This can’t be undone.")) remove.mutate(selected.id, { onSuccess: () => { setSelected(null); toast.success("Deleted"); } }); }}
                  disabled={remove.isPending}>
                  Delete submission
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
