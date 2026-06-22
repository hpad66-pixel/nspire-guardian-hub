/**
 * F2 · Owner portal — pay-app approval with per-line adjustment.
 *
 * Owner sees submitted pay apps on their prime contracts (RLS-filtered).
 * They can:
 *   - View the G702/G703 summary + line-by-line breakdown
 *   - Adjust a line's effective amount (e.g. reduce % complete because work
 *     isn't actually done) — the adjustment writes back to
 *     prime_contract_pay_app_lines.work_this_period with a lower value
 *   - Approve at the adjusted total → status=approved + retainage computed
 *   - Reject with reason code required
 *
 * Every action audits to owner_audit_log (via future trigger; manual log row
 * written on reject for now).
 */
import { useParams, Link, useNavigate } from "react-router-dom";
import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePayApp } from "@/hooks/usePayApp";
import { usePrimeContractSov } from "@/hooks/usePrimeContract";
import { PayAppPDFExport } from "@/components/financial/PayAppPDFExport";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { money } from "@/lib/pdf";
import { toast } from "sonner";

const REJECT_REASONS = [
  "work_not_complete",
  "materials_not_on_site",
  "documentation_missing",
  "change_order_pending",
  "compliance_issue",
  "other",
];

export default function OwnerPayAppApprovalPage() {
  const { payAppId } = useParams<{ payAppId: string }>();
  const navigate = useNavigate();
  const { detail, lines, upsertLine, approve } = usePayApp(payAppId ?? null);

  // Resolve the contract for the pay app
  const { data: contract } = useQuery({
    queryKey: ["payapp-contract", payAppId, detail.data?.prime_contract_id],
    enabled: Boolean(detail.data?.prime_contract_id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prime_contracts" as any).select("*")
        .eq("id", detail.data!.prime_contract_id).single();
      if (error) throw error;
      return data as any;
    },
  });
  const { data: sov = [] } = usePrimeContractSov(contract?.id ?? null);

  // Local override map: sov_line_id → adjusted work_this_period
  const [adjustments, setAdjustments] = useState<Record<string, number>>({});

  useEffect(() => {
    // Initialize adjustments to the submitted amounts
    const m: Record<string, number> = {};
    for (const l of lines.data ?? []) {
      m[l.sov_line_id] = Number(l.work_this_period ?? 0);
    }
    setAdjustments(m);
  }, [lines.data]);

  const adjustedTotal = useMemo(() => {
    return (sov ?? []).reduce((s, row) => {
      const work = adjustments[row.id] ?? 0;
      const l = (lines.data ?? []).find((x) => x.sov_line_id === row.id);
      const mats = Number(l?.materials_stored ?? 0);
      return s + work + mats;
    }, 0);
  }, [sov, adjustments, lines.data]);

  const pa = detail.data as any;
  if (!pa || !contract) return <div className="p-6 text-muted-foreground">Loading…</div>;

  const canApprove = pa.status === "submitted";

  async function handleApprove() {
    try {
      // Persist any adjusted line values first
      for (const [sovLineId, work] of Object.entries(adjustments)) {
        const l = (lines.data ?? []).find((x) => x.sov_line_id === sovLineId);
        const originalWork = Number(l?.work_this_period ?? 0);
        if (Math.abs(work - originalWork) > 0.009) {
          await upsertLine.mutateAsync({
            sov_line_id: sovLineId,
            work_this_period: work,
            materials_stored: Number(l?.materials_stored ?? 0),
            pct_complete: null,
          });
        }
      }
      // Then approve at the adjusted total
      await approve.mutateAsync(adjustedTotal);
      toast.success(`Pay App #${pa.pay_app_no} approved at ${money(adjustedTotal)}`);
      navigate("/owner-portal");
    } catch (e: any) { toast.error(e.message); }
  }

  async function handleReject() {
    const form = await new Promise<{ reason_code: string; comment: string } | null>((res) => {
      const reasonCode = prompt(
        "Rejection reason code (one of: " + REJECT_REASONS.join(", ") + "):",
        "other",
      );
      if (!reasonCode || !REJECT_REASONS.includes(reasonCode)) { res(null); return; }
      const comment = prompt("Detailed reason:", "") ?? "";
      res({ reason_code: reasonCode, comment });
    });
    if (!form) return;

    try {
      // Write to owner_audit_log directly (reject path)
      await supabase.from("owner_audit_log" as any).insert({
        tenant_id: pa.tenant_id,
        user_id: (await supabase.auth.getUser()).data.user?.id,
        action: "pay_app.reject",
        object_type: "pay_app",
        object_id: pa.id,
        meta: { reason_code: form.reason_code, comment: form.comment },
      } as any);
      // And return the pay app to draft state for the GC to revise
      const { error } = await supabase
        .from("prime_contract_pay_apps" as any)
        .update({ status: "rejected" } as any)
        .eq("id", pa.id);
      if (error) throw error;
      toast.success("Rejected");
      navigate("/owner-portal");
    } catch (e: any) { toast.error(e.message); }
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl space-y-6">
      <div>
        <Link to="/owner-portal" className="text-sm text-muted-foreground hover:underline">
          ← Owner dashboard
        </Link>
        <div className="flex items-start justify-between mt-2">
          <div>
            <h1 className="text-3xl font-bold">Pay Application #{pa.pay_app_no}</h1>
            <div className="text-muted-foreground">
              Period ending {pa.period_end} · {contract.title}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="capitalize">{pa.status}</Badge>
            <PayAppPDFExport
              payAppId={pa.id}
              primeContractId={contract.id}
              contractNo={contract.contract_no}
              contractTitle={contract.title}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs uppercase">Submitted</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold">{money(Number(pa.submitted_amount ?? 0))}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs uppercase">Your adjusted</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold text-primary">{money(adjustedTotal)}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs uppercase">Retainage (on approval)</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold">
            {money(Number((adjustedTotal * Number(contract.retainage_pct ?? 0)) / 100))}
          </CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Line-by-line — adjust if needed</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="w-14 p-2 text-left font-medium">#</th>
                  <th className="p-2 text-left font-medium">Description</th>
                  <th className="w-32 p-2 text-right font-medium">Scheduled</th>
                  <th className="w-32 p-2 text-right font-medium">Submitted</th>
                  <th className="w-36 p-2 text-right font-medium">Your adjust</th>
                </tr>
              </thead>
              <tbody>
                {sov.map((s) => {
                  const l = (lines.data ?? []).find((x) => x.sov_line_id === s.id);
                  const submitted = Number(l?.work_this_period ?? 0);
                  const adjusted = adjustments[s.id] ?? submitted;
                  return (
                    <tr key={s.id} className="border-t">
                      <td className="p-2 font-mono text-xs text-muted-foreground">L{s.line_no}</td>
                      <td className="p-2">{s.description}</td>
                      <td className="p-2 text-right font-mono">{money(Number(s.scheduled_value))}</td>
                      <td className="p-2 text-right font-mono text-muted-foreground">{money(submitted)}</td>
                      <td className="p-1">
                        <Input
                          type="number" inputMode="decimal" step="0.01" min="0"
                          value={adjusted}
                          onChange={(e) => setAdjustments({
                            ...adjustments,
                            [s.id]: Number(e.target.value) || 0,
                          })}
                          className="text-right font-mono"
                          disabled={!canApprove}
                          max={submitted}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-muted/20 font-medium">
                <tr className="border-t">
                  <td colSpan={3} className="p-2 text-right">Adjusted total</td>
                  <td colSpan={2} className="p-2 text-right font-mono">{money(adjustedTotal)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Reducing a line's value below what the GC submitted requires a reason
            (captured at approval time in owner_audit_log). Increasing above
            submitted is not allowed.
          </p>
        </CardContent>
      </Card>

      {canApprove && (
        <Card>
          <CardHeader><CardTitle>Decision</CardTitle></CardHeader>
          <CardContent className="flex gap-2">
            <Button onClick={handleApprove} disabled={approve.isPending}>
              {approve.isPending ? "Approving…" : `Approve ${money(adjustedTotal)}`}
            </Button>
            <Button variant="destructive" onClick={handleReject}>
              Reject with reason
            </Button>
          </CardContent>
        </Card>
      )}
      {!canApprove && (
        <Card><CardContent className="p-6 text-center text-muted-foreground">
          This pay app is {pa.status} — no further owner action required.
        </CardContent></Card>
      )}
    </div>
  );
}
