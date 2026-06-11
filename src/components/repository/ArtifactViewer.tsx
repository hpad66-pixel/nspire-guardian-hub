import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, ExternalLink, FileText, Image as ImageIcon } from "lucide-react";
import { useArtifactUrl, type ProjectArtifact } from "@/hooks/useProjectArtifacts";

const TYPE_LABELS: Record<string, string> = {
  prime_contract: "Prime Contract", invoice: "Invoice", change_order: "Change Order",
  drawing: "Drawing", permit: "Permit", inspection_record: "Inspection Record",
  photo: "Photo", specification: "Specification", correspondence: "Correspondence", other: "Other",
};

const SOURCE_COLORS: Record<string, string> = {
  procore:  "bg-orange-100 text-orange-800",
  builtos:  "bg-blue-100 text-blue-800",
  manual:   "bg-gray-100 text-gray-700",
};

function fmt(n: number | null) {
  if (n == null) return null;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

interface Props {
  artifact: ProjectArtifact | null;
  onClose: () => void;
}

export function ArtifactViewer({ artifact, onClose }: Props) {
  const { data: signedUrl } = useArtifactUrl(artifact?.file_path ?? null);
  const isPdf = artifact?.mime_type === "application/pdf" || artifact?.file_name.endsWith(".pdf");
  const isImage = artifact?.mime_type?.startsWith("image/");

  if (!artifact) return null;

  return (
    <Dialog open={Boolean(artifact)} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-5xl max-h-[92vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <DialogTitle>{artifact.title}</DialogTitle>
              <div className="flex flex-wrap gap-2 text-sm">
                <span className="text-muted-foreground">{TYPE_LABELS[artifact.artifact_type]}</span>
                <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium capitalize ${SOURCE_COLORS[artifact.source_system]}`}>
                  {artifact.source_system === "procore" ? "From Procore" : artifact.source_system}
                </span>
                {artifact.reference_no && (
                  <Badge variant="outline" className="font-mono text-xs">{artifact.reference_no}</Badge>
                )}
                {artifact.period_date && (
                  <span className="text-muted-foreground text-xs">{artifact.period_date}</span>
                )}
                {artifact.amount != null && (
                  <Badge className="font-mono text-xs">{fmt(artifact.amount)}</Badge>
                )}
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              {signedUrl && (
                <>
                  <Button size="sm" variant="outline" asChild>
                    <a href={signedUrl} download={artifact.file_name}>
                      <Download className="h-4 w-4 mr-1" /> Download
                    </a>
                  </Button>
                  <Button size="sm" variant="outline" asChild>
                    <a href={signedUrl} target="_blank" rel="noreferrer">
                      <ExternalLink className="h-4 w-4 mr-1" /> Open
                    </a>
                  </Button>
                </>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* Metadata strip */}
        {(artifact.description || artifact.tags.length > 0) && (
          <div className="border rounded-lg p-3 text-sm space-y-1 bg-muted/30">
            {artifact.description && <p className="text-muted-foreground">{artifact.description}</p>}
            {artifact.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {artifact.tags.map((t) => (
                  <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>
                ))}
              </div>
            )}
          </div>
        )}

        {/* File preview */}
        <div className="flex-1 overflow-auto rounded-lg border bg-muted/20 min-h-[400px] flex items-center justify-center">
          {!signedUrl ? (
            <p className="text-muted-foreground text-sm">Loading…</p>
          ) : isPdf ? (
            <iframe src={signedUrl} className="w-full h-full min-h-[500px] rounded" title={artifact.title} />
          ) : isImage ? (
            <img src={signedUrl} alt={artifact.title} className="max-w-full max-h-[60vh] object-contain rounded" />
          ) : (
            <div className="text-center space-y-3">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground">{artifact.file_name}</p>
              <Button asChild variant="outline">
                <a href={signedUrl} download={artifact.file_name}>
                  <Download className="h-4 w-4 mr-2" /> Download to view
                </a>
              </Button>
            </div>
          )}
        </div>

        {/* Extracted text panel */}
        {artifact.extracted_text && (
          <details className="border rounded-lg text-sm">
            <summary className="p-3 font-medium cursor-pointer hover:bg-muted/30">
              Extracted text <span className="text-muted-foreground font-normal">(AI-queryable)</span>
            </summary>
            <pre className="p-3 text-xs text-muted-foreground whitespace-pre-wrap overflow-auto max-h-48 border-t">
              {artifact.extracted_text}
            </pre>
          </details>
        )}
      </DialogContent>
    </Dialog>
  );
}
