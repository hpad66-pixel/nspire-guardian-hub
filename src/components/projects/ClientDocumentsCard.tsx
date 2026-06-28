import { useRef, useState } from 'react';
import { FileText, Upload, Trash2, Loader2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useClientDocuments, useUploadClientDocument, useDeleteClientDocument } from '@/hooks/useClientDocuments';

const fmtSize = (b?: number | null) => {
  if (!b) return '';
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${Math.round(b / 1024)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
};

// GC-side manager for the documents shared to the client portal.
export function ClientDocumentsCard({ projectId }: { projectId: string }) {
  const { data: docs = [], isLoading } = useClientDocuments(projectId);
  const upload = useUploadClientDocument();
  const del = useDeleteClientDocument();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    for (const f of Array.from(files)) {
      // eslint-disable-next-line no-await-in-loop
      await upload.mutateAsync({ file: f, projectId }).catch(() => {});
    }
    setBusy(false);
  };

  return (
    <div className="rounded-xl border bg-card">
      <div className="flex items-center justify-between gap-2 border-b p-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/15"><FileText className="h-4 w-4 text-accent" /></div>
          <div>
            <h3 className="text-sm font-semibold">Documents</h3>
            <p className="text-[11px] text-muted-foreground">Files shared on the client portal — plans, permits, contract, warranties</p>
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()} disabled={busy} className="gap-1.5 text-xs">
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />} Share file
        </Button>
        <input ref={fileRef} type="file" multiple className="hidden" onChange={e => { onFiles(e.target.files); e.target.value = ''; }} />
      </div>
      <div className="p-3">
        {isLoading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
        ) : docs.length === 0 ? (
          <p className="py-6 text-center text-[13px] text-muted-foreground">No documents shared yet. Add plans, permits, or the signed contract for the client.</p>
        ) : (
          <div className="space-y-1.5">
            {docs.map(d => (
              <div key={d.id} className="flex items-center gap-2.5 rounded-lg border border-border px-3 py-2">
                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                <a href={d.url} target="_blank" rel="noopener noreferrer" className="flex-1 truncate text-[13px] font-medium text-foreground hover:underline" title={d.name}>{d.name}</a>
                {d.size_bytes ? <span className="shrink-0 text-[11px] text-muted-foreground">{fmtSize(d.size_bytes)}</span> : null}
                <a href={d.url} target="_blank" rel="noopener noreferrer" className="shrink-0 text-muted-foreground hover:text-foreground"><ExternalLink className="h-3.5 w-3.5" /></a>
                <button onClick={() => { if (confirm(`Remove "${d.name}" from the client portal?`)) del.mutate({ id: d.id, projectId }); }} className="shrink-0 text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
