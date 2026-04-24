/**
 * B4 · PhotosPage — geo/date-stamped photo library with drag-drop upload,
 * multi-select album creation, and full-screen lightbox.
 */
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { usePhotos, usePhotoAlbums } from "@/hooks/usePhotos";
import type { Photo } from "@/hooks/usePhotos";
import { PhotoUploader } from "@/components/photos/PhotoUploader";
import { PhotoLightbox } from "@/components/photos/PhotoLightbox";
import { AlbumDialog } from "@/components/photos/AlbumDialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { FolderPlus, UploadCloud, CheckSquare, Square, X } from "lucide-react";
import { format } from "date-fns";
import { signedUrlFor } from "@/lib/pdf-viewer";
import { cn } from "@/lib/utils";

function Thumb({ photo }: { photo: Photo }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    (async () => {
      try {
        const u = await signedUrlFor("project-photos", photo.storage_path, 600);
        setUrl(u);
      } catch { /* ignore */ }
    })();
  }, [photo.storage_path]);
  return (
    <div className="w-full h-full bg-muted">
      {url && <img src={url} alt={photo.caption ?? ""} className="w-full h-full object-cover" />}
    </div>
  );
}

export default function PhotosPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data: photos = [], isLoading } = usePhotos(projectId ?? null);
  const { data: albums = [] } = usePhotoAlbums(projectId ?? null);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [albumOpen, setAlbumOpen] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const byDay = useMemo(() => {
    const m = new Map<string, Photo[]>();
    for (const p of photos) {
      const d = p.taken_at ?? p.created_at;
      const key = format(new Date(d), "yyyy-MM-dd");
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(p);
    }
    return [...m.entries()].sort(([a], [b]) => b.localeCompare(a));
  }, [photos]);

  function toggleSelected(id: string) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function handleCardClick(photo: Photo, globalIndex: number) {
    if (selectMode) toggleSelected(photo.id);
    else setLightboxIndex(globalIndex);
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="flex flex-wrap justify-between items-start gap-3 mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-1">Photos</h1>
          <p className="text-muted-foreground">
            Geo + date-stamped photo library · {photos.length} photo{photos.length === 1 ? "" : "s"}
            {albums.length > 0 && <> · {albums.length} album{albums.length === 1 ? "" : "s"}</>}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant={selectMode ? "default" : "outline"}
            onClick={() => {
              setSelectMode((s) => !s);
              if (selectMode) setSelected(new Set());
            }}
          >
            {selectMode ? <CheckSquare className="h-4 w-4 mr-2" /> : <Square className="h-4 w-4 mr-2" />}
            {selectMode ? `Selecting · ${selected.size}` : "Select"}
          </Button>
          {selectMode && (
            <Button
              variant="secondary"
              disabled={selected.size === 0}
              onClick={() => setAlbumOpen(true)}
            >
              <FolderPlus className="h-4 w-4 mr-2" />
              New album
            </Button>
          )}
          <Button onClick={() => setUploadOpen(true)} disabled={!projectId}>
            <UploadCloud className="h-4 w-4 mr-2" />
            Upload
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground">Loading…</div>
      ) : photos.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            No photos yet. Click <strong>Upload</strong> to add some.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {byDay.map(([day, items]) => {
            // Compute global index into the photos array for lightbox nav.
            const startIndex = photos.findIndex((p) => (p.taken_at ?? p.created_at).startsWith(day));
            return (
              <div key={day}>
                <h2 className="text-sm uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-2">
                  {format(new Date(day), "MMMM d, yyyy")}
                  <Badge variant="outline" className="text-[10px]">
                    {items.length}
                  </Badge>
                </h2>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                  {items.map((p, i) => {
                    const globalIndex = startIndex + i;
                    const isSelected = selected.has(p.id);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleCardClick(p, globalIndex)}
                        className={cn(
                          "relative aspect-square rounded overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          isSelected && "ring-2 ring-primary",
                        )}
                      >
                        <Thumb photo={p} />
                        {selectMode && (
                          <div className="absolute top-1 left-1">
                            {isSelected ? (
                              <CheckSquare className="h-5 w-5 text-primary bg-background rounded" />
                            ) : (
                              <Square className="h-5 w-5 text-background/80 bg-black/30 rounded" />
                            )}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectMode && selected.size > 0 && (
        <div className="fixed bottom-4 right-4 bg-background border rounded-full shadow-lg px-4 py-2 flex items-center gap-3">
          <span className="text-sm">{selected.size} selected</span>
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {projectId && (
        <>
          <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Upload photos</DialogTitle>
              </DialogHeader>
              <PhotoUploader projectId={projectId} />
            </DialogContent>
          </Dialog>

          <AlbumDialog
            open={albumOpen}
            onOpenChange={setAlbumOpen}
            projectId={projectId}
            selectedPhotoIds={[...selected]}
            onCreated={() => {
              setSelected(new Set());
              setSelectMode(false);
            }}
          />
        </>
      )}

      <PhotoLightbox
        photos={photos}
        indexOpen={lightboxIndex}
        onClose={() => setLightboxIndex(null)}
      />
    </div>
  );
}
