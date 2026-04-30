import { useParams, Link } from "react-router-dom";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ChangeOrder } from "@/hooks/useProcoreChangeOrders";
import { ChangeOrderLineGrid } from "@/components/financial/ChangeOrderLineGrid";
import { PromoteToOcoDialog } from "@/components/financial/PromoteToOcoDialog";
import { CoPdfExport } from "@/components/financial/CoPdfExport";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { money } from "@/lib/pdf";

export default function ChangeOrderDetailPage() {
  const { projectId, coId } = useParams<{ projectId: string; coId: string }>();

  const { data: co } = useQuery<ChangeOrder | null>({
    queryKey: ["co", coId],
    enabled: Boolean(coId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("change_orders" as any).select("*")
        .eq("id", coId!).maybeSingle();
      if (error) throw error;
      return (data ?? null) as ChangeOrder | null;
    },
  });

  const { data: peer } = useQuery({
    queryKey: ["co-peer", co?.peer_co_id],
    enabled: Boolean(co?.peer_co_id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("change_orders" as any).select("*")
        .eq("id", co!.peer_co_id!).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const [promoteOpen, setPromoteOpen] = useState(false);

  if (!co) return <div className="p-6 text-muted-foreground">Loading change order…</div>;

  const label = `${co.co_type ?? "CO"}-${String(co.co_no ?? 0).padStart(4, "0")}`;
  const readOnly = co.status === "executed" || co.status === "void";

  return (
    <div className="container mx-auto p-6 max-w-5xl space-y-6">
      <div>
        <Link
          to={`/projects/${projectId}/financials/change-orders`}
          className="text-sm text-muted-foreground hover:underline"
        >← Change Orders</Link>
        <div className="flex items-start justify-between mt-2">
          <div>
            <h1 className="text-3xl font-bold">
              <span className="font-mono text-muted-foreground mr-2">{label}</span>
              {co.title}
            </h1>
            {co.description && (
              <div className="text-muted-foreground mt-1 max-w-3xl">{co.description}</div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="capitalize">{co.status.replace("_", " ")}</Badge>
            <CoPdfExport co={co} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs uppercase">Amount</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold">{money(Number(co.amount))}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs uppercase">Days impact</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold">{co.days_impact}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs uppercase">Reason</CardTitle></CardHeader>
          <CardContent className="text-sm">{co.reason_code ?? "—"}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs uppercase">Executed</CardTitle></CardHeader>
          <CardContent className="text-sm">{co.executed_date ?? "—"}</CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Line items</CardTitle></CardHeader>
        <CardContent>
          <ChangeOrderLineGrid
            coId={co.id}
            headerAmount={Number(co.amount)}
            readOnly={readOnly}
          />
        </CardContent>
      </Card>

      {/* Peer panel: OCO↔CCO pairing */}
      {(co.co_type === "OCO" || co.co_type === "CCO") && (
        <Card>
          <CardHeader><CardTitle>Peer change order</CardTitle></CardHeader>
          <CardContent>
            {peer ? (
              <Link
                to={`/projects/${projectId}/financials/cos/${(peer as any).id}`}
                className="flex items-center justify-between hover:bg-muted p-2 rounded"
              >
                <div>
                  <span className="font-mono text-muted-foreground mr-2">
                    {(peer as any).co_type}-{String((peer as any).co_no ?? 0).padStart(4, "0")}
                  </span>
                  {(peer as any).title}
                </div>
                <span className="font-mono">{money(Number((peer as any).amount))}</span>
              </Link>
            ) : (
              <div className="text-muted-foreground text-sm">No peer CO linked.</div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <Card>
        <CardHeader><CardTitle>Actions</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {co.co_type === "PCO" && co.status !== "executed" && co.status !== "void" && (
            <Button onClick={() => setPromoteOpen(true)}>Promote to OCO</Button>
          )}
          {co.status === "executed" && (
            <span className="text-sm text-muted-foreground">
              Executed — to reverse, create a new CO with the inverse amount.
            </span>
          )}
        </CardContent>
      </Card>

      <PromoteToOcoDialog
        open={promoteOpen}
        onOpenChange={setPromoteOpen}
        pco={co}
      />
    </div>
  );
}
