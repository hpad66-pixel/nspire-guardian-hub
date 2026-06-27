import { useEffect, useState } from 'react';
import { FolderPlus, Images, Trash2, Star, X, GripVertical, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  useGalleryAlbums, useAlbumPhotos, useAlbumMutations,
  type GalleryAlbum,
} from '@/hooks/useGalleryAlbums';

type Ctx = { propertyId?: string; projectId?: string };

// ─── Albums strip (row of album covers + "New album") ───────────────────────
export function GalleryAlbumsStrip({ ctx }: { ctx: Ctx }) {
  const { data: albums = [] } = useGalleryAlbums(ctx);
  const { createAlbum } = useAlbumMutations(ctx);
  const [openAlbum, setOpenAlbum] = useState<GalleryAlbum | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');

  if (albums.length === 0 && !creating) {
    return (
      <div className="px-4 py-2 border-b bg-background">
        <button
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <FolderPlus className="h-3.5 w-3.5" /> Create an album
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center gap-2 px-4 py-2.5 border-b bg-background overflow-x-auto no-scrollbar">
        {albums.map((a) => (
          <button
            key={a.id}
            onClick={() => setOpenAlbum(a)}
            className="group relative h-16 w-24 shrink-0 overflow-hidden rounded-lg border border-border bg-muted text-left"
          >
            {a.cover_url ? (
              <img src={a.cover_url} alt={a.name} className="h-full w-full object-cover" loading="lazy" />
            ) : (
              <div className="flex h-full w-full items-center justify-center"><Images className="h-5 w-5 text-muted-foreground/50" /></div>
            )}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-1.5 pt-3 pb-1">
              <p className="truncate text-[11px] font-semibold text-white">{a.name}</p>
              <p className="text-[9px] text-white/70">{a.photo_count ?? 0} photos</p>
            </div>
          </button>
        ))}
        <button
          onClick={() => setCreating(true)}
          className="flex h-16 w-24 shrink-0 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
        >
          <FolderPlus className="h-4 w-4" />
          <span className="text-[10px] font-medium">New album</span>
        </button>
      </div>

      {/* Create album dialog */}
      <Dialog open={creating} onOpenChange={(o) => { setCreating(o); if (!o) setNewName(''); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>New album</DialogTitle></DialogHeader>
          <Input autoFocus value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Album name (e.g. Foundation pour)"
            onKeyDown={(e) => { if (e.key === 'Enter' && newName.trim()) { createAlbum.mutate({ name: newName }); setCreating(false); setNewName(''); } }} />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCreating(false); setNewName(''); }}>Cancel</Button>
            <Button disabled={!newName.trim() || createAlbum.isPending}
              onClick={() => { createAlbum.mutate({ name: newName }, { onSuccess: () => toast.success('Album created') }); setCreating(false); setNewName(''); }}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {openAlbum && <AlbumDialog ctx={ctx} album={openAlbum} onClose={() => setOpenAlbum(null)} />}
    </>
  );
}

// ─── Album viewer: arrange (drag), remove, set cover, rename, delete ─────────
function AlbumDialog({ ctx, album, onClose }: { ctx: Ctx; album: GalleryAlbum; onClose: () => void }) {
  const { data: photos = [] } = useAlbumPhotos(album.id);
  const { reorderAlbum, removePhotoFromAlbum, setCover, renameAlbum, deleteAlbum } = useAlbumMutations(ctx);
  const [order, setOrder] = useState<string[]>([]);
  const [dragId, setDragId] = useState<string | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(album.name);

  useEffect(() => { setOrder(photos.map((p) => p.photo_id)); }, [photos]);

  const byId = new Map(photos.map((p) => [p.photo_id, p]));
  const ordered = order.map((id) => byId.get(id)).filter(Boolean) as typeof photos;

  const onDrop = (targetId: string) => {
    if (!dragId || dragId === targetId) return;
    const next = [...order];
    const from = next.indexOf(dragId);
    const to = next.indexOf(targetId);
    next.splice(to, 0, next.splice(from, 1)[0]);
    setOrder(next);
    setDragId(null);
    reorderAlbum.mutate({ albumId: album.id, orderedPhotoIds: next });
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between gap-2 pr-6">
            {renaming ? (
              <Input value={name} onChange={(e) => setName(e.target.value)} className="h-8 max-w-xs"
                onKeyDown={(e) => { if (e.key === 'Enter') { renameAlbum.mutate({ id: album.id, name }); setRenaming(false); } }} />
            ) : (
              <DialogTitle className="flex items-center gap-2">{album.name}
                <button onClick={() => setRenaming(true)} className="text-muted-foreground hover:text-foreground"><Pencil className="h-3.5 w-3.5" /></button>
              </DialogTitle>
            )}
            <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10"
              onClick={() => { if (confirm(`Delete album "${album.name}"? Photos stay in the gallery.`)) { deleteAlbum.mutate(album.id, { onSuccess: () => { toast.success('Album deleted'); onClose(); } }); } }}>
              <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete album
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">Drag to arrange. Hover a photo to set it as the cover or remove it.</p>
        </DialogHeader>

        {ordered.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            This album is empty. Select photos in the gallery and choose “Add to album”.
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {ordered.map((p) => (
              <div
                key={p.photo_id}
                draggable
                onDragStart={() => setDragId(p.photo_id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => onDrop(p.photo_id)}
                className={cn('group relative aspect-square overflow-hidden rounded-lg border bg-muted cursor-grab active:cursor-grabbing',
                  dragId === p.photo_id && 'opacity-40')}
              >
                <img src={p.url} alt={p.caption} className="h-full w-full object-cover" loading="lazy" />
                <div className="absolute left-1 top-1 rounded bg-black/40 p-0.5 text-white/80 opacity-0 group-hover:opacity-100"><GripVertical className="h-3.5 w-3.5" /></div>
                <div className="absolute right-1 top-1 flex gap-1 opacity-0 group-hover:opacity-100">
                  <button title="Set as cover" onClick={() => setCover.mutate({ albumId: album.id, coverUrl: p.url }, { onSuccess: () => toast.success('Cover updated') })}
                    className="flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white hover:bg-amber-500"><Star className="h-3 w-3" /></button>
                  <button title="Remove from album" onClick={() => removePhotoFromAlbum.mutate({ albumId: album.id, photoId: p.photo_id })}
                    className="flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white hover:bg-destructive"><X className="h-3 w-3" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Add-to-album picker (used by the bulk action bar) ──────────────────────
export function AddToAlbumDialog({
  ctx, photoIds, coverUrl, open, onOpenChange,
}: { ctx: Ctx; photoIds: string[]; coverUrl?: string; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { data: albums = [] } = useGalleryAlbums(ctx);
  const { createAlbum, addPhotosToAlbum } = useAlbumMutations(ctx);
  const [newName, setNewName] = useState('');

  const add = (albumId: string) => {
    addPhotosToAlbum.mutate({ albumId, photoIds, coverUrl }, {
      onSuccess: () => { toast.success(`Added ${photoIds.length} photo${photoIds.length !== 1 ? 's' : ''} to album`); onOpenChange(false); },
      onError: () => toast.error('Could not add to album'),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Add {photoIds.length} photo{photoIds.length !== 1 ? 's' : ''} to an album</DialogTitle></DialogHeader>
        <div className="space-y-3">
          {albums.length > 0 && (
            <div className="max-h-56 space-y-1 overflow-y-auto">
              {albums.map((a) => (
                <button key={a.id} onClick={() => add(a.id)}
                  className="flex w-full items-center gap-3 rounded-lg border border-border px-3 py-2 text-left hover:border-primary/50 hover:bg-muted/40">
                  <div className="h-10 w-10 shrink-0 overflow-hidden rounded bg-muted">
                    {a.cover_url ? <img src={a.cover_url} className="h-full w-full object-cover" /> : <Images className="m-2.5 h-5 w-5 text-muted-foreground/50" />}
                  </div>
                  <div className="min-w-0"><p className="truncate text-sm font-medium">{a.name}</p><p className="text-xs text-muted-foreground">{a.photo_count ?? 0} photos</p></div>
                </button>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2 border-t pt-3">
            <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="New album name…"
              onKeyDown={(e) => { if (e.key === 'Enter' && newName.trim()) createAlbum.mutate({ name: newName }, { onSuccess: (a: GalleryAlbum) => { add(a.id); setNewName(''); } }); }} />
            <Button disabled={!newName.trim()} onClick={() => createAlbum.mutate({ name: newName }, { onSuccess: (a: GalleryAlbum) => { add(a.id); setNewName(''); } })}>
              <FolderPlus className="h-4 w-4 mr-1" /> Create &amp; add
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
