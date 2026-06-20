/**
 * AttachmentField — a reusable file attach / preview / replace / remove control.
 *
 * Drop it anywhere a record can carry a single document (change orders, pay apps,
 * invoices, payments…). It owns the storage mechanics: uploads to a public bucket
 * under `<tenant>/<projectId>/<folder>/<uuid>.<ext>`, then hands the public URL
 * back via `onChange`. The parent persists that URL on its own row.
 *
 * Controlled: pass the current `url` and an `onChange(url | null)` that writes it
 * to the backing column. Set `readOnly` to render view-only (preview + open).
 */
import { useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { resolveCurrentWorkspaceId } from "@/lib/tenant";
import { Button } from "@/components/ui/button";
import { Paperclip, Upload, ExternalLink, Trash2, FileText, Loader2 } from "lucide-react";

export interface AttachmentFieldProps {
  url: string | null | undefined;
  onChange: (url: string | null) => void | Promise<void>;
  projectId: string;
  /** Sub-folder under the project, e.g. "change-orders", "pay-apps". */
  folder: string;
  bucket?: string;
  accept?: string;
  /** Show the embedded PDF preview (default true for PDFs). */
  preview?: boolean;
  readOnly?: boolean;
  label?: string;
}

export function AttachmentField({
  url,
  onChange,
  projectId,
  folder,
  bucket = "daily-report-files",
  accept = "application/pdf,.pdf",
  preview = true,
  readOnly = false,
  label = "Attachment",
}: AttachmentFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const isPdf = (url ?? "").toLowerCase().includes(".pdf") || accept.includes("pdf");

  async function handleFile(file: File) {
    setBusy(true);
    try {
      const tenant = await resolveCurrentWorkspaceId();
      if (!tenant) throw new Error("No workspace for current user");
      const ext = (file.name.split(".").pop() || "pdf").toLowerCase();
      const path = `${tenant}/${projectId}/${folder}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from(bucket)
        .upload(path, file, { contentType: file.type || "application/pdf", upsert: false });
      if (error) throw error;
      const publicUrl = supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
      await onChange(publicUrl);
      toast.success("File attached");
    } catch (e) {
      toast.error(`Upload failed: ${(e as Error).message}`);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleRemove() {
    if (!window.confirm("Remove this attachment? The link will be cleared.")) return;
    setBusy(true);
    try {
      await onChange(null);
      toast.success("Attachment removed");
    } catch (e) {
      toast.error(`Failed: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }}
      />

      {url ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 text-sm text-foreground">
              <FileText className="h-4 w-4 text-[var(--apas-sapphire)]" /> {label} attached
            </span>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-[var(--apas-sapphire)] font-medium hover:underline"
            >
              Open / print <ExternalLink className="h-3.5 w-3.5" />
            </a>
            {!readOnly && (
              <>
                <Button variant="outline" size="sm" disabled={busy} onClick={() => inputRef.current?.click()}>
                  {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                  <span className="ml-1.5">Replace</span>
                </Button>
                <Button variant="ghost" size="sm" disabled={busy} className="text-destructive hover:text-destructive" onClick={handleRemove}>
                  <Trash2 className="h-3.5 w-3.5" /><span className="ml-1.5">Remove</span>
                </Button>
              </>
            )}
          </div>
          {preview && isPdf && (
            <object data={url} type="application/pdf" className="w-full rounded-md border" style={{ height: 560 }}>
              <a href={url} target="_blank" rel="noopener noreferrer" className="text-[var(--apas-sapphire)] underline">
                Download the attached document
              </a>
            </object>
          )}
        </div>
      ) : readOnly ? (
        <p className="text-sm text-muted-foreground">No {label.toLowerCase()} attached.</p>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="w-full flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/25 px-4 py-8 text-muted-foreground hover:border-[var(--apas-sapphire)]/50 hover:text-foreground transition-colors"
        >
          {busy ? <Loader2 className="h-6 w-6 animate-spin" /> : <Paperclip className="h-6 w-6" />}
          <span className="text-sm font-medium">{busy ? "Uploading…" : `Attach ${label.toLowerCase()} (PDF)`}</span>
          <span className="text-xs">Click to choose a file</span>
        </button>
      )}
    </div>
  );
}
