/**
 * B4 · PhotoLightbox — full-size photo viewer with prev/next navigation,
 * EXIF/GPS metadata, and a rename-caption control.
 *
 * The component resolves signed URLs on demand from the `project-photos`
 * bucket — only the storage_path is stored in the DB row.
 */
import { useEffect, useState } from "react";
import type { Photo } from "@/hooks/usePhotos";
import { signedUrlFor } from "@/lib/pdf-viewer";
import {
  Dialog, DialogContent, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Calendar, MapPin, Download } from "lucide-react";
import { format } from "date-fns";

export interface PhotoLightboxProps {
  photos: Photo[];
  indexOpen: number | null;
  onClose: () => void;
}

export function PhotoLightbox({ photos, indexOpen, onClose }: PhotoLightboxProps) {
  const [index, setIndex] = useState(indexOpen ?? 0);
  const [fullUrl, setFullUrl] = useState<string | null>(null);

  useEffect(() => {
    if (indexOpen !== null) setIndex(indexOpen);
  }, [indexOpen]);

  const photo = photos[index] ?? null;

  useEffect(() => {
    if (!photo) return;
    (async () => {
      try {
        const url = await signedUrlFor("project-photos", photo.storage_path, 600);
        setFullUrl(url);
      } catch {
        setFullUrl(null);
      }
    })();
  }, [photo?.id, photo?.storage_path]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (indexOpen === null) return;
      if (e.key === "ArrowLeft") setIndex((i) => Math.max(0, i - 1));
      if (e.key === "ArrowRight") setIndex((i) => Math.min(photos.length - 1, i + 1));
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [indexOpen, photos.length, onClose]);

  if (!photo) return null;

  return (
    <Dialog open={indexOpen !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-5xl p-0 overflow-hidden">
        <DialogTitle className="sr-only">
          Photo {index + 1} of {photos.length}
        </DialogTitle>
        <div className="relative bg-black flex items-center justify-center min-h-[60vh]">
          {fullUrl ? (
            <img
              src={fullUrl}
              alt={photo.caption ?? ""}
              className="max-h-[80vh] max-w-full object-contain"
            />
          ) : (
            <div className="text-white text-sm">Loading photo…</div>
          )}

          {index > 0 && (
            <Button
              variant="secondary" size="icon"
              className="absolute left-2 top-1/2 -translate-y-1/2 opacity-80 hover:opacity-100"
              onClick={() => setIndex(index - 1)}
              aria-label="Previous"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
          )}
          {index < photos.length - 1 && (
            <Button
              variant="secondary" size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2 opacity-80 hover:opacity-100"
              onClick={() => setIndex(index + 1)}
              aria-label="Next"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          )}
        </div>

        <div className="p-4 bg-background">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">{photo.caption ?? "Untitled photo"}</div>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                {photo.taken_at && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(photo.taken_at), "PPp")}
                  </span>
                )}
                {(photo.lat != null && photo.lng != null) && (
                  <a
                    href={`https://www.google.com/maps?q=${photo.lat},${photo.lng}`}
                    target="_blank" rel="noreferrer"
                    className="flex items-center gap-1 hover:underline"
                  >
                    <MapPin className="h-3 w-3" />
                    {photo.lat.toFixed(5)}, {photo.lng.toFixed(5)}
                  </a>
                )}
                {photo.is_private && <Badge variant="outline">Private</Badge>}
              </div>
            </div>
            <div className="flex gap-2">
              {fullUrl && (
                <Button variant="outline" size="sm" asChild>
                  <a href={fullUrl} target="_blank" rel="noreferrer" download>
                    <Download className="h-3.5 w-3.5 mr-1" /> Open
                  </a>
                </Button>
              )}
              <div className="text-xs text-muted-foreground self-center tabular-nums">
                {index + 1} / {photos.length}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
