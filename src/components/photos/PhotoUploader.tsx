/**
 * B4 · PhotoUploader — drag-drop multi-file uploader for project photos.
 *
 * For each file we:
 *   - Parse EXIF (takenAt, GPS) via our lightweight parser.
 *   - Upload to the `project-photos` bucket.
 *   - Insert a `photos` row with caption + EXIF metadata.
 *
 * Progress is shown per-file. No batch cancel — caller can close the dialog.
 */
import { useRef, useState } from "react";
import { usePhotos } from "@/hooks/usePhotos";
import { readExif } from "@/lib/exif";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UploadCloud, X, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface QueueItem {
  file: File;
  caption: string;
  status: "pending" | "uploading" | "done" | "error";
  message?: string;
  previewUrl: string;
}

export interface PhotoUploaderProps {
  projectId: string;
  /** Called after every successful upload — caller can refresh or link. */
  onUploaded?: (photoId: string) => void;
  className?: string;
}

export function PhotoUploader({ projectId, onUploaded, className }: PhotoUploaderProps) {
  const { upload } = usePhotos(projectId);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function addFiles(files: FileList | File[] | null) {
    if (!files) return;
    const next: QueueItem[] = [];
    for (const f of Array.from(files)) {
      if (!f.type.startsWith("image/")) continue;
      next.push({
        file: f,
        caption: "",
        status: "pending",
        previewUrl: URL.createObjectURL(f),
      });
    }
    setQueue((q) => [...q, ...next]);
  }

  function updateItem(i: number, patch: Partial<QueueItem>) {
    setQueue((q) => q.map((item, idx) => (idx === i ? { ...item, ...patch } : item)));
  }

  function removeItem(i: number) {
    setQueue((q) => {
      const victim = q[i];
      if (victim) URL.revokeObjectURL(victim.previewUrl);
      return q.filter((_, idx) => idx !== i);
    });
  }

  async function uploadAll() {
    const pending = queue
      .map((q, i) => ({ q, i }))
      .filter(({ q }) => q.status === "pending");
    if (pending.length === 0) return;

    for (const { q, i } of pending) {
      updateItem(i, { status: "uploading" });
      try {
        const exif = await readExif(q.file);
        const result = await upload.mutateAsync({
          file: q.file,
          caption: q.caption || undefined,
          lat: exif.lat ?? undefined,
          lng: exif.lng ?? undefined,
          takenAt: exif.takenAt,
          exif: exif.raw,
        });
        updateItem(i, { status: "done" });
        onUploaded?.(result.id);
      } catch (e: any) {
        updateItem(i, { status: "error", message: e.message });
        toast.error(`${q.file.name}: ${e.message}`);
      }
    }
  }

  const pendingCount = queue.filter((q) => q.status === "pending").length;
  const doneCount = queue.filter((q) => q.status === "done").length;

  return (
    <div className={cn("space-y-3", className)}>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault(); setDragOver(false);
          addFiles(e.dataTransfer.files);
        }}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition",
          dragOver ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40",
        )}
      >
        <UploadCloud className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm">
          Drag photos here or <span className="text-primary underline">browse</span>.
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          JPEGs keep EXIF (date, GPS). Other images upload without metadata.
        </p>
        <input
          ref={fileInputRef} type="file" accept="image/*" multiple
          className="hidden"
          onChange={(e) => { addFiles(e.target.files); e.currentTarget.value = ""; }}
        />
      </div>

      {queue.length > 0 && (
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {queue.map((q, i) => (
            <div key={i} className="flex items-center gap-3 p-2 border rounded-md">
              <img src={q.previewUrl} alt="" className="h-12 w-12 object-cover rounded" />
              <div className="flex-1 min-w-0">
                <div className="text-xs text-muted-foreground truncate">{q.file.name}</div>
                <Input
                  value={q.caption}
                  onChange={(e) => updateItem(i, { caption: e.target.value })}
                  placeholder="Caption (optional)"
                  disabled={q.status !== "pending"}
                  className="h-7 text-xs mt-1"
                />
                {q.status === "error" && (
                  <div className="text-xs text-destructive mt-1">{q.message}</div>
                )}
              </div>
              <div className="w-6 flex justify-center">
                {q.status === "pending" && (
                  <Button size="icon" variant="ghost" className="h-6 w-6"
                          onClick={() => removeItem(i)}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                )}
                {q.status === "uploading" && <Loader2 className="h-4 w-4 animate-spin" />}
                {q.status === "done" && <Check className="h-4 w-4 text-[var(--apas-emerald)]" />}
                {q.status === "error" && <X className="h-4 w-4 text-destructive" />}
              </div>
            </div>
          ))}
        </div>
      )}

      {queue.length > 0 && (
        <div className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            {doneCount} done · {pendingCount} pending
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setQueue([])}
                    disabled={queue.some((q) => q.status === "uploading")}>
              Clear
            </Button>
            <Button size="sm" onClick={uploadAll}
                    disabled={pendingCount === 0 || queue.some((q) => q.status === "uploading")}>
              {pendingCount === 0 ? "All uploaded" : `Upload ${pendingCount}`}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
