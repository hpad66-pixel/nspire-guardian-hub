/**
 * DocumentWorkspace — upload a Word letter, edit it on its real letterhead, save.
 * Saving simply BECOMES the current version — no separate "replace" step. Real
 * version control is a browsable history (restore or delete any past snapshot),
 * not a gate blocking normal use. Export/email use a pixel-perfect rasterized PDF
 * of the actual rendered letter (same technique as this app's pay-app PDFs) so
 * what you see is exactly what gets sent — no HTML/Word reinterpretation that can
 * mangle fonts or add stray shading. All client-side — no API.
 */
import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ProRichTextEditor } from "@/components/ui/rich-text-editor";
import { Textarea } from "@/components/ui/textarea";
import {
  FileText, Upload, Plus, ArrowLeft, Loader2, Lock, Unlock, FileDown, Trash2, Check,
  Pencil, Eye, AlertTriangle, Bold, Italic, Underline, Save, Mail, History, RotateCcw, X, Sparkles,
  PenLine, Send, FileCheck2, Inbox, WandSparkles, LayoutTemplate,
  Heading2, List, ListOrdered, AlignLeft, AlignCenter, AlignRight, Undo2, Redo2, Eraser,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuthoredDocuments, useDocumentVersions, type AuthoredDocument, type DocumentVersion } from "@/hooks/useAuthoredDocuments";
import { parseUpload, htmlToText, ACCEPTED_UPLOAD } from "@/lib/docs/parseUpload";
import { fileToBase64, downloadBase64, renderDocxInto, pdfObjectUrl, downloadHtmlAsPdf, htmlToPdfAttachment, MIME, extFor, filenameFor } from "@/lib/docs/render";
import { EmailDocumentDialog, type DocAttachment } from "./EmailDocumentDialog";
import { DocumentTasksPanel } from "./DocumentTasksPanel";
import { SignAuthoredDocumentDialog } from "./SignAuthoredDocumentDialog";
import { SendAuthoredDocumentDialog } from "./SendAuthoredDocumentDialog";
import { ESignStamp } from "@/components/correspondence/ESignStamp";
import { DOC_WORKFLOW_META, DOC_WORKFLOW_FILTERS, resolveDocWorkflow, type DocWorkflowStatus } from "@/lib/correspondence/docWorkflow";
import { stampSignedHtml } from "@/lib/correspondence/stampSignedHtml";
import { stampSignedPdfBlob } from "@/lib/correspondence/stampSignedPdf";
import { clientReadyDocumentHtml } from "@/lib/docs/clientReadyDocument";
import { cn } from "@/lib/utils";

const fmtAgo = (d: string): string => {
  const s = Math.max(0, (Date.now() - new Date(d).getTime()) / 1000);
  if (s < 90) return "just now";
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
};
const stripExt = (n: string) => n.replace(/\.[^.]+$/, "");
const mimeOf = (file: File) => (/\.pdf$/i.test(file.name) || file.type === MIME.pdf ? MIME.pdf : MIME.docx);

type Docs = ReturnType<typeof useAuthoredDocuments>;

export function DocumentWorkspace({ projectId, projectName }: { projectId: string; projectName?: string | null }) {
  const docs = useAuthoredDocuments(projectId);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [filter, setFilter] = useState<DocWorkflowStatus | "all">("all");
  const [hoverId, setHoverId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const list = (docs.data ?? []) as AuthoredDocument[];
  const selected = list.find((d) => d.id === selectedId) ?? null;
  const filtered = filter === "all" ? list : list.filter((d) => resolveDocWorkflow(d) === filter);
  const hoverDoc = list.find((d) => d.id === hoverId) ?? null;

  const counts = list.reduce((acc, d) => {
    const w = resolveDocWorkflow(d);
    acc[w] = (acc[w] || 0) + 1;
    acc.all += 1;
    return acc;
  }, { all: 0, uploaded: 0, drafting: 0, signed: 0, sent: 0, executed: 0 } as Record<string, number>);

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const mime = mimeOf(file);
      const [base64, parsed] = await Promise.all([fileToBase64(file), parseUpload(file)]);
      // For Word letters, render the faithful docx-preview HTML now — that render
      // becomes the current content from the very first moment, so there's only
      // ever ONE version of "the document," never an upload/edit fork.
      let editedHtml: string | null = null;
      if (mime === MIME.docx) {
        const host = document.createElement("div");
        host.style.cssText = "position:fixed;left:-99999px;top:0;";
        document.body.appendChild(host);
        try { await renderDocxInto(base64, host); editedHtml = host.innerHTML; }
        finally { host.remove(); }
      }
      const doc = await docs.create.mutateAsync({
        title: stripExt(file.name),
        content_text: parsed.text,
        source: mime === MIME.pdf ? "upload_pdf" : "upload_docx",
        source_file_name: file.name,
        original_base64: base64,
        edited_html: editedHtml,
        mime_type: mime,
      });
      // Mark workflow as uploaded / drafting depending on type
      try {
        await docs.update.mutateAsync({
          id: doc.id,
          workflow_status: mime === MIME.pdf ? "uploaded" : "drafting",
        } as any);
      } catch { /* optional until migration lands */ }
      toast.success(`Imported “${stripExt(file.name)}.”`);
      setSelectedId(doc.id);
    } catch (err: any) {
      toast.error(err?.message ?? "Couldn't read that file.");
    } finally {
      setUploading(false);
    }
  };

  const newBlank = async () => {
    const doc = await docs.create.mutateAsync({ title: "Untitled document", content_html: "<p></p>", source: "blank" });
    try { await docs.update.mutateAsync({ id: doc.id, workflow_status: "drafting" } as any); } catch { /* optional */ }
    setSelectedId(doc.id);
  };

  if (selected) return <DocDetail key={selected.id} doc={selected} docs={docs} projectName={projectName} onBack={() => setSelectedId(null)} />;

  return (
    <div className="space-y-4">
      <input ref={fileRef} type="file" accept={ACCEPTED_UPLOAD} className="hidden" onChange={onUpload} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold flex items-center gap-2">
            <FileText className="h-5 w-5 text-[var(--apas-sapphire)]" /> Project Document Studio
          </h3>
          <p className="text-sm text-muted-foreground">
            Draft with AI, paste and format, save versions, then email a branded PDF to the client.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />} Upload Word / PDF
          </Button>
          <Button size="sm" onClick={newBlank} disabled={docs.create.isPending}>
            <Plus className="h-4 w-4 mr-1" /> New document
          </Button>
        </div>
      </div>

      {docs.isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground p-8 justify-center"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
      ) : list.length === 0 ? (
        <Card className="border-dashed overflow-hidden">
          <CardContent className="p-0">
            <div className="bg-gradient-to-br from-[#0D3B30] via-[#1A1714] to-[#1A1714] px-8 py-10 text-[#FAF8F4]">
              <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#C4A35A]">Project correspondence</div>
              <h4 className="mt-2 font-display text-2xl font-bold">A professional document from first draft to client delivery</h4>
              <p className="mt-2 max-w-xl text-sm text-[#D9D4CB]">
                Draft with AI or paste existing content, format it in the full editor, save every version, then send a branded PDF through the project email trail.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Button size="sm" className="bg-[var(--apas-sapphire)] hover:bg-[var(--apas-sapphire)]/90" onClick={() => fileRef.current?.click()}>
                  <Upload className="h-4 w-4 mr-1.5" /> Upload Word / PDF
                </Button>
                <Button size="sm" variant="outline" className="border-white/30 bg-white/5 text-white hover:bg-white/10" onClick={newBlank}>
                  <Plus className="h-4 w-4 mr-1.5" /> Start new document
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 lg:grid-cols-[200px_minmax(0,1fr)_240px]">
          {/* Left status sidebar */}
          <aside className="rounded-xl border bg-card p-2.5 space-y-1 h-fit lg:sticky lg:top-2">
            <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Trail</div>
            {DOC_WORKFLOW_FILTERS.map((key) => {
              const meta = key === "all"
                ? { label: "All documents", tone: "bg-muted text-foreground", short: "All" }
                : DOC_WORKFLOW_META[key];
              const Icon = key === "all" ? Inbox
                : key === "uploaded" ? Upload
                  : key === "signed" ? PenLine
                    : key === "sent" ? Send
                      : key === "executed" ? FileCheck2
                        : FileText;
              const active = filter === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFilter(key)}
                  className={cn(
                    "w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
                    active ? "bg-[var(--apas-sapphire)]/10 text-[var(--apas-sapphire)] font-semibold" : "hover:bg-muted/70 text-foreground",
                  )}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span className="flex-1 truncate">{meta.label}</span>
                  <span className="text-[11px] tabular-nums text-muted-foreground">{counts[key] || 0}</span>
                </button>
              );
            })}
          </aside>

          {/* Center document list */}
          <div className="space-y-2 min-w-0">
            {filtered.length === 0 ? (
              <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">No documents in this status yet.</CardContent></Card>
            ) : filtered.map((d) => {
              const workflow = resolveDocWorkflow(d);
              const meta = DOC_WORKFLOW_META[workflow];
              return (
                <Card
                  key={d.id}
                  className="hover:bg-accent/30 transition-colors cursor-pointer group border-l-4"
                  style={{ borderLeftColor: workflow === "sent" ? "#1D6FE8" : workflow === "signed" ? "#7C3AED" : workflow === "executed" ? "#059669" : workflow === "uploaded" ? "#0284C7" : "#C4A35A" }}
                  onClick={() => setSelectedId(d.id)}
                  onMouseEnter={() => setHoverId(d.id)}
                  onFocus={() => setHoverId(d.id)}
                >
                  <CardContent className="p-3.5 flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--apas-sapphire)]/10 text-[var(--apas-sapphire)]">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold truncate">{d.title || "Untitled document"}</span>
                        <Badge variant="outline" className={cn("text-[10px]", meta.tone)}>{meta.short}</Badge>
                        {d.has_original && <Badge variant="outline" className="text-[10px]">{extFor(d.mime_type).toUpperCase()}</Badge>}
                        <span className="text-[10px] text-muted-foreground">v{d.version}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {d.source === "upload_pdf" ? "From PDF" : d.source === "upload_docx" ? "From Word" : d.source === "ai_draft" ? "AI draft" : "Blank"}
                        {d.sent_to_email ? ` · sent to ${d.sent_to_email}` : ""}
                        {d.contractor_signed_name ? ` · signed by ${d.contractor_signed_name}` : ""}
                        {" · "}updated {fmtAgo(d.updated_at)}
                      </div>
                    </div>
                    <Button size="sm" variant="outline" className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0" onClick={(e) => { e.stopPropagation(); setSelectedId(d.id); }}>
                      Open
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Right hover-preview rail */}
          <aside className="hidden lg:block rounded-xl border bg-gradient-to-b from-[#FAF8F4] to-card p-3 h-fit sticky top-2 min-h-[280px]">
            <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground mb-2">Preview</div>
            {hoverDoc ? (
              <div className="space-y-3">
                <div className="rounded-lg border bg-white p-3 shadow-sm">
                  <div className="flex items-start gap-2">
                    <FileText className="h-4 w-4 mt-0.5 text-[var(--apas-sapphire)]" />
                    <div className="min-w-0">
                      <div className="font-semibold text-sm leading-snug">{hoverDoc.title}</div>
                      <div className="text-[11px] text-muted-foreground mt-1">
                        {hoverDoc.source_file_name || (hoverDoc.source === "blank" ? "Blank letter" : "Document")}
                      </div>
                    </div>
                  </div>
                  <Badge variant="outline" className={cn("mt-3 text-[10px]", DOC_WORKFLOW_META[resolveDocWorkflow(hoverDoc)].tone)}>
                    {DOC_WORKFLOW_META[resolveDocWorkflow(hoverDoc)].label}
                  </Badge>
                  <p className="mt-2 text-xs text-muted-foreground line-clamp-4">
                    {(hoverDoc.content_text || "").trim() || DOC_WORKFLOW_META[resolveDocWorkflow(hoverDoc)].description}
                  </p>
                  {hoverDoc.sent_to_client_at && (
                    <p className="mt-2 text-[11px] text-[var(--apas-sapphire)]">
                      Sent {fmtAgo(hoverDoc.sent_to_client_at)}{hoverDoc.sent_to_email ? ` → ${hoverDoc.sent_to_email}` : ""}
                    </p>
                  )}
                  {hoverDoc.client_signed_at && (
                    <p className="mt-1 text-[11px] text-emerald-700">
                      Client signed{hoverDoc.client_signed_name ? `: ${hoverDoc.client_signed_name}` : ""}
                    </p>
                  )}
                </div>
                <Button size="sm" className="w-full" onClick={() => setSelectedId(hoverDoc.id)}>Open in editor</Button>
              </div>
            ) : (
              <div className="flex h-[220px] flex-col items-center justify-center text-center px-3">
                <Eye className="h-6 w-6 text-muted-foreground/50 mb-2" />
                <p className="text-xs text-muted-foreground">Hover a document to preview what it is, its status, and who it was sent to.</p>
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}

// ── Detail: load current content, then route by type ────────────────────────
function DocDetail({ doc, docs, projectName, onBack }: { doc: AuthoredDocument; docs: Docs; projectName?: string | null; onBack: () => void }) {
  const [payload, setPayload] = useState<{ b64: string | null; mime: string; edited: string | null } | null>(null);
  const [loading, setLoading] = useState(doc.has_original);
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailAtt, setEmailAtt] = useState<DocAttachment | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [signOpen, setSignOpen] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const isFinal = doc.status === "final" || Boolean(doc.contractor_signed_at);
  const workflow = resolveDocWorkflow(doc);
  const workflowMeta = DOC_WORKFLOW_META[workflow];
  const isSigned = Boolean(doc.contractor_signed_at);

  useEffect(() => {
    if (!doc.has_original) { setPayload({ b64: null, mime: doc.mime_type || "", edited: doc.content_html }); return; }
    let alive = true;
    setLoading(true);
    docs.fetchOriginal(doc.id)
      .then((o) => { if (alive) setPayload({ b64: o.original_base64, mime: o.mime_type || MIME.docx, edited: o.edited_html }); })
      .catch(() => toast.error("Couldn't load the document."))
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [doc.id, doc.has_original]); // eslint-disable-line react-hooks/exhaustive-deps

  const del = async () => {
    if (!window.confirm("Delete this document? This cannot be undone.")) return;
    await docs.remove.mutateAsync(doc.id);
    toast.success("Document deleted.");
    onBack();
  };
  const finalize = async () => { await docs.setFinalized.mutateAsync({ id: doc.id, finalized: true }); toast.success("Finalized and locked."); };
  const reopen = async () => { await docs.setFinalized.mutateAsync({ id: doc.id, finalized: false }); };

  const isDocx = doc.has_original ? payload?.mime === MIME.docx : true;
  const isPdf = doc.has_original && payload?.mime === MIME.pdf;

  // Prepare a pixel-perfect PDF of the current content, then open the mailer.
  // Signed PDFs burn the e-sign seal into the attachment so clients see who/when.
  const openEmail = async () => {
    if (!isFinal) { toast.error("Finalize or sign the document before emailing it."); return; }
    setPreparing(true);
    try {
      const html = payload?.edited ?? doc.content_html;
      if (html) {
        const att = await htmlToPdfAttachment(clientReadyDocumentHtml(doc, html, projectName), doc.title);
        setEmailAtt(att);
        setEmailOpen(true);
        return;
      }
      if (isPdf && payload?.b64 && doc.contractor_signed_at && doc.contractor_signed_name) {
        const blob = await stampSignedPdfBlob(payload.b64, {
          name: doc.contractor_signed_name,
          signedAt: doc.contractor_signed_at,
          signatureDataUrl: doc.contractor_signature_data,
          placement: doc.signature_placement,
        });
        const contentBase64 = await new Promise<string>((resolve, reject) => {
          const fr = new FileReader();
          fr.onerror = () => reject(fr.error);
          fr.onload = () => resolve(String(fr.result).slice(String(fr.result).indexOf(",") + 1));
          fr.readAsDataURL(blob);
        });
        setEmailAtt({
          filename: `${doc.title.replace(/[^\w.-]+/g, "_").slice(0, 72)}-signed.pdf`,
          contentBase64,
          contentType: MIME.pdf,
          size: blob.size,
        });
        setEmailOpen(true);
        return;
      }
      toast.error("Nothing to send yet.");
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't prepare the attachment.");
    } finally { setPreparing(false); }
  };

  const downloadSigned = async () => {
    if (!doc.contractor_signed_at || !doc.contractor_signed_name) {
      toast.error("Sign the document first.");
      return;
    }
    setPreparing(true);
    try {
      const html = payload?.edited ?? doc.content_html;
      if (html) {
        await downloadHtmlAsPdf(clientReadyDocumentHtml(doc, html, projectName), `${doc.title}-signed`);
        return;
      }
      if (isPdf && payload?.b64) {
        const blob = await stampSignedPdfBlob(payload.b64, {
          name: doc.contractor_signed_name,
          signedAt: doc.contractor_signed_at,
          signatureDataUrl: doc.contractor_signature_data,
          placement: doc.signature_placement,
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${doc.title.replace(/[^\w.-]+/g, "_").slice(0, 72)}-signed.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
        return;
      }
      toast.error("Nothing to download yet.");
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't build the signed PDF.");
    } finally {
      setPreparing(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="rounded-xl border bg-gradient-to-r from-[#0D3B30]/95 to-[#1A1714] px-4 py-3 text-[#FAF8F4] flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onBack} className="text-[#FAF8F4] hover:bg-white/10 hover:text-white"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
        <span className="font-semibold truncate max-w-[40%]">{doc.title}</span>
        <Badge variant="outline" className={cn("text-[10px] border-white/20", workflowMeta.tone)}>{workflowMeta.label}</Badge>
        {doc.contractor_signed_name && <span className="text-[11px] text-[#D9D4CB]">Signed by {doc.contractor_signed_name}</span>}
        <div className="flex flex-wrap gap-2 ml-auto">
          {doc.has_original && (
            <Button variant="outline" size="sm" className="border-white/25 bg-white/5 text-white hover:bg-white/10" onClick={() => payload?.b64 && downloadBase64(payload.b64, payload.mime, filenameFor(`${doc.title} (source)`, payload.mime))} disabled={!payload?.b64} title="Download the untouched uploaded file">
              <FileDown className="h-4 w-4 mr-1" /> Source
            </Button>
          )}
          {isSigned && (
            <Button
              variant="outline"
              size="sm"
              className="border-emerald-300/40 bg-emerald-500/15 text-emerald-50 hover:bg-emerald-500/25"
              onClick={downloadSigned}
              disabled={preparing}
              title="Download the signed PDF with the Electronically Signed seal burned in"
            >
              {preparing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <FileCheck2 className="h-4 w-4 mr-1" />}
              Download signed
            </Button>
          )}
          <VersionHistory documentId={doc.id} onRestored={(html) => setPayload((p) => (p ? { ...p, edited: html } : p))} />
          {!isSigned && (
            <Button size="sm" className="bg-[#C4A35A] text-[#1A1714] hover:bg-[#C4A35A]/90" onClick={() => setSignOpen(true)}>
              <PenLine className="h-4 w-4 mr-1" /> E-sign
            </Button>
          )}
          {isSigned && (
            <Button size="sm" className="bg-[var(--apas-sapphire)] hover:bg-[var(--apas-sapphire)]/90" onClick={() => setSendOpen(true)}>
              <Send className="h-4 w-4 mr-1" /> {doc.sent_to_client_at ? "Re-send" : "Send to client"}
            </Button>
          )}
          <Button variant="outline" size="sm" className="border-white/25 bg-white/5 text-white hover:bg-white/10" onClick={openEmail} disabled={preparing || !isFinal} title={isFinal ? "Email without client signature request" : "Finalize or sign first"}>
            {preparing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Mail className="h-4 w-4 mr-1" />} Email
          </Button>
          {!isSigned && (isFinal
            ? <Button variant="outline" size="sm" className="border-white/25 bg-white/5 text-white hover:bg-white/10" onClick={reopen}><Unlock className="h-4 w-4 mr-1" /> Reopen</Button>
            : <Button size="sm" variant="secondary" onClick={finalize} disabled={docs.setFinalized.isPending}><Lock className="h-4 w-4 mr-1" /> Finalize</Button>)}
          <Button variant="ghost" size="sm" onClick={del} className="text-rose-300 hover:text-rose-200 hover:bg-white/10"><Trash2 className="h-4 w-4" /></Button>
        </div>
      </div>

      {isPdf && !isSigned && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 flex items-start gap-2">
          <PenLine className="h-4 w-4 mt-0.5 shrink-0" />
          <span>This is a PDF. Electronically sign it here, click where the signature should go, then send it to the client — same flow as change orders.</span>
        </div>
      )}

      {isSigned && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/60 px-3 py-2.5">
          <ESignStamp name={doc.contractor_signed_name} signedAt={doc.contractor_signed_at} />
          <p className="text-sm text-emerald-900">
            This document is locked with a verified electronic signature.
            {doc.sent_to_email ? ` Sent to ${doc.sent_to_email}.` : " Ready to send — choose the recipient from your project contacts."}
          </p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground p-10 justify-center"><Loader2 className="h-4 w-4 animate-spin" /> Loading document…</div>
      ) : doc.has_original && isDocx && (payload?.edited || payload?.b64) ? (
        <FormattedDocEditor doc={doc} docs={docs} projectName={projectName} base64={payload?.b64 ?? null} html={payload?.edited ?? null} locked={isFinal} onSaved={(html) => setPayload((p) => (p ? { ...p, edited: html } : { b64: null, mime: MIME.docx, edited: html }))} />
      ) : isPdf && payload?.b64 ? (
        <div className="space-y-3">
          <SignedPdfView
            b64={payload.b64}
            signatureDataUrl={doc.contractor_signature_data}
            signerName={doc.contractor_signed_name}
            signedAt={doc.contractor_signed_at}
            placement={doc.signature_placement}
          />
        </div>
      ) : (
        <BlankEditor
          doc={doc}
          docs={docs}
          projectName={projectName}
          locked={isFinal}
          initialHtml={payload?.edited ?? doc.content_html}
          onSaved={(nextHtml) => setPayload((current) => current
            ? { ...current, edited: nextHtml }
            : { b64: null, mime: "", edited: nextHtml })}
        />
      )}

      <div className="border-t pt-3">
        <DocumentTasksPanel documentId={doc.id} projectId={doc.project_id} projectName={projectName} />
      </div>

      <EmailDocumentDialog
        open={emailOpen}
        onOpenChange={setEmailOpen}
        projectId={doc.project_id}
        projectName={projectName}
        defaultSubject={doc.title}
        attachment={emailAtt}
        onSent={async (recipients) => { await docs.markSent.mutateAsync({ id: doc.id, email: recipients[0] }); }}
      />
      <SignAuthoredDocumentDialog
        open={signOpen}
        onOpenChange={setSignOpen}
        doc={doc}
        pdfBase64={isPdf ? payload?.b64 : null}
        onSign={async ({ name, signatureDataUrl, placement, signedAt }) => {
          const sourceHtml = payload?.edited ?? doc.content_html;
          const stampedHtml = sourceHtml
            ? stampSignedHtml(sourceHtml, { name, signatureDataUrl, signedAt, placement })
            : null;
          await docs.signDocument.mutateAsync({
            id: doc.id,
            name,
            signatureDataUrl,
            placement,
            signedAt,
            stampedHtml,
          });
          if (stampedHtml) setPayload((p) => (p ? { ...p, edited: stampedHtml } : p));
        }}
      />
      <SendAuthoredDocumentDialog
        open={sendOpen}
        onOpenChange={setSendOpen}
        doc={doc}
        projectName={projectName}
        editedHtml={payload?.edited ?? doc.content_html}
        onSent={async (email) => { await docs.markSent.mutateAsync({ id: doc.id, email }); }}
      />
    </div>
  );
}

// Edit ON the faithful render — letterhead preserved through edit → save. Saving
// simply becomes the current version (via saveEdit, which also snapshots History).
function FormattedDocEditor({ doc, docs, projectName, base64, html, locked, onSaved }: { doc: AuthoredDocument; docs: Docs; projectName?: string | null; base64: string | null; html: string | null; locked: boolean; onSaved: (html: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const rendered = useRef(false);
  const [editing, setEditing] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiInstruction, setAiInstruction] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSelection, setAiSelection] = useState<{ range: Range; text: string } | null>(null);

  useEffect(() => {
    if (!ref.current || rendered.current) return;
    rendered.current = true;
    (async () => {
      try {
        if (html) ref.current!.innerHTML = html;
        else if (base64) await renderDocxInto(base64, ref.current!);
      } catch { setErr("Couldn't render a preview — Source download still works."); }
    })();
  }, [base64, html]);

  const setSectionsEditable = (on: boolean) => {
    ref.current?.querySelectorAll<HTMLElement>(".docx").forEach((s) => {
      s.contentEditable = on ? "true" : "false";
      if (on) s.setAttribute("spellcheck", "true");
    });
  };

  const startEdit = () => { setEditing(true); setSectionsEditable(true); setTimeout(() => ref.current?.querySelector<HTMLElement>(".docx")?.focus(), 0); };

  // Capture the live selection BEFORE opening the panel — mousedown preventDefault
  // (like the bold/italic buttons above) keeps the contentEditable's selection
  // intact instead of the browser blurring it when focus moves to the panel.
  const openAiPanel = () => {
    const root = ref.current;
    const sel = window.getSelection();
    let captured: { range: Range; text: string } | null = null;
    if (root && sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      if (root.contains(range.commonAncestorContainer) && !range.collapsed) {
        captured = { range: range.cloneRange(), text: sel.toString() };
      }
    }
    setAiSelection(captured);
    setAiOpen(true);
  };

  const runAiAssist = async (mode: "continue" | "rewrite" | "custom") => {
    const root = ref.current;
    if (!root) return;
    if (mode === "rewrite" && !aiSelection) { toast.error("Select some text first to rewrite it."); return; }
    if (mode === "custom" && !aiInstruction.trim()) { toast.error("Say what to add."); return; }
    setAiLoading(true);
    try {
      let insertRange: Range;
      let contextEnd: Range;
      if (mode === "rewrite" && aiSelection) {
        insertRange = aiSelection.range;
        contextEnd = document.createRange();
        contextEnd.selectNodeContents(root);
        contextEnd.setEnd(aiSelection.range.startContainer, aiSelection.range.startOffset);
      } else {
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0 && root.contains(sel.getRangeAt(0).commonAncestorContainer)) {
          insertRange = sel.getRangeAt(0).cloneRange();
        } else {
          insertRange = document.createRange();
          insertRange.selectNodeContents(root);
          insertRange.collapse(false);
        }
        contextEnd = document.createRange();
        contextEnd.selectNodeContents(root);
        contextEnd.setEnd(insertRange.startContainer, insertRange.startOffset);
      }
      const context = contextEnd.toString().slice(-4000);

      const { data, error } = await supabase.functions.invoke("document-ai-assist", {
        body: { projectName, mode, context, selection: mode === "rewrite" ? aiSelection?.text : undefined, instruction: aiInstruction.trim() || undefined, projectId: doc.project_id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const text = String(data?.text ?? "").trim();
      if (!text) { toast.error("AI returned nothing."); return; }

      if (mode === "rewrite") {
        insertRange.deleteContents();
        insertRange.insertNode(document.createTextNode(text));
      } else {
        const frag = document.createDocumentFragment();
        text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean).forEach((p) => {
          const el = document.createElement("p");
          el.textContent = p;
          frag.appendChild(el);
        });
        insertRange.collapse(false);
        insertRange.insertNode(frag);
      }
      setDirty(true);
      setAiOpen(false);
      setAiInstruction("");
      toast.success("Added — click Save to keep it.");
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't generate that.");
    } finally {
      setAiLoading(false);
    }
  };

  const save = async () => {
    if (!ref.current) return;
    setSaving(true);
    try {
      const nextHtml = ref.current.innerHTML;
      await docs.saveEdit.mutateAsync({ id: doc.id, html: nextHtml, text: ref.current.innerText });
      onSaved(nextHtml);
      setDirty(false);
      toast.success("Saved — this is now the current version.");
    } catch (e: any) { toast.error(e?.message ?? "Couldn't save."); }
    finally { setSaving(false); }
  };
  const done = async () => { if (dirty) await save(); setSectionsEditable(false); setEditing(false); };

  const fmt = (cmd: string, value?: string) => document.execCommand(cmd, false, value);
  const currentHtml = () => ref.current?.innerHTML ?? html ?? "";

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {!editing ? (
          <Button size="sm" onClick={startEdit} disabled={locked} title={locked ? "Reopen to edit" : "Edit this letter on its real formatting"}>
            <Pencil className="h-4 w-4 mr-1" /> Edit letter
          </Button>
        ) : (
          <>
            <div className="inline-flex items-center rounded-md border p-0.5">
              <button onMouseDown={(e) => e.preventDefault()} onClick={() => fmt("bold")} className="h-7 w-7 grid place-items-center rounded hover:bg-muted" title="Bold"><Bold className="h-3.5 w-3.5" /></button>
              <button onMouseDown={(e) => e.preventDefault()} onClick={() => fmt("italic")} className="h-7 w-7 grid place-items-center rounded hover:bg-muted" title="Italic"><Italic className="h-3.5 w-3.5" /></button>
              <button onMouseDown={(e) => e.preventDefault()} onClick={() => fmt("underline")} className="h-7 w-7 grid place-items-center rounded hover:bg-muted" title="Underline"><Underline className="h-3.5 w-3.5" /></button>
              <button onMouseDown={(e) => e.preventDefault()} onClick={() => fmt("formatBlock", "H2")} className="h-7 w-7 grid place-items-center rounded hover:bg-muted" title="Heading"><Heading2 className="h-3.5 w-3.5" /></button>
              <button onMouseDown={(e) => e.preventDefault()} onClick={() => fmt("insertUnorderedList")} className="h-7 w-7 grid place-items-center rounded hover:bg-muted" title="Bullet list"><List className="h-3.5 w-3.5" /></button>
              <button onMouseDown={(e) => e.preventDefault()} onClick={() => fmt("insertOrderedList")} className="h-7 w-7 grid place-items-center rounded hover:bg-muted" title="Numbered list"><ListOrdered className="h-3.5 w-3.5" /></button>
              <button onMouseDown={(e) => e.preventDefault()} onClick={() => fmt("justifyLeft")} className="h-7 w-7 grid place-items-center rounded hover:bg-muted" title="Align left"><AlignLeft className="h-3.5 w-3.5" /></button>
              <button onMouseDown={(e) => e.preventDefault()} onClick={() => fmt("justifyCenter")} className="h-7 w-7 grid place-items-center rounded hover:bg-muted" title="Align center"><AlignCenter className="h-3.5 w-3.5" /></button>
              <button onMouseDown={(e) => e.preventDefault()} onClick={() => fmt("justifyRight")} className="h-7 w-7 grid place-items-center rounded hover:bg-muted" title="Align right"><AlignRight className="h-3.5 w-3.5" /></button>
              <button onMouseDown={(e) => e.preventDefault()} onClick={() => fmt("removeFormat")} className="h-7 w-7 grid place-items-center rounded hover:bg-muted" title="Clear formatting"><Eraser className="h-3.5 w-3.5" /></button>
              <button onMouseDown={(e) => e.preventDefault()} onClick={() => fmt("undo")} className="h-7 w-7 grid place-items-center rounded hover:bg-muted" title="Undo"><Undo2 className="h-3.5 w-3.5" /></button>
              <button onMouseDown={(e) => e.preventDefault()} onClick={() => fmt("redo")} className="h-7 w-7 grid place-items-center rounded hover:bg-muted" title="Redo"><Redo2 className="h-3.5 w-3.5" /></button>
            </div>
            <Button variant="outline" size="sm" onMouseDown={(e) => e.preventDefault()} onClick={openAiPanel} title="Ask AI to continue writing, rewrite a selection, or draft a paragraph">
              <Sparkles className="h-3.5 w-3.5 mr-1 text-[var(--apas-sapphire)]" /> Ask AI
            </Button>
            <Button size="sm" onClick={save} disabled={saving || !dirty}>
              {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />} Save
            </Button>
            <Button variant="outline" size="sm" onClick={done}><Eye className="h-4 w-4 mr-1" /> Done</Button>
            <span className="text-xs text-muted-foreground">{dirty ? "Unsaved changes" : "Type to edit · spell-check on · formatting kept"}</span>
          </>
        )}
        <div className="flex gap-2 ml-auto">
          <Button variant="outline" size="sm" onClick={() => downloadHtmlAsPdf(currentHtml(), doc.title)} title="Download exactly what's shown, as PDF">
            <FileDown className="h-4 w-4 mr-1" /> Download PDF
          </Button>
        </div>
      </div>

      {aiOpen && (
        <Card className="border-[var(--apas-sapphire)]/30">
          <CardContent className="p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5 text-[var(--apas-sapphire)]" /> Ask AI</span>
              <button onClick={() => setAiOpen(false)} className="text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /></button>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onMouseDown={(e) => e.preventDefault()} onClick={() => runAiAssist("continue")} disabled={aiLoading}>
                {aiLoading ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : null} Continue writing
              </Button>
              <Button variant="outline" size="sm" onMouseDown={(e) => e.preventDefault()} onClick={() => runAiAssist("rewrite")} disabled={aiLoading || !aiSelection} title={aiSelection ? "Rewrite the selected text" : "Select some text first"}>
                Rewrite selection
              </Button>
            </div>
            {!aiSelection && <p className="text-[11px] text-muted-foreground">Select text in the letter to enable “Rewrite selection.”</p>}
            <div className="flex gap-2">
              <Textarea value={aiInstruction} onChange={(e) => setAiInstruction(e.target.value)} placeholder="Or tell it what to add, e.g. “add a closing paragraph about next steps”" rows={2} className="text-sm" />
              <Button size="sm" onMouseDown={(e) => e.preventDefault()} onClick={() => runAiAssist("custom")} disabled={aiLoading || !aiInstruction.trim()} className="shrink-0 self-end">
                {aiLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Generate"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {err && <div className="text-sm text-amber-700 flex items-center gap-1.5"><AlertTriangle className="h-4 w-4" /> {err}</div>}

      <div className={`rounded border ${editing ? "ring-2 ring-[var(--apas-sapphire)]/40" : ""} bg-neutral-100 max-h-[72vh] overflow-auto p-4`}>
        <div ref={ref} onInput={() => setDirty(true)} className="mx-auto bg-white shadow-sm [&_.docx]:outline-none" />
      </div>
      {editing && <p className="text-xs text-muted-foreground">Editing the real letter — the letterhead, fonts and layout stay. Save makes this the current version; History lets you go back to an earlier one.</p>}
    </div>
  );
}

// Browsable version history: restore any past snapshot (non-destructive — it
// appends a new version) or delete old ones you don't want kept.
function VersionHistory({ documentId, onRestored }: { documentId: string; onRestored: (html: string) => void }) {
  const { data: versions = [], isLoading, restore, deleteVersion } = useDocumentVersions(documentId);
  const [open, setOpen] = useState(false);

  const doRestore = async (v: DocumentVersion) => {
    await restore.mutateAsync(v);
    onRestored(v.html);
    toast.success(`Restored from v${v.version}.`);
    setOpen(false);
  };
  const doDelete = async (v: DocumentVersion) => {
    if (!window.confirm(`Delete version ${v.version} (${v.label})? This only removes it from history.`)) return;
    await deleteVersion.mutateAsync(v.id);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" title="Browse, restore, or delete past versions">
          <History className="h-4 w-4 mr-1" /> History
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="px-3 py-2 border-b text-sm font-medium">Version history</div>
        {isLoading ? (
          <div className="p-4 text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…</div>
        ) : versions.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground">No history yet.</div>
        ) : (
          <ScrollArea className="max-h-72">
            <div className="divide-y">
              {versions.map((v) => (
                <div key={v.id} className="flex items-center gap-2 px-3 py-2 text-sm">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">v{v.version} · {v.label}</div>
                    <div className="text-xs text-muted-foreground">{fmtAgo(v.created_at)}</div>
                  </div>
                  <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => doRestore(v)} title="Restore this version"><RotateCcw className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-rose-600" onClick={() => doDelete(v)} title="Delete this version"><X className="h-3.5 w-3.5" /></Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </PopoverContent>
    </Popover>
  );
}

function PdfView({ b64 }: { b64: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => { const u = pdfObjectUrl(b64); setUrl(u); return () => URL.revokeObjectURL(u); }, [b64]);
  return <iframe title="PDF preview" src={url ?? ""} className="w-full h-[72vh] rounded border bg-white" />;
}

function SignedPdfView({
  b64,
  signatureDataUrl,
  signerName,
  signedAt,
  placement,
}: {
  b64: string;
  signatureDataUrl?: string | null;
  signerName?: string | null;
  signedAt?: string | null;
  placement?: AuthoredDocument["signature_placement"];
}) {
  return (
    <div className="space-y-2">
      {(signerName || signedAt) && (
        <div className="flex flex-wrap items-center gap-3">
          <ESignStamp name={signerName} signedAt={signedAt} />
          {signatureDataUrl && (
            <div className="rounded-md border border-emerald-600/40 bg-white px-2.5 py-1.5 shadow-sm">
              <img src={signatureDataUrl} alt="Signature" className="h-10 object-contain" />
              {placement && (
                <div className="text-[10px] text-emerald-800">
                  Placed on page {placement.page} · {Math.round(placement.xPct)}%, {Math.round(placement.yPct)}%
                </div>
              )}
            </div>
          )}
        </div>
      )}
      <div className="relative rounded-xl border bg-[#525659] p-2">
        <div className="pointer-events-none absolute right-4 top-4 z-10 scale-90 origin-top-right">
          {(signerName || signedAt) && <ESignStamp name={signerName} signedAt={signedAt} compact />}
        </div>
        <PdfView b64={b64} />
      </div>
    </div>
  );
}

function sanitizeAiDocumentHtml(value: string): string {
  const withoutFence = value.trim().replace(/^```(?:html)?\s*/i, "").replace(/\s*```$/i, "");
  if (!/<[a-z][\s\S]*>/i.test(withoutFence)) {
    return withoutFence.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)
      .map((p) => `<p>${p.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>")}</p>`).join("");
  }
  const parsed = new DOMParser().parseFromString(`<div>${withoutFence}</div>`, "text/html");
  const root = parsed.body.firstElementChild as HTMLElement | null;
  if (!root) return "<p></p>";
  root.querySelectorAll("script,style,iframe,object,embed,link,meta,form,input,button").forEach((node) => node.remove());
  root.querySelectorAll("*").forEach((node) => {
    for (const attr of Array.from(node.attributes)) node.removeAttribute(attr.name);
  });
  return root.innerHTML || "<p></p>";
}

// Native document editor: full TipTap formatting, explicit versioned saves,
// AI drafting/polishing, branded PDF output, and clean copy/paste handling.
function BlankEditor({
  doc,
  docs,
  projectName,
  locked,
  initialHtml,
  onSaved,
}: {
  doc: AuthoredDocument;
  docs: Docs;
  projectName?: string | null;
  locked: boolean;
  initialHtml?: string | null;
  onSaved: (html: string) => void;
}) {
  const [title, setTitle] = useState(doc.title);
  const [html, setHtml] = useState(initialHtml || "<p></p>");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiInstruction, setAiInstruction] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    setHtml(initialHtml || "<p></p>");
    setDirty(false);
  }, [initialHtml]);

  const markChanged = () => setDirty(true);
  const save = async (label = "Edited") => {
    if (locked) return;
    setSaving(true);
    try {
      const cleanTitle = title.trim() || "Untitled document";
      await docs.update.mutateAsync({ id: doc.id, title: cleanTitle } as any);
      await docs.saveEdit.mutateAsync({ id: doc.id, html, text: htmlToText(html), label });
      setTitle(cleanTitle);
      onSaved(html);
      setDirty(false);
      toast.success("Document saved and added to version history.");
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't save the document.");
    } finally {
      setSaving(false);
    }
  };

  const invokeAi = async (mode: "continue" | "draft" | "polish" | "structure", context: string, instruction?: string) => {
    const { data, error } = await supabase.functions.invoke("document-ai-assist", {
      body: { projectName, mode, context, instruction, projectId: doc.project_id },
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return String(data?.text ?? "").trim();
  };

  // Opt-in inline continuation from the editor toolbar.
  const aiContinue = async (context: string): Promise<string> => invokeAi("continue", context);

  const transformDocument = async (mode: "draft" | "polish" | "structure") => {
    const currentText = htmlToText(html).trim();
    if (mode === "draft" && !aiInstruction.trim()) {
      toast.error("Tell AI what you want the document to say.");
      return;
    }
    if (mode !== "draft" && !currentText) {
      toast.error("Add or paste some content first.");
      return;
    }
    setAiLoading(true);
    try {
      const result = await invokeAi(mode, currentText.slice(0, 14000), aiInstruction.trim() || undefined);
      if (!result) throw new Error("AI returned an empty document.");
      setHtml(sanitizeAiDocumentHtml(result));
      setDirty(true);
      setAiOpen(false);
      setAiInstruction("");
      toast.success(mode === "draft" ? "Draft created. Review it, then save." : "Document improved. Review it, then save.");
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't improve the document.");
    } finally {
      setAiLoading(false);
    }
  };

  const downloadPdf = () => downloadHtmlAsPdf(
    clientReadyDocumentHtml({ ...doc, title: title.trim() || doc.title }, html, projectName),
    title || "document",
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          value={title}
          onChange={(e) => { setTitle(e.target.value); markChanged(); }}
          disabled={locked}
          placeholder="Document title"
          className="text-base font-semibold"
        />
        <div className="flex shrink-0 flex-wrap gap-2">
          {!locked && (
            <Button variant="outline" size="sm" onClick={() => setAiOpen((open) => !open)}>
              <WandSparkles className="h-4 w-4 mr-1" /> Write with AI
            </Button>
          )}
          {!locked && (
            <Button size="sm" onClick={() => void save()} disabled={saving || !dirty}>
              {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />} Save
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => void downloadPdf()}>
            <FileDown className="h-4 w-4 mr-1" /> PDF
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>Paste from Word or email, then use headings, lists, tables, images, colors, alignment, find and replace.</span>
        {dirty
          ? <span className="font-medium text-amber-700">Unsaved changes</span>
          : <span className="flex items-center gap-1 text-emerald-700"><Check className="h-3.5 w-3.5" /> Saved</span>}
      </div>

      {aiOpen && !locked && (
        <Card className="overflow-hidden border-[var(--apas-sapphire)]/30">
          <CardContent className="p-0">
            <div className="bg-gradient-to-r from-[#082b23] to-[#164c3f] px-4 py-3 text-white">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="flex items-center gap-2 font-semibold"><WandSparkles className="h-4 w-4 text-amber-300" /> AI document assistant</p>
                  <p className="mt-0.5 text-xs text-emerald-50/75">AI preserves your facts. You review and save every change.</p>
                </div>
                <button type="button" onClick={() => setAiOpen(false)} className="rounded-md p-1 hover:bg-white/10" aria-label="Close AI assistant"><X className="h-4 w-4" /></button>
              </div>
            </div>
            <div className="space-y-3 p-4">
              <Textarea
                value={aiInstruction}
                onChange={(e) => setAiInstruction(e.target.value)}
                rows={3}
                placeholder="Describe the document you need, or add instructions for tone, audience, and purpose…"
              />
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => void transformDocument("draft")} disabled={aiLoading || !aiInstruction.trim()}>
                  {aiLoading ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 mr-1" />} Draft document
                </Button>
                <Button variant="outline" size="sm" onClick={() => void transformDocument("polish")} disabled={aiLoading}>
                  <WandSparkles className="h-3.5 w-3.5 mr-1" /> Polish professionally
                </Button>
                <Button variant="outline" size="sm" onClick={() => void transformDocument("structure")} disabled={aiLoading}>
                  <LayoutTemplate className="h-3.5 w-3.5 mr-1" /> Improve structure
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <ProRichTextEditor
        content={html}
        onChange={(next) => { setHtml(next); markChanged(); }}
        editable={!locked}
        minHeight="520px"
        placeholder="Write or paste your document here…"
        onAiComplete={locked ? undefined : aiContinue}
      />
    </div>
  );
}
