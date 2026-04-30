/**
 * B4 · AlbumDialog — create a new photo album and seed it with a selected set
 * of photo IDs. The caller is responsible for collecting the selection (usually
 * from the PhotosPage grid).
 */
import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { usePhotoAlbums } from "@/hooks/usePhotos";
import { toast } from "sonner";

export interface AlbumDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  projectId: string;
  /** Photos to add to the newly-created album. */
  selectedPhotoIds: string[];
  onCreated?: (albumId: string) => void;
}

export function AlbumDialog({
  open, onOpenChange, projectId, selectedPhotoIds, onCreated,
}: AlbumDialogProps) {
  const { create } = usePhotoAlbums(projectId);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  async function handleSubmit() {
    if (!name.trim()) { toast.error("Album name required"); return; }
    try {
      const album = await create.mutateAsync({
        name: name.trim(),
        description: description.trim() || undefined,
        photoIds: selectedPhotoIds,
      });
      toast.success(
        selectedPhotoIds.length > 0
          ? `Created "${album.name}" with ${selectedPhotoIds.length} photo${selectedPhotoIds.length === 1 ? "" : "s"}`
          : `Created empty album "${album.name}"`,
      );
      setName("");
      setDescription("");
      onCreated?.(album.id);
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !create.isPending && onOpenChange(o)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create album</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)}
                   placeholder="e.g. Slab pour — April 21" />
          </div>
          <div>
            <Label>Description (optional)</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)}
                      rows={3} />
          </div>
          <p className="text-xs text-muted-foreground">
            {selectedPhotoIds.length === 0
              ? "No photos selected — creating an empty album."
              : `${selectedPhotoIds.length} photo${selectedPhotoIds.length === 1 ? "" : "s"} will be added.`}
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={create.isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={create.isPending || !name.trim()}>
            {create.isPending ? "Creating…" : "Create album"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
