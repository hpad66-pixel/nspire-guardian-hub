/**
 * B4 · PhotoAttachPanel — compact panel for attaching/detaching photos to a
 * foreign record (RFI, Punch item, Daily log, Submittal).
 *
 * Shows:
 *   - Thumbnails of currently-linked photos with a "detach" button.
 *   - "Attach existing" picker over the project's photo library.
 *   - "Upload & attach" quick uploader that pipes through PhotoUploader.
 */
import { useEffect, useMemo, useState } from "react";
import { usePhotos, useLinkedPhotos } from "@/hooks/usePhotos";
import type { Photo } from "@/hooks/usePhotos";
import { PhotoUploader } from "./PhotoUploader";
import { PhotoLightbox } from "./PhotoLightbox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ImagePlus, X } from "lucide-react";
import { signedUrlFor } from "@/lib/pdf-viewer";
import { toast } from "sonner";

export interface PhotoAttachPanelProps {
  projectId: string;
  recordId: string;
  recordType: "rfi" | "punch" | "daily" | "submittal" | "photo_album" | string;
  /** Renders a compact row (no uploader) vs. a full panel. */
  compact?: boolean;
}

function Thumb({ photo, onClick }: { photo: Photo; onClick?: () => void }) {
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
    <button
      type="button" onClick={onClick}
      className="relative aspect-square bg-muted rounded overflow-hidden group"
    >
      {url && <img src={url} alt={photo.caption ?? ""} className="w-full h-full object-cover" />}
    </button>
  );
}

export function PhotoAttachPanel({
  projectId, recordId, recordType, compact,
}: PhotoAttachPanelProps) {
  const { data: linked = [], refetch } = useLinkedPhotos(recordId, recordType);
  const { data: allPhotos = [], attach, detach } = usePhotos(projectId);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [query, setQuery] = useState("");

  const linkedIds = useMemo(() => new Set(linked.map((p) => p.id)), [linked]);

  const candidates = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allPhotos
      .filter((p) => !linkedIds.has(p.id))
      .filter((p) => !q || (p.caption ?? "").toLowerCase().includes(q))
      .slice(0, 120);
  }, [allPhotos, linkedIds, query]);

  async function handleAttach(photoId: string) {
    try {
      await attach.mutateAsync({ photoId, recordId, recordType });
      await refetch();
      toast.success("Photo attached");
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function handleDetach(photoId: string) {
    try {
      await detach.mutateAsync({ photoId, recordId, recordType });
      await refetch();
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">
          Photos · {linked.length}
        </div>
        {!compact && (
          <Button size="sm" variant="outline" onClick={() => setPickerOpen(true)}>
            <ImagePlus className="h-4 w-4 mr-1.5" /> Attach / upload
          </Button>
        )}
      </div>

      {linked.length === 0 ? (
        <div className="text-xs text-muted-foreground border rounded-md p-6 text-center">
          No photos attached yet.
        </div>
      ) : (
        <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
          {linked.map((p, i) => (
            <div key={p.id} className="relative group">
              <Thumb photo={p} onClick={() => setLightboxIndex(i)} />
              <Button
                size="icon" variant="secondary"
                className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100"
                onClick={() => handleDetach(p.id)}
                aria-label="Detach"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {compact && (
        <Button size="sm" variant="outline" onClick={() => setPickerOpen(true)} className="w-full">
          <ImagePlus className="h-4 w-4 mr-1.5" /> Attach / upload
        </Button>
      )}

      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Attach photos</DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="existing">
            <TabsList>
              <TabsTrigger value="existing">Pick from library</TabsTrigger>
              <TabsTrigger value="upload">Upload new</TabsTrigger>
            </TabsList>

            <TabsContent value="existing" className="space-y-3 mt-3">
              <Input
                placeholder="Search by caption…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {candidates.length === 0 ? (
                <div className="text-sm text-muted-foreground p-8 text-center">
                  No candidate photos — upload a new one.
                </div>
              ) : (
                <div className="grid grid-cols-4 md:grid-cols-6 gap-2 max-h-[50vh] overflow-y-auto">
                  {candidates.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleAttach(p.id)}
                      className="relative aspect-square bg-muted rounded overflow-hidden hover:ring-2 hover:ring-primary"
                    >
                      <Thumb photo={p} />
                    </button>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="upload" className="mt-3">
              <PhotoUploader
                projectId={projectId}
                onUploaded={(photoId) => handleAttach(photoId)}
              />
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <PhotoLightbox
        photos={linked}
        indexOpen={lightboxIndex}
        onClose={() => setLightboxIndex(null)}
      />
    </div>
  );
}
