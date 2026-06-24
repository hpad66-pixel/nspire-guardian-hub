/**
 * Audit + tracking for punch lists sent to subs: who it went to, when it was sent /
 * viewed / responded, and the latest status the sub reported per item.
 */
import { useState } from "react";
import { toast } from "sonner";
import { ChevronDown, ChevronRight, Copy, Mail } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { usePunchTransmittals, type PunchTransmittal } from "@/hooks/usePunchTransmittals";

const fmt = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "—";

const TX_STATUS: Record<string, { label: string; cls: string }> = {
  sent: { label: "Sent", cls: "bg-[var(--apas-sapphire)]/10 text-[var(--apas-sapphire)]" },
  viewed: { label: "Viewed", cls: "bg-amber-100 text-amber-700" },
  responded: { label: "Responded", cls: "bg-emerald-100 text-emerald-700" },
  closed: { label: "Closed", cls: "bg-muted text-muted-foreground" },
  draft: { label: "Draft", cls: "bg-muted text-muted-foreground" },
};
const SUB_STATUS: Record<string, { label: string; cls: string }> = {
  acknowledged: { label: "Acknowledged", cls: "text-[var(--apas-sapphire)]" },
  in_progress: { label: "In progress", cls: "text-amber-600" },
  completed: { label: "Completed", cls: "text-emerald-600" },
  disputed: { label: "Disputed", cls: "text-[var(--apas-rose)]" },
};

function Row({ tx }: { tx: PunchTransmittal }) {
  const [open, setOpen] = useState(false);
  const s = TX_STATUS[tx.status] ?? TX_STATUS.sent;
  const respondUrl = `${window.location.origin}/respond/punch/${tx.respond_token}`;
  const respondedCount = (tx.items ?? []).filter((i) => i.sub_status).length;

  return (
    <div className="border-t first:border-t-0">
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/30">
        {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate">{tx.recipient_name || tx.recipient_email}</div>
          <div className="text-xs text-muted-foreground">{tx.item_count} item{tx.item_count === 1 ? "" : "s"} · sent {fmt(tx.sent_at)}</div>
        </div>
        {respondedCount > 0 && <span className="text-xs text-muted-foreground">{respondedCount}/{tx.item_count} responded</span>}
        <Badge className={`text-[10px] ${s.cls}`}>{s.label}</Badge>
      </button>
      {open && (
        <div className="bg-muted/20 px-4 pb-3 pl-11 space-y-3">
          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground pt-2">
            <span>Sent {fmt(tx.sent_at)}</span>
            <span>Viewed {fmt(tx.viewed_at)}</span>
            <span>Responded {fmt(tx.responded_at)}</span>
            <button
              className="inline-flex items-center gap-1 text-[var(--apas-sapphire)] hover:underline"
              onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(respondUrl); toast.success("Response link copied"); }}
            >
              <Copy className="h-3 w-3" /> Copy link
            </button>
          </div>
          <table className="w-full text-xs">
            <tbody>
              {(tx.items ?? []).map((i) => {
                const ss = i.sub_status ? SUB_STATUS[i.sub_status] : null;
                return (
                  <tr key={i.id} className="border-b border-border/40 last:border-0 align-top">
                    <td className="py-1.5">
                      {i.description}<span className="text-muted-foreground"> · {i.location || "—"}</span>
                      {(i.photos ?? []).length > 0 && (
                        <span className="mt-1 flex flex-wrap gap-1">
                          {i.photos!.map((url, n) => (
                            <a key={n} href={url} target="_blank" rel="noreferrer">
                              <img src={url} alt="" className="h-12 w-12 rounded object-cover border" />
                            </a>
                          ))}
                        </span>
                      )}
                    </td>
                    <td className="py-1.5 text-right whitespace-nowrap">
                      {ss ? <span className={`font-semibold ${ss.cls}`}>{ss.label}</span> : <span className="text-muted-foreground">Awaiting</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function PunchTransmittalsPanel({ projectId }: { projectId: string }) {
  const { data: transmittals = [], isLoading } = usePunchTransmittals(projectId);
  if (isLoading) return null;
  if (transmittals.length === 0) return null;
  return (
    <Card>
      <CardContent className="p-0">
        <div className="flex items-center gap-2 border-b bg-muted/30 px-4 py-2.5 text-sm font-semibold">
          <Mail className="h-4 w-4 text-muted-foreground" /> Sent to subcontractors
        </div>
        {transmittals.map((tx) => <Row key={tx.id} tx={tx} />)}
      </CardContent>
    </Card>
  );
}
