/**
 * B5 · ProjectDocumentsPage — Procore Lite document library.
 *
 * Two-pane layout:
 *   - Left: searchable list of pl_documents with multi-select + actions.
 *   - Right: DocumentPreviewer showing the current version of the focused doc,
 *            plus a version-history drawer.
 *
 * Lives at `/projects/:projectId/documents`. The repo's root `/documents` route
 * (DocumentsPage) is a different, property-management module — they co-exist.
 */
import { useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import {
  useProjectDocuments, useDocumentVersions,
} from "@/hooks/useProjectDocuments";
import type { ProjectDocument } from "@/hooks/useProjectDocuments";
import { DocumentPreviewer } from "@/components/documents/DocumentPreviewer";
import { NewVersionDialog } from "@/components/documents/NewVersionDialog";
import { TransmittalDialog } from "@/components/documents/TransmittalDialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  FileIcon, UploadCloud, History, Send, Plus, CheckSquare, Square,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function ProjectDocumentsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data: documents = [], isLoading, createWithFile } = useProjectDocuments(projectId ?? null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeVersionId, setActiveVersionId] = useState<string | null>(null);
  const [newVersionOpen, setNewVersionOpen] = useState(false);
  const [transmittalOpen, setTransmittalOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [multiSelected, setMultiSelected] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selected = documents.find((d) => d.id === selectedId) ?? null;
  const { data: versions = [] } = useDocumentVersions(selected?.id ?? null);
  const activeVersion = activeVersionId
    ? versions.find((v) => v.id === activeVersionId) ?? null
    : versions.find((v) => v.version === selected?.current_version) ?? null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return documents;
    return documents.filter((d) => d.name.toLowerCase().includes(q));
  }, [documents, query]);

  function toggleMulti(id: string) {
    setMultiSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }

  async function handleBulkUpload(files: FileList | null) {
    if (!files || !projectId) return;
    const count = files.length;
    try {
      for (const f of Array.from(files)) {
        await createWithFile.mutateAsync({ file: f });
      }
      toast.success(`Uploaded ${count} document${count === 1 ? "" : "s"}`);
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  const selectedDocs = documents.filter((d) => multiSelected.has(d.id));

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="flex flex-wrap justify-between items-start gap-3 mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-1">Documents</h1>
          <p className="text-muted-foreground">
            Project document library · {documents.length} file{documents.length === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {multiSelected.size > 0 && (
            <Button variant="secondary" onClick={() => setTransmittalOpen(true)}>
              <Send className="h-4 w-4 mr-2" />
              Transmit {multiSelected.size}
            </Button>
          )}
          <Button onClick={() => fileInputRef.current?.click()} disabled={!projectId}>
            <UploadCloud className="h-4 w-4 mr-2" />
            Upload
          </Button>
          <input
            ref={fileInputRef} type="file" multiple className="hidden"
            onChange={(e) => { handleBulkUpload(e.target.files); e.currentTarget.value = ""; }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <aside className="lg:col-span-5">
          <Input
            placeholder="Search documents…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="mb-3"
          />
          <Card>
            <CardContent className="p-0 max-h-[70vh] overflow-y-auto">
              {isLoading ? (
                <div className="p-6 text-sm text-muted-foreground">Loading…</div>
              ) : filtered.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  {documents.length === 0
                    ? "No documents yet. Upload files to get started."
                    : "No matches."}
                </div>
              ) : (
                <ul className="divide-y">
                  {filtered.map((d) => {
                    const isSel = d.id === selectedId;
                    const isMulti = multiSelected.has(d.id);
                    return (
                      <li key={d.id}>
                        <div className={cn(
                          "flex items-center gap-2 px-3 py-2 text-sm",
                          isSel && "bg-primary/5",
                        )}>
                          <button
                            type="button"
                            onClick={() => toggleMulti(d.id)}
                            className="shrink-0"
                            aria-label={isMulti ? "Deselect" : "Select"}
                          >
                            {isMulti
                              ? <CheckSquare className="h-4 w-4 text-primary" />
                              : <Square className="h-4 w-4 text-muted-foreground" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedId(d.id);
                              setActiveVersionId(null);
                            }}
                            className="flex items-center gap-2 flex-1 min-w-0 text-left"
                          >
                            <FileIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                            <div className="min-w-0">
                              <div className="truncate">{d.name}</div>
                              <div className="text-xs text-muted-foreground">
                                v{d.current_version} · {format(new Date(d.updated_at), "MMM d")}
                                {d.size_bytes && <> · {(d.size_bytes / 1024).toFixed(0)} KB</>}
                              </div>
                            </div>
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </aside>

        <section className="lg:col-span-7">
          <Card>
            <CardContent className="p-4 space-y-4">
              <DocumentPreviewer doc={selected} version={activeVersion} />

              {selected && (
                <>
                  <div className="flex gap-2 border-t pt-3">
                    <Button variant="outline" size="sm" onClick={() => setNewVersionOpen(true)}>
                      <Plus className="h-4 w-4 mr-1" />
                      Upload new version
                    </Button>
                  </div>

                  {versions.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2 text-sm font-medium">
                        <History className="h-4 w-4 text-muted-foreground" />
                        Version history · {versions.length}
                      </div>
                      <div className="rounded-md border divide-y">
                        {versions.map((v) => {
                          const isCurrent = v.version === selected.current_version;
                          const isActive = activeVersionId
                            ? v.id === activeVersionId
                            : isCurrent;
                          return (
                            <button
                              key={v.id}
                              type="button"
                              onClick={() => setActiveVersionId(v.id)}
                              className={cn(
                                "w-full flex items-center justify-between px-3 py-2 text-sm text-left",
                                isActive && "bg-primary/5",
                              )}
                            >
                              <div className="flex items-center gap-3">
                                <Badge variant={isCurrent ? "default" : "outline"}>
                                  v{v.version}
                                </Badge>
                                <div className="min-w-0">
                                  {v.note && (
                                    <div className="truncate">{v.note}</div>
                                  )}
                                  <div className="text-xs text-muted-foreground">
                                    {format(new Date(v.uploaded_at), "PP p")}
                                  </div>
                                </div>
                              </div>
                              {isCurrent && (
                                <span className="text-xs text-muted-foreground">current</span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </section>
      </div>

      <NewVersionDialog
        open={newVersionOpen}
        onOpenChange={setNewVersionOpen}
        doc={selected}
      />

      {projectId && (
        <TransmittalDialog
          open={transmittalOpen}
          onOpenChange={(o) => {
            setTransmittalOpen(o);
            if (!o) setMultiSelected(new Set());
          }}
          projectId={projectId}
          selectedDocs={selectedDocs}
        />
      )}
    </div>
  );
}
