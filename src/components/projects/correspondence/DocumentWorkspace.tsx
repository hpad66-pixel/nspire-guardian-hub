/**
 * DocumentWorkspace — upload a .docx/.pdf, preserved byte-for-byte, and edit the
 * .docx ON its real formatting: docx-preview renders the letterhead/fonts/spacing,
 * and you edit that render in place (contenteditable + native spell-check). Saving
 * keeps the formatting (the edited, still-styled HTML is stored in edited_html);
 * the untouched original is always downloadable. All client-side — no API.
 */
import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProRichTextEditor } from "@/components/ui/rich-text-editor";
import {
  FileText, Upload, Plus, ArrowLeft, Loader2, Lock, Unlock, FileDown, Printer, Trash2, Check,
  Replace, Pencil, Eye, AlertTriangle, Bold, Italic, Underline, Save, Mail,
} from "lucide-react";
import { toast } from "sonner";
import { useAuthoredDocuments, type AuthoredDocument } from "@/hooks/useAuthoredDocuments";
import { parseUpload, htmlToText, ACCEPTED_UPLOAD } from "@/lib/docs/parseUpload";
import { downloadAsWord, printAsPdf, wordDocBase64 } from "@/lib/docs/exportDoc";
import { fileToBase64, downloadBase64, renderDocxInto, pdfObjectUrl, MIME, extFor, filenameFor } from "@/lib/docs/render";
import { EmailDocumentDialog, type DocAttachment } from "./EmailDocumentDialog";
import { Input } from "@/components/ui/input";

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
      content_text: parsed.text,
      content_html: parsed.html,
      source: mime === MIME.pdf ? "upload_pdf" : "upload_docx",
      source_file_name: file.name,
      original_base64: base64,
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
          <p className="text-sm text-muted-foreground">Upload a Word letter — edit it on its real letterhead, save with formatting intact, and download to send. No AI.</p>
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
          <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">Upload a Word or PDF — kept exactly as-is. Edit Word letters on their real formatting, finalize, and download a copy to send.</p>
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

// ── Detail: load the original + any saved edit, then route by type ─────────────
function DocDetail({ doc, docs, onBack }: { doc: AuthoredDocument; docs: Docs; onBack: () => void }) {
  const [payload, setPayload] = useState<{ b64: string | null; mime: string; edited: string | null } | null>(null);
  const [loading, setLoading] = useState(doc.has_original);
  const replaceRef = useRef<HTMLInputElement>(null);
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailAtt, setEmailAtt] = useState<DocAttachment | null>(null);
  const [preparing, setPreparing] = useState(false);
  const isFinal = doc.status === "final";

  useEffect(() => {
    if (!doc.has_original) { setPayload({ b64: null, mime: doc.mime_type || "", edited: null }); return; }
    let alive = true;
    setLoading(true);
    docs.fetchOriginal(doc.id)
      .then((o) => { if (alive) setPayload({ b64: o.original_base64, mime: o.mime_type || MIME.docx, edited: o.edited_html }); })
      .catch(() => toast.error("Couldn't load the document."))
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [doc.id, doc.has_original]); // eslint-disable-line react-hooks/exhaustive-deps

  const onReplace = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const [base64, parsed] = await Promise.all([fileToBase64(file), parseUpload(file)]);
      await docs.replaceOriginal.mutateAsync({ id: doc.id, original_base64: base64, mime_type: mimeOf(file), source_file_name: file.name, version: doc.version });
      await docs.update.mutateAsync({ id: doc.id, content_text: parsed.text, edited_html: null } as any);
      setPayload({ b64: base64, mime: mimeOf(file), edited: null });
      toast.success(`Updated to v${doc.version + 1} — exact copy preserved.`);
    } catch (err: any) {
      toast.error(err?.message ?? "Couldn't replace the file.");
    }
  };

  const del = async () => {
    if (!window.confirm("Delete this document? This cannot be undone.")) return;
    await docs.remove.mutateAsync(doc.id);
    toast.success("Document deleted.");
    onBack();
  };
  const finalize = async () => { await docs.setFinalized.mutateAsync({ id: doc.id, finalized: true }); toast.success("Finalized and locked."); };
  const reopen = async () => { await docs.setFinalized.mutateAsync({ id: doc.id, finalized: false }); };

  // Prepare the attachment (freshest saved edit, else the exact original) then open the mailer.
  const openEmail = async () => {
    setPreparing(true);
    try {
      let att: DocAttachment | null = null;
      if (doc.has_original) {
        const o = await docs.fetchOriginal(doc.id);
        if (o.edited_html) att = wordDocBase64(o.edited_html, doc.title);
        else if (o.original_base64) att = { filename: filenameFor(doc.title, o.mime_type), contentBase64: o.original_base64, contentType: o.mime_type || MIME.docx, size: Math.round((o.original_base64.length * 3) / 4) };
      } else {
        att = wordDocBase64(doc.content_html || "<p></p>", doc.title);
      }
      setEmailAtt(att);
      setEmailOpen(true);
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't prepare the attachment.");
    } finally { setPreparing(false); }
  };

  const isDocx = doc.has_original && (payload?.mime === MIME.docx || (!payload && doc.mime_type === MIME.docx));

  return (
    <div className="space-y-3">
      <input ref={replaceRef} type="file" accept={ACCEPTED_UPLOAD} className="hidden" onChange={onReplace} />
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
        <span className="font-semibold truncate max-w-[35%]">{doc.title}</span>
        {isFinal
          ? <Badge variant="outline" className="text-[10px] bg-emerald-100 text-emerald-700 border-emerald-200">Final</Badge>
          : <Badge variant="outline" className="text-[10px]">Draft v{doc.version}</Badge>}
        <div className="flex flex-wrap gap-2 ml-auto">
          {doc.has_original && (
            <Button variant="outline" size="sm" onClick={() => payload?.b64 && downloadBase64(payload.b64, payload.mime, filenameFor(doc.title, payload.mime))} disabled={!payload?.b64} title="Download the exact original, unchanged">
              <FileDown className="h-4 w-4 mr-1" /> Original
            </Button>
          )}
          {doc.has_original && !isFinal && (
            <Button variant="outline" size="sm" onClick={() => replaceRef.current?.click()} title="Replace with a version you edited in Word/Copilot">
              <Replace className="h-4 w-4 mr-1" /> Replace
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={openEmail} disabled={preparing} title="Email this letter with the file attached">
            {preparing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Mail className="h-4 w-4 mr-1" />} Email
          </Button>
          {isFinal
            ? <Button variant="outline" size="sm" onClick={reopen}><Unlock className="h-4 w-4 mr-1" /> Reopen</Button>
            : <Button size="sm" onClick={finalize} disabled={docs.setFinalized.isPending}><Lock className="h-4 w-4 mr-1" /> Finalize</Button>}
          <Button variant="ghost" size="sm" onClick={del} className="text-rose-600"><Trash2 className="h-4 w-4" /></Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground p-10 justify-center"><Loader2 className="h-4 w-4 animate-spin" /> Loading document…</div>
      ) : isDocx && payload?.b64 ? (
        <FormattedDocEditor doc={doc} docs={docs} base64={payload.b64} editedHtml={payload.edited} locked={isFinal} />
      ) : doc.has_original && payload?.mime === MIME.pdf && payload?.b64 ? (
        <PdfView b64={payload.b64} />
      ) : (
        <BlankEditor doc={doc} docs={docs} locked={isFinal} />
      )}

      <EmailDocumentDialog open={emailOpen} onOpenChange={setEmailOpen} projectId={doc.project_id} defaultSubject={doc.title} attachment={emailAtt} />
    </div>
  );
}

// Edit ON the faithful render — letterhead preserved through edit → save.
function FormattedDocEditor({ doc, docs, base64, editedHtml, locked }: { doc: AuthoredDocument; docs: Docs; base64: string; editedHtml: string | null; locked: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const rendered = useRef(false);
  const [editing, setEditing] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Render once: the saved edit if present, else the faithful docx render.
  useEffect(() => {
    if (!ref.current || rendered.current) return;
    rendered.current = true;
    (async () => {
      try {
        if (editedHtml) ref.current!.innerHTML = editedHtml;
        else await renderDocxInto(base64, ref.current!);
      } catch { setErr("Couldn't render a preview — the exact download still works."); }
    })();
  }, [base64, editedHtml]);

  const setSectionsEditable = (on: boolean) => {
    ref.current?.querySelectorAll<HTMLElement>(".docx").forEach((s) => {
      s.contentEditable = on ? "true" : "false";
      if (on) s.setAttribute("spellcheck", "true");
    });
  };

  const startEdit = () => { setEditing(true); setSectionsEditable(true); setTimeout(() => ref.current?.querySelector<HTMLElement>(".docx")?.focus(), 0); };
  const save = async () => {
    if (!ref.current) return;
    setSaving(true);
    try {
      await docs.update.mutateAsync({ id: doc.id, edited_html: ref.current.innerHTML, content_text: ref.current.innerText } as any);
      setDirty(false);
      toast.success("Saved — formatting preserved.");
    } catch (e: any) { toast.error(e?.message ?? "Couldn't save."); }
    finally { setSaving(false); }
  };
  const done = async () => { if (dirty) await save(); setSectionsEditable(false); setEditing(false); };

  const fmt = (cmd: string) => document.execCommand(cmd);
  const currentHtml = () => ref.current?.innerHTML ?? editedHtml ?? "";

  return (
    <div className="space-y-2">
      {/* Edit toolbar */}
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
            </div>
            <Button size="sm" onClick={save} disabled={saving || !dirty}>
              {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />} Save
            </Button>
            <Button variant="outline" size="sm" onClick={done}><Eye className="h-4 w-4 mr-1" /> Done</Button>
            <span className="text-xs text-muted-foreground">{dirty ? "Unsaved changes" : "Type to edit · spell-check on · formatting kept"}</span>
          </>
        )}
        <div className="flex gap-2 ml-auto">
          <Button variant="outline" size="sm" onClick={() => downloadAsWord(currentHtml(), doc.title)} title="Download the edited letter as Word"><FileDown className="h-4 w-4 mr-1" /> Word</Button>
          <Button variant="outline" size="sm" onClick={() => printAsPdf(currentHtml(), doc.title)}><Printer className="h-4 w-4 mr-1" /> PDF</Button>
        </div>
      </div>

      {err && <div className="text-sm text-amber-700 flex items-center gap-1.5"><AlertTriangle className="h-4 w-4" /> {err}</div>}

      {/* The faithful document — editable in place when editing */}
      <div className={`rounded border ${editing ? "ring-2 ring-[var(--apas-sapphire)]/40" : ""} bg-neutral-100 max-h-[72vh] overflow-auto p-4`}>
        <div
          ref={ref}
          onInput={() => setDirty(true)}
          className="mx-auto bg-white shadow-sm [&_.docx]:outline-none"
        />
      </div>
      {editing && <p className="text-xs text-muted-foreground">Editing the real letter — the letterhead, fonts and layout stay. Save keeps them; your untouched original is always under “Original”.</p>}
    </div>
  );
}

function PdfView({ b64 }: { b64: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => { const u = pdfObjectUrl(b64); setUrl(u); return () => URL.revokeObjectURL(u); }, [b64]);
  return (
    <>
      <p className="text-xs text-muted-foreground">PDFs are preserved and previewed exactly. To edit, use “Replace” with a version edited in your tools.</p>
      <iframe title="PDF preview" src={url ?? ""} className="w-full h-[72vh] rounded border bg-white" />
    </>
  );
}

// Plain editor for blank documents (no uploaded original to preserve).
function BlankEditor({ doc, docs, locked }: { doc: AuthoredDocument; docs: Docs; locked: boolean }) {
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
      <div className="flex items-center gap-2">
        <Input value={title} onChange={(e) => { setTitle(e.target.value); schedule(); }} onBlur={persist} disabled={locked} placeholder="Document title" className="text-base font-semibold" />
        <Button variant="outline" size="sm" onClick={() => downloadAsWord(html, title || "document")}><FileDown className="h-4 w-4 mr-1" /> Word</Button>
        <Button variant="outline" size="sm" onClick={() => printAsPdf(html, title || "document")}><Printer className="h-4 w-4 mr-1" /> PDF</Button>
      </div>
      {dirty ? <div className="text-xs text-muted-foreground">Saving…</div> : <div className="text-xs text-muted-foreground flex items-center gap-1"><Check className="h-3 w-3 text-emerald-600" /> Saved</div>}
      <ProRichTextEditor content={html} onChange={(h) => { setHtml(h); schedule(); }} editable={!locked} minHeight="440px" placeholder="Write or paste your document…" />
    </div>
  );
}
