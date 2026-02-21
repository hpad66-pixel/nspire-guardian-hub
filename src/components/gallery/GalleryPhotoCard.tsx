import { useState, useRef, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, ExternalLink, Check, Trash2 } from 'lucide-react';
import { useUpdatePhotoCaption, useDeleteGalleryPhoto } from '@/hooks/usePropertyGallery';
import type { GalleryPhoto } from '@/hooks/usePropertyGallery';
import { toast } from 'sonner';

const sourceColors: Record<string, string> = {
  grounds_inspection: 'bg-emerald-600',
  nspire_inspection:  'bg-amber-500',
  daily_report:       'bg-blue-600',
  safety:             'bg-red-600',
  punch_list:         'bg-green-600',
  direct:             'bg-violet-600',
};

const sourceShortLabels: Record<string, string> = {
  grounds_inspection: '🌿 Grounds',
  nspire_inspection:  '🏠 NSPIRE',
  daily_report:       '📋 Daily',
  safety:             '🦺 Safety',
  punch_list:         '✅ Punch',
  direct:             '📷 Direct',
};

interface GalleryPhotoCardProps {
  photo: GalleryPhoto;
  propertyId?: string;
  projectId?: string;
  onNavigateToSource?: (route: string) => void;
  onDelete?: (photo: GalleryPhoto) => void;
  showCaption?: boolean;
}

export function GalleryPhotoCard({
  photo,
  propertyId,
  projectId,
  onNavigateToSource,
  onDelete,
  showCaption = true,
}: GalleryPhotoCardProps) {
  const [caption, setCaption] = useState(photo.caption || '');
  const [isEditing, setIsEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [takenAt, setTakenAt] = useState(photo.taken_at);
  const [dateOpen, setDateOpen] = useState(false);
  const saveTimeout = useRef<ReturnType<typeof setTimeout>>();
  const updateCaption = useUpdatePhotoCaption();

  useEffect(() => { setCaption(photo.caption || ''); }, [photo.caption]);
  useEffect(() => { setTakenAt(photo.taken_at); }, [photo.taken_at]);

  const handleCaptionBlur = () => {
    setIsEditing(false);
    clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      updateCaption.mutate({
        url: photo.url,
        caption,
        propertyId,
        projectId,
        takenAt,
        source: photo.source,
        sourceId: photo.source_id,
        sourceLabel: photo.source_label,
        sourceRoute: photo.source_route,
      }, {
        onSuccess: () => {
          setSaved(true);
          setTimeout(() => setSaved(false), 1500);
        },
      });
    }, 800);
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;
    const newDate = format(date, 'yyyy-MM-dd');
    setTakenAt(newDate);
    setDateOpen(false);
    updateCaption.mutate({
      url: photo.url,
      caption,
      propertyId,
      projectId,
      takenAt: newDate,
      source: photo.source,
      sourceId: photo.source_id,
      sourceLabel: photo.source_label,
      sourceRoute: photo.source_route,
    });
  };

  let parsedDate: Date | undefined;
  try { parsedDate = parseISO(takenAt); } catch {}

  return (
    <div className="rounded-xl overflow-hidden border bg-card shadow-sm">
      {/* Image */}
      <div className="relative aspect-[4/3] bg-muted group">
        <img
          src={photo.url}
          alt={caption || 'Photo'}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        {/* Source badge */}
        <div className="absolute top-2 left-2">
          <span className={cn(
            'text-[10px] font-semibold px-1.5 py-0.5 rounded-full text-white backdrop-blur-sm',
            sourceColors[photo.source] || 'bg-slate-600'
          )}>
            {sourceShortLabels[photo.source] || photo.source}
          </span>
        </div>
        {/* Delete button — only for direct uploads */}
        {photo.source === 'direct' && onDelete && (
          <button
            onClick={() => onDelete(photo)}
            className="absolute top-2 right-2 h-7 w-7 flex items-center justify-center rounded-full bg-destructive/90 text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive"
            title="Delete photo"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
        {saved && (
          <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-emerald-600 text-white text-[10px] px-2 py-0.5 rounded-full">
            <Check className="h-2.5 w-2.5" />
            Saved
          </div>
        )}
      </div>

      {/* Card body */}
      <div className="p-3 space-y-2">
        {/* Date */}
        <Popover open={dateOpen} onOpenChange={setDateOpen}>
          <PopoverTrigger asChild>
            <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <CalendarIcon className="h-3 w-3" />
              {parsedDate ? format(parsedDate, 'EEE, MMM d yyyy') : takenAt}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={parsedDate}
              onSelect={handleDateSelect}
              initialFocus
              className="p-3 pointer-events-auto"
            />
          </PopoverContent>
        </Popover>

        {/* Caption */}
        {showCaption && (
          <div>
            {isEditing ? (
              <textarea
                autoFocus
                value={caption}
                onChange={e => setCaption(e.target.value)}
                onBlur={handleCaptionBlur}
                rows={3}
                placeholder="Describe what you see and why it matters.&#10;&#10;Good caption: location · direction · what you see · why it matters"
                className="w-full text-sm border rounded-lg p-2 resize-none bg-background focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/50 placeholder:text-xs"
              />
            ) : caption ? (
              <p
                className="text-sm text-muted-foreground italic cursor-pointer hover:text-foreground transition-colors line-clamp-3"
                onClick={() => setIsEditing(true)}
              >
                "{caption}"
              </p>
            ) : (
              <button
                className="text-xs text-muted-foreground/60 italic hover:text-muted-foreground transition-colors"
                onClick={() => setIsEditing(true)}
              >
                Tap to add caption...
              </button>
            )}
            {!isEditing && (
              <p className="text-[10px] text-muted-foreground/50 mt-1">
                📌 A captioned photo is evidence. An uncaptioned photo is just a file.
              </p>
            )}
          </div>
        )}

        {/* Source link */}
        {photo.source_route && onNavigateToSource && (
          <button
            onClick={() => onNavigateToSource(photo.source_route)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            <ExternalLink className="h-3 w-3" />
            {photo.source_label}
          </button>
        )}
      </div>
    </div>
  );
}
