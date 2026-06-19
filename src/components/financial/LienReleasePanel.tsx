import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldCheck, ShieldAlert, Plus } from "lucide-react";
import { useLienReleases, type LienRelease } from "@/hooks/useLienReleases";
import type { ReleaseType } from "@/lib/financial/lien";

const RELEASE_TYPES: { value: ReleaseType; label: string }[] = [
  { value: "conditional_progress", label: "Conditional · Progress" },
  { value: "unconditional_progress", label: "Unconditional · Progress" },
  { value: "conditional_final", label: "Conditional · Final" },
  { value: "unconditional_final", label: "Unconditional · Final" },
];

const STATUS_COLOR: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  submitted: "bg-amber-100 text-amber-800",
  approved: "bg-emerald-100 text-emerald-800",
  rejected: "bg-red-100 text-red-800",
  void: "bg-muted text-muted-foreground",
};

interface Props {
  projectId: string;
  /** inbound (from sub, on a commitment invoice) or outbound (to owner, on a pay app). */
  direction: "inbound" | "outbound";
  commitmentInvoiceId?: string;
  payAppId?: string;
}

export function LienReleasePanel({ projectId, direction, commitmentInvoiceId, payAppId }: Props) {
  const filter = direction === "inbound"
    ? { commitmentInvoiceId } : { payAppId };
  const { data: releases = [], create, submitForApproval, approve, reject } =
    useLienReleases(projectId, filter);

  const [adding, setAdding] = useState(false);
  const [releaseType, setReleaseType] = useState<ReleaseType>("conditional_progress");
  const [throughDate, setThroughDate] = useState("");
  const [amount, setAmount] = useState("");

  const satisfied = releases.some((r) => r.status === "approved");

  async function add() {
    try {
      await create.mutateAsync({
        direction, release_type: releaseType,
        commitment_invoice_id: direction === "inbound" ? commitmentInvoiceId : null,
        pay_app_id: direction === "outbound" ? payAppId : null,
        through_date: throughDate || null,
        amount: amount ? Number(amount) : null,
      });
      toast.success("Lien release added");
      setAdding(false); setThroughDate(""); setAmount("");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to add lien release");
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          {satisfied
            ? <ShieldCheck className="h-4 w-4 text-emerald-600" />
            : <ShieldAlert className="h-4 w-4 text-amber-600" />}
          Lien Releases <span className="text-xs font-normal text-muted-foreground">({direction})</span>
        </CardTitle>
        <Button size="sm" variant="outline" onClick={() => setAdding((v) => !v)}>
          <Plus className="h-4 w-4 mr-1" /> Add
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {direction === "inbound" && (
          <p className={`text-xs ${satisfied ? "text-emerald-700" : "text-amber-700"}`}>
            {satisfied ? "Gate satisfied — payment allowed." : "No approved waiver — payment is blocked."}
          </p>
        )}

        {adding && (
          <div className="rounded-md border p-3 space-y-2">
            <div className="space-y-1">
              <Label className="text-xs">Type</Label>
              <select className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                value={releaseType} onChange={(e) => setReleaseType(e.target.value as ReleaseType)}>
                {RELEASE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Through date</Label>
                <Input type="date" value={throughDate} onChange={(e) => setThroughDate(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Amount</Label>
                <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
              </div>
            </div>
            <Button size="sm" onClick={add} disabled={create.isPending}>Save</Button>
          </div>
        )}

        {releases.length === 0 && !adding && (
          <p className="text-sm text-muted-foreground">No lien releases yet.</p>
        )}

        <ul className="space-y-2">
          {releases.map((r: LienRelease) => (
            <li key={r.id} className="flex items-center justify-between gap-2 text-sm border-t pt-2">
              <div>
                <div className="font-medium">{r.release_type.replace(/_/g, " ")}</div>
                <div className="text-xs text-muted-foreground">
                  {r.through_date ?? "—"}{r.amount ? ` · $${r.amount}` : ""}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={STATUS_COLOR[r.status] ?? ""}>{r.status}</Badge>
                {r.status === "pending" && (
                  <Button size="sm" variant="outline" onClick={() => submitForApproval.mutate(r)}>Submit</Button>
                )}
                {(r.status === "pending" || r.status === "submitted") && (
                  <>
                    <Button size="sm" onClick={() => approve.mutate(r)}>Approve</Button>
                    <Button size="sm" variant="ghost" onClick={() => reject.mutate(r)}>Reject</Button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
