import { useEffect, useCallback, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { X, ChevronLeft, ChevronRight, ExternalLink, Edit2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUpdatePhotoCaption } from '@/hooks/usePropertyGallery';
import type { GalleryPhoto } from '@/hooks/usePropertyGallery';
import { useNavigate } from 'react-router-dom';

const sourceColors: Record<string, string> = {
  grounds_inspection: 'bg-emerald-600',
  nspire_inspection:  'bg-amber-500',
  daily_report:       'bg-blue-600',
  direct:             'bg-violet-600',
};

const sourceShortLabels: Record<string, string> = {
  grounds_inspection: '🌿 Grounds Inspection',
  nspire_inspection:  '🏠 NSPIRE Inspection',
  daily_report:       '📋 Daily Report',
  direct:             '📷 Direct Upload',
};

interface GalleryLightboxProps {
  photos: GalleryPhoto[];
  initialIndex: number;
  onClose: () => void;
  propertyId?: string;
  projectId?: string;
}

export function GalleryLightbox({ photos, initialIndex, onClose, propertyId, projectId }: GalleryLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [editingCaption, setEditingCaption] = useState(false);
  const [caption, setCaption] = useState('');
  const [saved, setSaved] = useState(false);
  const updateCaption = useUpdatePhotoCaption();
  const navigate = useNavigate();

  const photo = photos[currentIndex];

  useEffect(() => {
    setCaption(photo?.caption || '');
    setEditingCaption(false);
  }, [currentIndex, photo?.caption]);

  const goNext = useCallback(() => {
    setCurrentIndex(i => Math.min(i + 1, photos.length - 1));
  }, [photos.length]);

  const goPrev = useCallback(() => {
    setCurrentIndex(i => Math.max(i - 1, 0));
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft') goPrev();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose, goNext, goPrev]);

  const handleSaveCaption = () => {
    setEditingCaption(false);
    updateCaption.mutate({
      url: photo.url,
      caption,
      propertyId,
      projectId,
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
  };

  const handleNavigateToSource = () => {
    if (photo.source_route) {
      onClose();
      navigate(photo.source_route);
    }
  };

  let parsedDate: Date | undefined;
  try { parsedDate = parseISO(photo.taken_at); } catch {}

  if (!photo) return null;

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/95 flex flex-col"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0">
        <button
          onClick={onClose}
          className="h-8 w-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
        <span className="text-white/60 text-sm font-mono">
          {currentIndex + 1} of {photos.length}
        </span>
      </div>

      {/* Image area */}
      <div className="flex-1 relative flex items-center justify-center min-h-0 px-10">
        {/* Prev */}
        <button
          onClick={goPrev}
          disabled={currentIndex === 0}
          className="absolute left-2 h-10 w-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed z-10"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <img
          src={photo.url}
          alt={caption || 'Gallery photo'}
          className="max-h-full max-w-full object-contain rounded-lg"
          style={{ maxHeight: 'calc(100vh - 280px)' }}
        />

        {/* Next */}
        <button
          onClick={goNext}
          disabled={currentIndex === photos.length - 1}
          className="absolute right-2 h-10 w-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed z-10"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Detail panel */}
      <div className="flex-shrink-0 bg-card rounded-t-2xl mx-0 border-t border-border shadow-2xl">
        <div className="px-4 pt-4 pb-6 space-y-3 max-w-2xl mx-auto">
          {/* Source + date */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn(
              'text-[11px] font-semibold px-2 py-0.5 rounded-full text-white',
              sourceColors[photo.source] || 'bg-slate-600'
            )}>
              {sourceShortLabels[photo.source] || photo.source}
            </span>
            {parsedDate && (
              <span className="text-sm text-muted-foreground">
                {format(parsedDate, 'EEEE, MMMM d, yyyy')}
              </span>
            )}
            {saved && (
              <span className="flex items-center gap-1 text-emerald-600 text-xs font-medium">
                <Check className="h-3 w-3" /> Saved
              </span>
            )}
          </div>

          {/* Caption */}
          <div>
            {editingCaption ? (
              <div className="space-y-2">
                <textarea
                  autoFocus
                  value={caption}
                  onChange={e => setCaption(e.target.value)}
                  rows={3}
                  placeholder="Describe what you see and why it matters. Include location, direction, and context."
                  className="w-full text-sm border rounded-lg p-2 resize-none bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveCaption}
                    className="px-3 py-1.5 bg-primary text-primary-foreground text-xs rounded-lg font-medium"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingCaption(false)}
                    className="px-3 py-1.5 border text-xs rounded-lg text-muted-foreground"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-between gap-2">
                <p
                  className={cn(
                    'text-sm flex-1',
                    caption ? 'text-foreground' : 'text-muted-foreground/50 italic'
                  )}
                >
                  {caption || 'No caption yet — tap Edit to add one.'}
                </p>
                <button
                  onClick={() => setEditingCaption(true)}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors shrink-0"
                >
                  <Edit2 className="h-3 w-3" />
                  Edit
                </button>
              </div>
            )}
          </div>

          {/* Source navigation */}
          {photo.source_route && (
            <button
              onClick={handleNavigateToSource}
              className="flex items-center gap-1.5 text-xs text-primary hover:underline transition-colors"
            >
              <ExternalLink className="h-3 w-3" />
              View Source: {photo.source_label}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
