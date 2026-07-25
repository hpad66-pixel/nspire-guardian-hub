/**
 * DocumentWorkspace — upload a .docx/.pdf (parsed to editable HTML in the browser,
 * no API) or start blank, edit in the rich editor, finalize (lock), and download
 * as Word or PDF to send yourself. Every finalized doc's text feeds the project
 * knowledge base. Rendered inside Correspondence and (linked) the Documents tab.
 */
import { useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import {
  FileText, Upload, Plus, ArrowLeft, Loader2, Lock, Unlock, FileDown, Printer, Trash2, Check,
} from "lucide-react";
import { toast } from "sonner";
import { useAuthoredDocuments, type AuthoredDocument } from "@/hooks/useAuthoredDocuments";
import { parseUpload, htmlToText, ACCEPTED_UPLOAD } from "@/lib/docs/parseUpload";
import { downloadAsWord, printAsPdf } from "@/lib/docs/exportDoc";

const fmtAgo = (d: string): string => {
  const s = Math.max(0, (Date.now() - new Date(d).getTime()) / 1000);
  if (s < 90) return "just now";
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
};
const stripExt = (n: string) => n.replace(/\.[^.]+$/, "");

export function DocumentWorkspace({ projectId }: { projectId: string; projectName?: string | null }) {
  const docs = useAuthoredDocuments(projectId);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const list = (docs.data ?? []) as AuthoredDocument[];
  const selected = list.find((d) => d.id === selectedId) ?? null;

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const parsed = await parseUpload(file);
      const doc = await docs.create.mutateAsync({
        title: stripExt(file.name),
        content_html: parsed.html,
        content_text: parsed.text,
        source: parsed.source === "pdf" ? "upload_pdf" : "upload_docx",
        source_file_name: file.name,
      });
      if (parsed.warnings.length) toast.warning(parsed.warnings[0]);
      toast.success(`Imported “${stripExt(file.name)}” — edit and finalize when ready.`);
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

  if (selected) {
    return <DocEditor key={selected.id} doc={selected} onBack={() => setSelectedId(null)} docs={docs} />;
  }

  return (
    <div className="space-y-4">
      <input ref={fileRef} type="file" accept={ACCEPTED_UPLOAD} className="hidden" onChange={onUpload} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold flex items-center gap-2"><FileText className="h-5 w-5 text-[var(--apas-sapphire)]" /> Documents</h3>
          <p className="text-sm text-muted-foreground">Upload a Word or PDF, edit it here, finalize, and download to send — no AI, fully in your control.</p>
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
          <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">Upload a Word or PDF to edit it here, or start from a blank page. Finalize to lock it and download a copy to send.</p>
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

function DocEditor({ doc, onBack, docs }: { doc: AuthoredDocument; onBack: () => void; docs: ReturnType<typeof useAuthoredDocuments> }) {
  const [title, setTitle] = useState(doc.title);
  const [html, setHtml] = useState(doc.content_html);
  const [dirty, setDirty] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(doc.updated_at);
  const saveTimer = useRef<number | null>(null);
  const isFinal = doc.status === "final";

  const persist = async () => {
    if (!dirty) return;
    await docs.update.mutateAsync({ id: doc.id, title: title.trim() || "Untitled document", content_html: html, content_text: htmlToText(html) });
    setDirty(false);
    setSavedAt(new Date().toISOString());
  };

  const scheduleSave = () => {
    setDirty(true);
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => { persist(); }, 1400);
  };

  const finalize = async () => {
    await persist();
    await docs.setFinalized.mutateAsync({ id: doc.id, finalized: true });
    toast.success("Finalized and locked. Download a copy to send.");
  };
  const reopen = async () => { await docs.setFinalized.mutateAsync({ id: doc.id, finalized: false }); };
  const del = async () => {
    if (!window.confirm("Delete this document? This cannot be undone.")) return;
    await docs.remove.mutateAsync(doc.id);
    toast.success("Document deleted.");
    onBack();
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="sm" onClick={async () => { await persist(); onBack(); }}><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
        <div className="text-xs text-muted-foreground ml-1">
          {dirty ? "Unsaved…" : savedAt ? <span className="flex items-center gap-1"><Check className="h-3 w-3 text-emerald-600" /> Saved {fmtAgo(savedAt)}</span> : null}
        </div>
        <div className="flex gap-2 ml-auto">
          <Button variant="outline" size="sm" onClick={() => downloadAsWord(html, title || "document")}><FileDown className="h-4 w-4 mr-1" /> Word</Button>
          <Button variant="outline" size="sm" onClick={() => printAsPdf(html, title || "document")}><Printer className="h-4 w-4 mr-1" /> PDF</Button>
          {isFinal
            ? <Button variant="outline" size="sm" onClick={reopen}><Unlock className="h-4 w-4 mr-1" /> Reopen</Button>
            : <Button size="sm" onClick={finalize} disabled={docs.setFinalized.isPending}><Lock className="h-4 w-4 mr-1" /> Finalize</Button>}
          <Button variant="ghost" size="sm" onClick={del} className="text-rose-600"><Trash2 className="h-4 w-4" /></Button>
        </div>
      </div>

      <Input
        value={title}
        onChange={(e) => { setTitle(e.target.value); scheduleSave(); }}
        onBlur={persist}
        disabled={isFinal}
        placeholder="Document title"
        className="text-lg font-semibold"
      />

      {isFinal && (
        <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-3 py-2">
          <Lock className="h-3.5 w-3.5" /> Finalized{doc.finalized_at ? ` ${fmtAgo(doc.finalized_at)}` : ""}. Reopen to edit.
        </div>
      )}

      <div className={isFinal ? "opacity-90 pointer-events-none" : ""}>
        <RichTextEditor content={html} onChange={(h) => { setHtml(h); scheduleSave(); }} editable={!isFinal} placeholder="Write or paste your document…" />
      </div>
    </div>
  );
}
