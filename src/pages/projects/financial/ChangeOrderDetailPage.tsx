import { useParams, Link, useSearchParams, useNavigate } from "react-router-dom";
import { useDeleteChangeOrder } from "@/hooks/useChangeOrders";
import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AttachmentField } from "@/components/common/AttachmentField";
import { ChangeOrderSignDialog } from "@/components/financial/ChangeOrderSignDialog";
import { SendChangeOrderDialog } from "@/components/financial/SendChangeOrderDialog";
import { ChangeOrderDocument } from "@/lib/changeOrder/ChangeOrderDocument";
import { CoSpecEditor } from "@/components/financial/CoSpecEditor";
import { buildCoPdf } from "@/lib/changeOrder/coPdf";
import { recomputePricing } from "@/lib/changeOrder/pricing";
import { useCoWorkflow } from "@/hooks/useCoWorkflow";
import type { ChangeOrder } from "@/hooks/useProcoreChangeOrders";
import type { CoSpec } from "@/lib/changeOrder/types";
import { ChangeOrderLineGrid } from "@/components/financial/ChangeOrderLineGrid";
import { PromoteToOcoDialog } from "@/components/financial/PromoteToOcoDialog";
import { CoPdfExport } from "@/components/financial/CoPdfExport";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { money } from "@/lib/pdf";
import { ChevronRight, LayoutDashboard, Lock, PenLine, Pencil, Save, Send, CheckCircle2, FileDown, Trash2, Hash } from "lucide-react";
import { useProject } from "@/hooks/useProjects";
import { useCurrentUserRole } from "@/hooks/useUserManagement";
import { isAdminRole } from "@/lib/rbac";
import { RenumberCoDialog } from "@/components/financial/RenumberCoDialog";
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
  const [renumberOpen, setRenumberOpen] = useState(false);
  const { data: role } = useCurrentUserRole();
  const canRenumber = isAdminRole(role);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<CoSpec | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const { update } = useCoWorkflow(projectId ?? null);
  const qc = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const navigate = useNavigate();
  const deleteCo = useDeleteChangeOrder();
  const docRef = useRef<HTMLDivElement>(null);
  const [pdfBusy, setPdfBusy] = useState(false);
  const spec = (co as any)?.spec as CoSpec | null;
  const locked = Boolean((co as any)?.locked);

  async function downloadPdf() {
    if (!spec) return;
    setPdfBusy(true);
    try {
      const pdf = await buildCoPdf(spec, {
        submitted: (co as any)?.submitted_signature_path,
        accepted: (co as any)?.accepted_signature_path,
      });
      pdf.save(`${spec.doc.co_label || "change-order"}.pdf`);
    } catch (e) {
      toast.error(`PDF export failed: ${(e as Error).message}`);
    } finally {
      setPdfBusy(false);
    }
  }
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

  // A generated CO (has a spec) can be edited inline until it's signed/locked or executed.
  const canEdit = Boolean(spec) && !locked && !readOnly;
  function patchDraft(updater: (s: CoSpec) => void) {
    setDraft((prev) => { if (!prev) return prev; const next = structuredClone(prev); updater(next); return next; });
  }
  function startEdit() { if (spec) { setDraft(structuredClone(spec)); setEditing(true); } }
  function cancelEdit() { setEditing(false); setDraft(null); }
  async function saveEdit() {
    if (!draft || !coId) return;
    if (!draft.doc.title.trim()) { toast.error("Add a title for the change order."); return; }
    const finalSpec = structuredClone(draft);
    finalSpec.pricing = recomputePricing(finalSpec.pricing);
    if (!finalSpec.doc.co_label && finalSpec.doc.co_number) {
      finalSpec.doc.co_label = `PCO-${String(finalSpec.doc.co_number).padStart(3, "0")}`;
    }
    setSavingEdit(true);
    try {
      await update.mutateAsync({ coId, spec: finalSpec });
      toast.success("Change order saved");
      setEditing(false);
      setDraft(null);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSavingEdit(false);
    }
  }

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
          {co.status === "rejected" && (co as any).client_comments && (
            <div className="mt-2 rounded-md border-l-2 border-[var(--apas-rose)] bg-[var(--apas-rose)]/5 px-3 py-2">
              <p className="text-xs font-semibold text-[var(--apas-rose)]">Rejected by client{(co as any).accepted_signed_name ? ` (${(co as any).accepted_signed_name})` : ""}</p>
              <p className="text-sm mt-0.5">{(co as any).client_comments}</p>
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {spec ? (
            editing && draft ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <p className="text-sm text-muted-foreground">Editing this change order — changes apply when you save.</p>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={cancelEdit} disabled={savingEdit}>Cancel</Button>
                    <Button onClick={saveEdit} disabled={savingEdit}><Save className="h-4 w-4 mr-1.5" /> {savingEdit ? "Saving…" : "Save changes"}</Button>
                  </div>
                </div>
                <CoSpecEditor spec={draft} onPatch={patchDraft} coNumberPlaceholder={String(co.co_no ?? "")} />
                {/* Live preview of the edited document */}
                <div className="rounded-md border bg-muted/30 p-3 overflow-auto max-h-[680px]">
                  <ChangeOrderDocument spec={{ ...draft, pricing: recomputePricing(draft.pricing) }} />
                </div>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap gap-2">
                  {canEdit && <Button variant="outline" onClick={startEdit}><Pencil className="h-4 w-4 mr-1.5" /> Edit</Button>}
                  {canRenumber && (locked || readOnly) && (
                    <Button variant="outline" onClick={() => setRenumberOpen(true)}>
                      <Hash className="h-4 w-4 mr-1.5" /> Renumber (admin)
                    </Button>
                  )}
                  {!locked && <Button onClick={() => setSignOpen(true)}><PenLine className="h-4 w-4 mr-1.5" /> Sign &amp; lock</Button>}
                  {locked && !acceptedAt && <Button onClick={() => setSendOpen(true)}><Send className="h-4 w-4 mr-1.5" /> {sentAt ? "Re-send to client" : "Send to client"}</Button>}
                  {docxPath && <a href={docxPath} target="_blank" rel="noopener noreferrer"><Button variant="outline"><FileDown className="h-4 w-4 mr-1.5" /> Editable .docx</Button></a>}
                  <Button variant="outline" disabled={pdfBusy} onClick={downloadPdf}><FileDown className="h-4 w-4 mr-1.5" /> {pdfBusy ? "Preparing…" : "Download PDF"}</Button>
                </div>
                {/* Live rendered skill template — always visible, theme-independent */}
                <div className="rounded-md border bg-muted/30 p-3 overflow-auto max-h-[680px]">
                  <ChangeOrderDocument
                    ref={docRef}
                    spec={spec}
                    signatures={{
                      submitted: (co as any).submitted_signature_path ?? null,
                      accepted: (co as any).accepted_signature_path ?? null,
                    }}
                  />
                </div>
              </>
            )
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
        <CardContent className="flex flex-wrap items-center gap-2">
          {co.co_type === "PCO" && co.status !== "executed" && co.status !== "void" && (
            <Button onClick={() => setPromoteOpen(true)}>Promote to OCO</Button>
          )}
          {co.status === "executed" && (
            <span className="text-sm text-muted-foreground">
              Executed — to reverse, create a new CO with the inverse amount.
            </span>
          )}
          <div className="ml-auto">
            <Button
              variant="ghost"
              className="text-destructive hover:text-destructive"
              disabled={deleteCo.isPending}
              onClick={() => {
                const isDraft = co.status === "draft" && !locked;
                const msg = isDraft
                  ? `Delete ${label}? This cannot be undone.`
                  : `${label} is signed/executed and part of the financial record. Permanently delete it anyway? This cannot be undone.`;
                if (window.confirm(msg)) {
                  deleteCo.mutate({ id: co.id, force: !isDraft }, {
                    onSuccess: () => navigate(`/projects/${projectId}/financials/change-orders`),
                  });
                }
              }}
            >
              <Trash2 className="h-4 w-4 mr-1.5" /> Delete change order
            </Button>
          </div>
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
      <RenumberCoDialog
        open={renumberOpen}
        onOpenChange={setRenumberOpen}
        co={{ id: co.id, co_no: co.co_no, co_type: co.co_type, co_no_history: (co as any).co_no_history }}
        onDone={() => qc.invalidateQueries({ queryKey: ["co", coId] })}
      />
    </div>
  );
}
