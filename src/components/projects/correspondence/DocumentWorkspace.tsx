/**
 * DocumentWorkspace — 100% fidelity first. An uploaded .docx/.pdf is preserved
 * byte-for-byte (base64 on the row) and previewed faithfully (docx-preview keeps
 * the real Word letterhead/fonts/gold-rule; PDFs render natively). You can:
 *   • download the EXACT original to send,
 *   • replace it with a new version you edited in Word/Copilot,
 *   • or make a best-effort "edit copy" in the browser (letterhead NOT preserved —
 *     clearly labeled; the original stays intact).
 * Everything is client-side — no API.
 */
import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import {
  FileText, Upload, Plus, ArrowLeft, Loader2, Lock, Unlock, FileDown, Printer, Trash2, Check, Replace, Pencil, Eye, AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { useAuthoredDocuments, type AuthoredDocument } from "@/hooks/useAuthoredDocuments";
import { parseUpload, htmlToText, ACCEPTED_UPLOAD } from "@/lib/docs/parseUpload";
import { downloadAsWord, printAsPdf } from "@/lib/docs/exportDoc";
import { fileToBase64, downloadBase64, renderDocxInto, pdfObjectUrl, MIME, extFor, filenameFor } from "@/lib/docs/render";

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

export function DocumentWorkspace({ projectId }: { projectId: string; projectName?: string | null }) {
  const docs = useAuthoredDocuments(projectId);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const list = (docs.data ?? []) as AuthoredDocument[];
  const selected = list.find((d) => d.id === selectedId) ?? null;

  const importFile = async (file: File) => {
    const mime = mimeOf(file);
    const [base64, parsed] = await Promise.all([fileToBase64(file), parseUpload(file)]);
    return docs.create.mutateAsync({
      title: stripExt(file.name),
      content_text: parsed.text,          // knowledge base only
      content_html: parsed.html,          // best-effort edit copy seed
      source: mime === MIME.pdf ? "upload_pdf" : "upload_docx",
      source_file_name: file.name,
      original_base64: base64,            // the exact file, preserved
      mime_type: mime,
    });
  };

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const doc = await importFile(file);
      toast.success(`Imported “${stripExt(file.name)}” — preserved exactly.`);
      setSelectedId(doc.id);
    } catch (err: any) {
      toast.error(err?.message ?? "Couldn't read that file.");
    } finally {
      setUploading(false);
    }
  };

  const newBlank = async () => {
    const doc = await docs.create.mutateAsync({ title: "Untitled document", content_html: "<p></p>", source: "blank" });
    setSelectedId(doc.id);
  };

  if (selected) return <DocDetail key={selected.id} doc={selected} docs={docs} onBack={() => setSelectedId(null)} />;

  return (
    <div className="space-y-4">
      <input ref={fileRef} type="file" accept={ACCEPTED_UPLOAD} className="hidden" onChange={onUpload} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold flex items-center gap-2"><FileText className="h-5 w-5 text-[var(--apas-sapphire)]" /> Documents</h3>
          <p className="text-sm text-muted-foreground">Upload a Word or PDF — preserved <span className="font-medium">exactly</span>, letterhead and all. Preview, finalize, and download to send. No AI.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />} Upload Word / PDF
          </Button>
          <Button size="sm" onClick={newBlank} disabled={docs.create.isPending}>
            <Plus className="h-4 w-4 mr-1" /> New blank
          </Button>
        </div>
      </div>

      {docs.isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground p-8 justify-center"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
      ) : list.length === 0 ? (
        <Card><CardContent className="p-8 text-center">
          <FileText className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
          <div className="font-medium">No documents yet</div>
          <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">Upload a Word or PDF — it's kept exactly as-is with full formatting. Finalize to lock it and download a copy to send.</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {list.map((d) => (
            <Card key={d.id} className="hover:bg-accent/30 transition-colors cursor-pointer" onClick={() => setSelectedId(d.id)}>
              <CardContent className="p-3.5 flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-[var(--apas-sapphire)]/10 text-[var(--apas-sapphire)]"><FileText className="h-4 w-4" /></div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium truncate">{d.title || "Untitled document"}</span>
                    {d.status === "final"
                      ? <Badge variant="outline" className="text-[10px] bg-emerald-100 text-emerald-700 border-emerald-200">Final</Badge>
                      : <Badge variant="outline" className="text-[10px]">Draft</Badge>}
                    {d.has_original && <Badge variant="outline" className="text-[10px]">{extFor(d.mime_type).toUpperCase()} · exact</Badge>}
                    {d.version > 1 && <span className="text-[10px] text-muted-foreground">v{d.version}</span>}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {d.source === "upload_pdf" ? "From PDF" : d.source === "upload_docx" ? "From Word" : d.source === "ai_draft" ? "AI draft" : "Blank"}
                    {d.source_file_name ? ` · ${d.source_file_name}` : ""} · updated {fmtAgo(d.updated_at)}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Detail: faithful preview + actions, with an optional best-effort edit copy ──
function DocDetail({ doc, docs, onBack }: { doc: AuthoredDocument; docs: Docs; onBack: () => void }) {
  const [mode, setMode] = useState<"preview" | "edit">(doc.has_original ? "preview" : "edit");
  const [original, setOriginal] = useState<{ b64: string; mime: string } | null>(null);
  const [loadingOrig, setLoadingOrig] = useState(false);
  const replaceRef = useRef<HTMLInputElement>(null);
  const isFinal = doc.status === "final";

  // Lazily fetch the preserved original for preview/download.
  useEffect(() => {
    if (!doc.has_original) return;
    let alive = true;
    setLoadingOrig(true);
    docs.fetchOriginal(doc.id)
      .then((o) => { if (alive && o.original_base64) setOriginal({ b64: o.original_base64, mime: o.mime_type || MIME.docx }); })
      .catch(() => toast.error("Couldn't load the original file."))
      .finally(() => { if (alive) setLoadingOrig(false); });
    return () => { alive = false; };
  }, [doc.id, doc.has_original]); // eslint-disable-line react-hooks/exhaustive-deps

  const downloadExact = () => {
    if (!original) return;
    downloadBase64(original.b64, original.mime, filenameFor(doc.title, original.mime));
  };

  const onReplace = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const [base64, parsed] = await Promise.all([fileToBase64(file), parseUpload(file)]);
      await docs.replaceOriginal.mutateAsync({ id: doc.id, original_base64: base64, mime_type: mimeOf(file), source_file_name: file.name, version: doc.version });
      await docs.update.mutateAsync({ id: doc.id, content_text: parsed.text, content_html: parsed.html } as any);
      setOriginal({ b64: base64, mime: mimeOf(file) });
      toast.success(`Updated to v${doc.version + 1} — exact copy preserved.`);
    } catch (err: any) {
      toast.error(err?.message ?? "Couldn't replace the file.");
    }
  };

  const finalize = async () => { await docs.setFinalized.mutateAsync({ id: doc.id, finalized: true }); toast.success("Finalized and locked."); };
  const reopen = async () => { await docs.setFinalized.mutateAsync({ id: doc.id, finalized: false }); };
  const del = async () => {
    if (!window.confirm("Delete this document? This cannot be undone.")) return;
    await docs.remove.mutateAsync(doc.id);
    toast.success("Document deleted.");
    onBack();
  };

  return (
    <div className="space-y-3">
      <input ref={replaceRef} type="file" accept={ACCEPTED_UPLOAD} className="hidden" onChange={onReplace} />
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
        <span className="font-semibold truncate max-w-[40%]">{doc.title}</span>
        {isFinal
          ? <Badge variant="outline" className="text-[10px] bg-emerald-100 text-emerald-700 border-emerald-200">Final</Badge>
          : <Badge variant="outline" className="text-[10px]">Draft v{doc.version}</Badge>}

        <div className="flex flex-wrap gap-2 ml-auto">
          {doc.has_original && (
            <>
              <div className="inline-flex rounded-md border p-0.5">
                <button onClick={() => setMode("preview")} className={`flex items-center gap-1 rounded px-2 py-1 text-xs ${mode === "preview" ? "bg-background shadow-sm font-medium" : "text-muted-foreground"}`}><Eye className="h-3.5 w-3.5" /> Preview</button>
                <button onClick={() => setMode("edit")} className={`flex items-center gap-1 rounded px-2 py-1 text-xs ${mode === "edit" ? "bg-background shadow-sm font-medium" : "text-muted-foreground"}`}><Pencil className="h-3.5 w-3.5" /> Edit copy</button>
              </div>
              <Button variant="outline" size="sm" onClick={downloadExact} disabled={!original} title="Download the exact original, unchanged">
                <FileDown className="h-4 w-4 mr-1" /> Download original
              </Button>
              {!isFinal && (
                <Button variant="outline" size="sm" onClick={() => replaceRef.current?.click()} title="Replace with a version you edited in Word/Copilot">
                  <Replace className="h-4 w-4 mr-1" /> Replace version
                </Button>
              )}
            </>
          )}
          {isFinal
            ? <Button variant="outline" size="sm" onClick={reopen}><Unlock className="h-4 w-4 mr-1" /> Reopen</Button>
            : <Button size="sm" onClick={finalize} disabled={docs.setFinalized.isPending}><Lock className="h-4 w-4 mr-1" /> Finalize</Button>}
          <Button variant="ghost" size="sm" onClick={del} className="text-rose-600"><Trash2 className="h-4 w-4" /></Button>
        </div>
      </div>

      {mode === "preview" && doc.has_original ? (
        loadingOrig || !original
          ? <div className="flex items-center gap-2 text-muted-foreground p-10 justify-center"><Loader2 className="h-4 w-4 animate-spin" /> Loading document…</div>
          : <FaithfulPreview b64={original.b64} mime={original.mime} />
      ) : (
        <EditCopy doc={doc} docs={docs} readOnly={isFinal} />
      )}
    </div>
  );
}

// Faithful render of the ORIGINAL — docx-preview for Word, native iframe for PDF.
function FaithfulPreview({ b64, mime }: { b64: string; mime: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  useEffect(() => {
    if (mime === MIME.pdf) {
      const url = pdfObjectUrl(b64);
      setPdfUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    let alive = true;
    (async () => {
      try { if (ref.current) await renderDocxInto(b64, ref.current); }
      catch (e: any) { if (alive) setErr("Couldn't render a preview — the exact download still works."); }
    })();
    return () => { alive = false; };
  }, [b64, mime]);

  if (mime === MIME.pdf) return <iframe title="PDF preview" src={pdfUrl ?? ""} className="w-full h-[72vh] rounded border bg-white" />;
  return (
    <div className="rounded border bg-neutral-100 max-h-[72vh] overflow-auto p-4">
      {err && <div className="text-sm text-amber-700 flex items-center gap-1.5 mb-2"><AlertTriangle className="h-4 w-4" /> {err}</div>}
      <div ref={ref} className="mx-auto bg-white shadow-sm" />
    </div>
  );
}

// Best-effort in-browser edit — a PLAIN copy (letterhead not preserved). The
// original stays intact; this saves content_html and downloads an unformatted doc.
function EditCopy({ doc, docs, readOnly }: { doc: AuthoredDocument; docs: Docs; readOnly: boolean }) {
  const [title, setTitle] = useState(doc.title);
  const [html, setHtml] = useState(doc.content_html || "<p></p>");
  const [dirty, setDirty] = useState(false);
  const timer = useRef<number | null>(null);

  const persist = async () => {
    if (!dirty) return;
    await docs.update.mutateAsync({ id: doc.id, title: title.trim() || "Untitled document", content_html: html, content_text: htmlToText(html) } as any);
    setDirty(false);
  };
  const schedule = () => { setDirty(true); if (timer.current) window.clearTimeout(timer.current); timer.current = window.setTimeout(persist, 1400); };

  return (
    <div className="space-y-2">
      {doc.has_original && (
        <div className="flex items-center gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded px-3 py-2">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> This is a plain editable copy — the letterhead and Word formatting are <span className="font-medium">not</span> preserved here. Your original stays intact under Preview / Download original.
        </div>
      )}
      <div className="flex items-center gap-2">
        <Input value={title} onChange={(e) => { setTitle(e.target.value); schedule(); }} onBlur={persist} disabled={readOnly} placeholder="Document title" className="text-base font-semibold" />
        <Button variant="outline" size="sm" onClick={() => downloadAsWord(html, title || "document")}><FileDown className="h-4 w-4 mr-1" /> Word</Button>
        <Button variant="outline" size="sm" onClick={() => printAsPdf(html, title || "document")}><Printer className="h-4 w-4 mr-1" /> PDF</Button>
      </div>
      {dirty ? <div className="text-xs text-muted-foreground">Saving…</div> : <div className="text-xs text-muted-foreground flex items-center gap-1"><Check className="h-3 w-3 text-emerald-600" /> Saved</div>}
      <div className={readOnly ? "opacity-90 pointer-events-none" : ""}>
        <RichTextEditor content={html} onChange={(h) => { setHtml(h); schedule(); }} editable={!readOnly} placeholder="Write or paste your document…" />
      </div>
    </div>
  );
}
