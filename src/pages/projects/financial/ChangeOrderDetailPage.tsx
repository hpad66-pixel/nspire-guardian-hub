import { useParams, Link, useSearchParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AttachmentField } from "@/components/common/AttachmentField";
import { ChangeOrderSignDialog } from "@/components/financial/ChangeOrderSignDialog";
import { SendChangeOrderDialog } from "@/components/financial/SendChangeOrderDialog";
import type { ChangeOrder } from "@/hooks/useProcoreChangeOrders";
import type { CoSpec } from "@/lib/changeOrder/types";
import { ChangeOrderLineGrid } from "@/components/financial/ChangeOrderLineGrid";
import { PromoteToOcoDialog } from "@/components/financial/PromoteToOcoDialog";
import { CoPdfExport } from "@/components/financial/CoPdfExport";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { money } from "@/lib/pdf";
import { ChevronRight, LayoutDashboard, Lock, PenLine, Send, CheckCircle2, FileDown } from "lucide-react";
import { useProject } from "@/hooks/useProjects";
import { FinancialSubNav } from "@/components/financial/FinancialSubNav";

export default function ChangeOrderDetailPage() {
  const { projectId, coId } = useParams<{ projectId: string; coId: string }>();
  const { data: project } = useProject(projectId ?? null);

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
  const [signOpen, setSignOpen] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const qc = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const spec = (co as any)?.spec as CoSpec | null;
  const locked = Boolean((co as any)?.locked);
  const signedAt = (co as any)?.submitted_signed_at as string | null;
  const acceptedAt = (co as any)?.accepted_signed_at as string | null;
  const sentAt = (co as any)?.sent_to_client_at as string | null;
  const docxPath = (co as any)?.docx_path as string | null;

  // Auto-open the sign dialog when arriving from the generator (?sign=1).
  useEffect(() => {
    if (searchParams.get("sign") === "1" && spec && !locked) {
      setSignOpen(true);
      const next = new URLSearchParams(searchParams); next.delete("sign"); setSearchParams(next, { replace: true });
    }
  }, [searchParams, spec, locked, setSearchParams]);

  async function setCoPdf(url: string | null) {
    if (!coId) return;
    const { error } = await supabase.from("change_orders" as any).update({ pdf_path: url }).eq("id", coId);
    if (error) throw error;
    qc.invalidateQueries({ queryKey: ["co", coId] });
    qc.invalidateQueries({ queryKey: ["change-orders"] });
  }

  if (!co) return <div className="p-6 text-muted-foreground">Loading change order…</div>;

  const label = `${co.co_type ?? "CO"}-${String(co.co_no ?? 0).padStart(4, "0")}`;
  const readOnly = co.status === "executed" || co.status === "void";

  return (
    <div className="container mx-auto p-6 max-w-5xl space-y-6">
      <FinancialSubNav projectId={projectId ?? ""} />
      <div>
        <nav className="flex items-center gap-1.5 text-sm text-muted-foreground flex-wrap mb-4">
          <Link to="/dashboard" className="hover:text-foreground flex items-center gap-1">
            <LayoutDashboard className="h-3.5 w-3.5" />
            Dashboard
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <Link to={`/projects/${projectId}`} className="hover:text-foreground">
            {project?.name ?? 'Project'}
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <Link to={`/projects/${projectId}/financials/prime-contract`} className="hover:text-foreground">
            Financials
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <Link to={`/projects/${projectId}/financials/change-orders`} className="hover:text-foreground">
            Change Orders
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-foreground font-medium truncate">{co.title}</span>
        </nav>
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

      {/* Change-order document + signing workflow */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <CardTitle>Change order document</CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              {locked && <Badge className="bg-emerald-100 text-emerald-800 gap-1"><Lock className="h-3 w-3" /> Locked</Badge>}
              {acceptedAt && <Badge className="bg-emerald-600 text-white gap-1"><CheckCircle2 className="h-3 w-3" /> Client accepted</Badge>}
              {!acceptedAt && sentAt && <Badge className="bg-blue-100 text-blue-800 gap-1"><Send className="h-3 w-3" /> Sent to client</Badge>}
            </div>
          </div>
          {spec && (
            <p className="text-xs text-muted-foreground mt-1">
              {signedAt ? `Signed by you ${new Date(signedAt).toLocaleDateString()}. ` : "Generated — sign to lock and send. "}
              {acceptedAt && `Accepted by client ${new Date(acceptedAt).toLocaleDateString()}.`}
            </p>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {spec ? (
            <>
              <div className="flex flex-wrap gap-2">
                {!locked && <Button onClick={() => setSignOpen(true)}><PenLine className="h-4 w-4 mr-1.5" /> Sign &amp; lock</Button>}
                {locked && !acceptedAt && <Button onClick={() => setSendOpen(true)}><Send className="h-4 w-4 mr-1.5" /> {sentAt ? "Re-send to client" : "Send to client"}</Button>}
                {docxPath && <a href={docxPath} target="_blank" rel="noopener noreferrer"><Button variant="outline"><FileDown className="h-4 w-4 mr-1.5" /> Editable .docx</Button></a>}
              </div>
              {(co as any).pdf_path && (
                <object data={(co as any).pdf_path} type="application/pdf" className="w-full rounded-md border" style={{ height: 560 }}>
                  <a href={(co as any).pdf_path} target="_blank" rel="noopener noreferrer" className="text-[var(--apas-sapphire)] underline">Open the change order PDF</a>
                </object>
              )}
            </>
          ) : (
            <AttachmentField
              url={(co as any).pdf_path}
              onChange={setCoPdf}
              projectId={projectId ?? ""}
              folder="change-orders"
              label="Change order"
              readOnly={co.status === "void"}
            />
          )}
        </CardContent>
      </Card>

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

      {coId && (
        <ChangeOrderSignDialog
          open={signOpen}
          onOpenChange={setSignOpen}
          coId={coId}
          spec={spec}
          projectId={projectId ?? ""}
          onSigned={() => qc.invalidateQueries({ queryKey: ["co", coId] })}
        />
      )}
      {coId && (
        <SendChangeOrderDialog
          open={sendOpen}
          onOpenChange={setSendOpen}
          co={co as any}
          onSent={() => qc.invalidateQueries({ queryKey: ["co", coId] })}
        />
      )}
    </div>
  );
}
