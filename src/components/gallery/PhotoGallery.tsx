import { useState, useMemo, forwardRef } from 'react';
import { format } from 'date-fns';
import { Images, Plus, Search, Grid3x3, List, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { usePropertyGallery, useDeleteGalleryPhoto } from '@/hooks/usePropertyGallery';
import { useProjectGallery } from '@/hooks/useProjectGallery';
import type { GalleryPhoto, GalleryFilters } from '@/hooks/usePropertyGallery';
import { GalleryPhotoCard } from './GalleryPhotoCard';
import { GalleryLightbox } from './GalleryLightbox';
import { AddPhotosSheet } from './AddPhotosSheet';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface PhotoGalleryProps {
  context: 'property' | 'project';
  contextId: string;
  contextName: string;
  onBack?: () => void;
}

const SOURCE_FILTERS_PROPERTY = [
  { key: 'all', label: '📷 All' },
  { key: 'grounds_inspection', label: '🌿 Grounds Inspections' },
  { key: 'nspire_inspection', label: '🏠 NSPIRE Inspections' },
  { key: 'direct', label: '⬆️ Direct Uploads' },
];

const SOURCE_FILTERS_PROJECT = [
  { key: 'all', label: '📷 All' },
  { key: 'daily_report', label: '📋 Daily Reports' },
  { key: 'direct', label: '⬆️ Direct Uploads' },
];

const TIME_FILTERS = [
  { key: 'this_week', label: 'This Week' },
  { key: 'this_month', label: 'This Month' },
  { key: 'last_3_months', label: 'Last 3 Months' },
  { key: 'all_time', label: 'All Time' },
];

const sourceColors: Record<string, string> = {
  grounds_inspection: 'bg-emerald-600',
  nspire_inspection:  'bg-amber-500',
  daily_report:       'bg-blue-600',
  direct:             'bg-violet-600',
};

const sourceShortLabels: Record<string, string> = {
  grounds_inspection: '🌿 Grounds',
  nspire_inspection:  '🏠 NSPIRE',
  daily_report:       '📋 Daily',
  direct:             '📷 Direct',
};

function groupByMonth(photos: GalleryPhoto[]): Array<{ monthKey: string; monthLabel: string; photos: GalleryPhoto[] }> {
  const groups = new Map<string, GalleryPhoto[]>();
  for (const photo of photos) {
    const raw = photo.taken_at || '';
    const key = raw.slice(0, 7) || 'unknown';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(photo);
  }
  return Array.from(groups.entries()).map(([key, photos]) => {
    let label = key;
    try {
      const d = new Date(key + '-01T12:00:00');
      label = format(d, 'MMMM yyyy');
    } catch {}
    return { monthKey: key, monthLabel: label, photos };
  });
}

function groupByDay(photos: GalleryPhoto[]): Array<{ dayKey: string; dayLabel: string; photos: GalleryPhoto[] }> {
  const groups = new Map<string, GalleryPhoto[]>();
  for (const photo of photos) {
    const key = photo.taken_at?.slice(0, 10) || 'unknown';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(photo);
  }
  return Array.from(groups.entries()).map(([key, photos]) => {
    let label = key;
    try {
      const d = new Date(key + 'T12:00:00');
      label = format(d, 'EEEE, MMMM d');
    } catch {}
    return { dayKey: key, dayLabel: label, photos };
  });
}

const PhotoGridTile = forwardRef<HTMLDivElement, {
  photo: GalleryPhoto;
  index: number;
  onOpen: () => void;
  onDelete: (photo: GalleryPhoto) => void;
}>(function PhotoGridTile({ photo, index, onOpen, onDelete }, ref) {
  const isFeatured = index % 7 === 3;
  const isDirect = photo.source === 'direct';

  return (
    <div
      ref={ref}
      className={cn(
        'relative group overflow-hidden cursor-pointer bg-muted',
        isFeatured ? 'col-span-2 aspect-[4/3]' : 'aspect-square'
      )}
      onClick={onOpen}
    >
      <img
        src={photo.url}
        alt={photo.caption || 'Photo'}
        className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
        loading="lazy"
      />
      {/* Source badge */}
      <div className="absolute top-1.5 left-1.5">
        <span className={cn(
          'text-[10px] font-semibold px-1.5 py-0.5 rounded-full text-white backdrop-blur-sm',
          sourceColors[photo.source] || 'bg-slate-600'
        )}>
          {sourceShortLabels[photo.source] || photo.source}
        </span>
      </div>
      {/* Delete button — only for direct uploads */}
      {isDirect && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(photo); }}
          className="absolute top-1.5 right-1.5 h-6 w-6 flex items-center justify-center rounded-full bg-destructive/90 text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive"
          title="Delete photo"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      )}
      {/* Caption */}
      {photo.caption ? (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2 translate-y-full group-hover:translate-y-0 transition-transform duration-200">
          <p className="text-white text-[11px] leading-tight line-clamp-2">{photo.caption}</p>
        </div>
      ) : (
        <div className="absolute bottom-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="text-[10px] text-white/70 italic bg-black/40 px-1.5 py-0.5 rounded-full backdrop-blur-sm">
            Add caption
          </span>
        </div>
      )}
    </div>
  );
});

function EmptyState({ hasFilters, onClearFilters, timeFilter }: {
  hasFilters: boolean;
  onClearFilters: () => void;
  timeFilter: string;
}) {
  if (hasFilters) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="text-4xl">🔍</div>
        <div className="text-center">
          <h3 className="font-semibold text-lg">No photos match your filters.</h3>
        </div>
        <Button variant="outline" onClick={onClearFilters}>Clear filters</Button>
      </div>
    );
  }
  if (timeFilter === 'this_week') {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="text-4xl">📷</div>
        <div className="text-center space-y-1">
          <h3 className="font-semibold text-lg">No photos this week yet.</h3>
          <p className="text-muted-foreground text-sm">Daily documentation builds the visual record.</p>
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="text-5xl">📸</div>
      <div className="text-center space-y-2">
        <h3 className="font-semibold text-xl">No photos yet.</h3>
        <p className="text-muted-foreground text-sm max-w-sm text-center">
          Photos from inspections and reports appear here automatically as your team documents the property.
        </p>
      </div>
    </div>
  );
}

export function PhotoGallery({ context, contextId, contextName, onBack }: PhotoGalleryProps) {
  const [sourceFilter, setSourceFilter] = useState('all');
  const [timeFilter, setTimeFilter] = useState('all_time');
  const [viewMode, setViewMode] = useState<'grid' | 'timeline'>('grid');
  const [search, setSearch] = useState('');
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [addPhotosOpen, setAddPhotosOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<GalleryPhoto | null>(null);
  const navigate = useNavigate();
  const deletePhoto = useDeleteGalleryPhoto();

  const filters: GalleryFilters = useMemo(() => ({
    source: sourceFilter === 'all' ? undefined : sourceFilter,
    search: search || undefined,
    timeFilter: timeFilter === 'all_time' ? undefined : timeFilter as any,
  }), [sourceFilter, timeFilter, search]);

  const propertyResult = usePropertyGallery(
    context === 'property' ? contextId : '',
    context === 'property' ? filters : undefined
  );
  const projectResult = useProjectGallery(
    context === 'project' ? contextId : '',
    context === 'project' ? filters : undefined
  );

  const { data: photos = [], isLoading } = context === 'property' ? propertyResult : projectResult;

  const sourceFilters = context === 'property' ? SOURCE_FILTERS_PROPERTY : SOURCE_FILTERS_PROJECT;
  const hasActiveFilters = sourceFilter !== 'all' || timeFilter !== 'all_time' || !!search;

  const clearFilters = () => {
    setSourceFilter('all');
    setTimeFilter('all_time');
    setSearch('');
  };

  const handleDeleteRequest = (photo: GalleryPhoto) => {
    setDeleteTarget(photo);
  };

  const handleDeleteConfirm = () => {
    if (!deleteTarget) return;
    deletePhoto.mutate(
      {
        photoId: deleteTarget.id,
        propertyId: context === 'property' ? contextId : undefined,
        projectId: context === 'project' ? contextId : undefined,
      },
      {
        onSuccess: () => {
          toast.success('Photo deleted');
          setDeleteTarget(null);
          if (lightboxIndex !== null) setLightboxIndex(null);
        },
        onError: () => toast.error('Failed to delete photo'),
      }
    );
  };

  const monthGroups = useMemo(() => groupByMonth(photos), [photos]);
  const dayGroups = useMemo(() => groupByDay(photos), [photos]);
  const showDayGroups = timeFilter === 'this_week';

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="px-4 pt-4 pb-3 space-y-1 border-b bg-background">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Images className="h-5 w-5 text-primary shrink-0" />
            <h2 className="font-bold text-lg truncate">Photos & Gallery</h2>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-muted-foreground font-mono hidden sm:block">{photos.length} photos</span>
            <Button size="sm" variant="outline" onClick={() => setAddPhotosOpen(true)}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add Photos
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground italic">
          Visual evidence is your strongest record. Caption every photo.
        </p>
      </div>

      {/* Filter bars */}
      <div className="px-4 py-3 space-y-2 border-b bg-background/95 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
          {sourceFilters.map(f => (
            <button
              key={f.key}
              onClick={() => setSourceFilter(f.key)}
              className={cn(
                'whitespace-nowrap text-xs px-3 py-1.5 rounded-full border transition-colors font-medium shrink-0',
                sourceFilter === f.key
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background text-muted-foreground border-border hover:border-primary/50'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex gap-1 shrink-0">
            {TIME_FILTERS.map(f => (
              <button
                key={f.key}
                onClick={() => setTimeFilter(f.key)}
                className={cn(
                  'text-xs px-2.5 py-1 rounded-full border transition-colors font-medium',
                  timeFilter === f.key
                    ? 'bg-secondary text-secondary-foreground border-secondary'
                    : 'text-muted-foreground border-border hover:border-primary/50'
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 ml-auto">
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                'h-7 w-7 flex items-center justify-center rounded border transition-colors',
                viewMode === 'grid' ? 'bg-secondary border-secondary' : 'border-border text-muted-foreground'
              )}
            >
              <Grid3x3 className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setViewMode('timeline')}
              className={cn(
                'h-7 w-7 flex items-center justify-center rounded border transition-colors',
                viewMode === 'timeline' ? 'bg-secondary border-secondary' : 'border-border text-muted-foreground'
              )}
            >
              <List className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="relative w-full sm:w-48">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search captions, dates..."
              className="pl-8 h-7 text-xs"
            />
          </div>
        </div>
      </div>

      {/* Gallery content */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : photos.length === 0 ? (
          <EmptyState
            hasFilters={hasActiveFilters}
            onClearFilters={clearFilters}
            timeFilter={timeFilter}
          />
        ) : viewMode === 'grid' ? (
          <div className="p-0">
            {(showDayGroups
              ? dayGroups.map(g => ({ key: g.dayKey, label: g.dayLabel, photos: g.photos }))
              : monthGroups.map(g => ({ key: g.monthKey, label: g.monthLabel, photos: g.photos }))
            ).map(group => {
              const globalOffset = photos.indexOf(group.photos[0]);
              return (
                <div key={group.key}>
                  <div className="flex items-baseline justify-between py-3 px-4 sticky top-0 z-10 bg-background/90 backdrop-blur-sm border-b">
                    <h3 className="text-sm font-bold tracking-tight uppercase">{group.label}</h3>
                    <span className="text-xs text-muted-foreground">{group.photos.length} photos</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-0.5 bg-border">
                    {group.photos.map((photo, i) => (
                      <PhotoGridTile
                        key={photo.id}
                        photo={photo}
                        index={globalOffset + i}
                        onOpen={() => setLightboxIndex(photos.indexOf(photo))}
                        onDelete={handleDeleteRequest}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-4 space-y-8">
            {(showDayGroups
              ? dayGroups.map(g => ({ key: g.dayKey, label: g.dayLabel, photos: g.photos }))
              : monthGroups.map(g => ({ key: g.monthKey, label: g.monthLabel, photos: g.photos }))
            ).map(group => (
              <div key={group.key}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-sm font-bold uppercase tracking-wide text-muted-foreground whitespace-nowrap">{group.label}</span>
                  <span className="text-xs text-muted-foreground">{group.photos.length} photos</span>
                  <div className="h-px flex-1 bg-border" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {group.photos.map(photo => (
                    <GalleryPhotoCard
                      key={photo.id}
                      photo={photo}
                      propertyId={context === 'property' ? contextId : undefined}
                      projectId={context === 'project' ? contextId : undefined}
                      onNavigateToSource={route => navigate(route)}
                      onDelete={handleDeleteRequest}
                      showCaption
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <GalleryLightbox
          photos={photos}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          propertyId={context === 'property' ? contextId : undefined}
          projectId={context === 'project' ? contextId : undefined}
          onDelete={handleDeleteRequest}
        />
      )}

      {/* Add photos sheet */}
      <AddPhotosSheet
        open={addPhotosOpen}
        onOpenChange={setAddPhotosOpen}
        projectId={context === 'project' ? contextId : undefined}
        propertyId={context === 'property' ? contextId : undefined}
        contextName={contextName}
      />

      {/* Delete confirmation dialog — only reachable for direct uploads */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[200] bg-black/60 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center">
                <Trash2 className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Delete Photo?</h3>
                <p className="text-xs text-muted-foreground">This action cannot be undone.</p>
              </div>
            </div>
            {deleteTarget.caption && (
              <p className="text-sm text-muted-foreground italic bg-muted rounded-lg px-3 py-2 line-clamp-2">
                "{deleteTarget.caption}"
              </p>
            )}
            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setDeleteTarget(null)}
                disabled={deletePhoto.isPending}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={handleDeleteConfirm}
                disabled={deletePhoto.isPending}
              >
                {deletePhoto.isPending ? 'Deleting…' : 'Delete Photo'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
