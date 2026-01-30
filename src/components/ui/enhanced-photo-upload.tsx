import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Camera, Upload, X, ZoomIn, Loader2, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PhotoData {
  id: string;
  url: string;
  caption?: string;
  timestamp: Date;
}

interface EnhancedPhotoUploadProps {
  photos: PhotoData[];
  onPhotosChange: (photos: PhotoData[]) => void;
  bucketName?: string;
  folderPath?: string;
  maxPhotos?: number;
  disabled?: boolean;
  className?: string;
}

export function EnhancedPhotoUpload({
  photos,
  onPhotosChange,
  bucketName = 'daily-report-photos',
  folderPath = '',
  maxPhotos = 50,
  disabled,
  className,
}: EnhancedPhotoUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [lightboxPhoto, setLightboxPhoto] = useState<PhotoData | null>(null);
  const [editingCaption, setEditingCaption] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const uploadPhoto = async (file: File): Promise<PhotoData | null> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${folderPath}${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('Upload error:', error);
      throw error;
    }

    const { data: urlData } = supabase.storage.from(bucketName).getPublicUrl(data.path);

    return {
      id: data.path,
      url: urlData.publicUrl,
      caption: '',
      timestamp: new Date(),
    };
  };

  const handleFileSelect = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const remainingSlots = maxPhotos - photos.length;
    if (remainingSlots <= 0) {
      toast.error(`Maximum ${maxPhotos} photos allowed`);
      return;
    }

    const filesToUpload = Array.from(files).slice(0, remainingSlots);
    setIsUploading(true);

    try {
      const uploadPromises = filesToUpload.map(file => uploadPhoto(file));
      const results = await Promise.allSettled(uploadPromises);

      const successfulUploads = results
        .filter((r): r is PromiseFulfilledResult<PhotoData | null> => r.status === 'fulfilled' && r.value !== null)
        .map(r => r.value as PhotoData);

      const failedCount = results.filter(r => r.status === 'rejected').length;

      if (successfulUploads.length > 0) {
        onPhotosChange([...photos, ...successfulUploads]);
        toast.success(`${successfulUploads.length} photo(s) uploaded`);
      }

      if (failedCount > 0) {
        toast.error(`${failedCount} photo(s) failed to upload`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload photos');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (cameraInputRef.current) cameraInputRef.current.value = '';
    }
  }, [photos, onPhotosChange, maxPhotos, bucketName, folderPath]);

  const removePhoto = useCallback(async (photoId: string) => {
    try {
      const { error } = await supabase.storage.from(bucketName).remove([photoId]);
      if (error) throw error;

      onPhotosChange(photos.filter(p => p.id !== photoId));
      toast.success('Photo removed');
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to remove photo');
    }
  }, [photos, onPhotosChange, bucketName]);

  const updateCaption = useCallback((photoId: string, caption: string) => {
    onPhotosChange(
      photos.map(p => (p.id === photoId ? { ...p, caption } : p))
    );
    setEditingCaption(null);
  }, [photos, onPhotosChange]);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Upload Actions */}
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => cameraInputRef.current?.click()}
          disabled={disabled || isUploading || photos.length >= maxPhotos}
        >
          <Camera className="h-4 w-4 mr-2" />
          Take Photo
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isUploading || photos.length >= maxPhotos}
        >
          {isUploading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Upload className="h-4 w-4 mr-2" />
          )}
          Upload Photos
        </Button>
        <span className="text-sm text-muted-foreground self-center ml-auto">
          {photos.length} / {maxPhotos} photos
        </span>
      </div>

      {/* Hidden File Inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFileSelect(e.target.files)}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handleFileSelect(e.target.files)}
      />

      {/* Photo Grid */}
      {photos.length > 0 ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className="relative group aspect-square rounded-lg overflow-hidden border bg-muted"
            >
              <img
                src={photo.url}
                alt={photo.caption || 'Uploaded photo'}
                className="w-full h-full object-cover cursor-pointer"
                onClick={() => setLightboxPhoto(photo)}
              />
              
              {/* Overlay Actions */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-white hover:bg-white/20"
                  onClick={() => setLightboxPhoto(photo)}
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-white hover:bg-red-500/50"
                  onClick={() => removePhoto(photo.id)}
                  disabled={disabled}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Caption Indicator */}
              {photo.caption && (
                <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-1 truncate">
                  {photo.caption}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="border-2 border-dashed rounded-lg p-8 text-center">
          <ImageIcon className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">
            No photos yet. Take a photo or upload from your device.
          </p>
        </div>
      )}

      {/* Lightbox Dialog */}
      <Dialog open={!!lightboxPhoto} onOpenChange={() => setLightboxPhoto(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden">
          {lightboxPhoto && (
            <>
              <div className="relative bg-black">
                <img
                  src={lightboxPhoto.url}
                  alt={lightboxPhoto.caption || 'Photo'}
                  className="w-full max-h-[70vh] object-contain"
                />
              </div>
              <div className="p-4 space-y-2">
                <DialogHeader>
                  <DialogTitle>Photo Details</DialogTitle>
                </DialogHeader>
                {editingCaption === lightboxPhoto.id ? (
                  <div className="flex gap-2">
                    <Input
                      defaultValue={lightboxPhoto.caption}
                      placeholder="Add a caption..."
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          updateCaption(lightboxPhoto.id, e.currentTarget.value);
                        }
                      }}
                      autoFocus
                    />
                    <Button
                      size="sm"
                      onClick={(e) => {
                        const input = (e.currentTarget.previousElementSibling as HTMLInputElement);
                        updateCaption(lightboxPhoto.id, input.value);
                      }}
                    >
                      Save
                    </Button>
                  </div>
                ) : (
                  <p
                    className="text-sm text-muted-foreground cursor-pointer hover:text-foreground"
                    onClick={() => setEditingCaption(lightboxPhoto.id)}
                  >
                    {lightboxPhoto.caption || 'Click to add caption...'}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Uploaded: {lightboxPhoto.timestamp.toLocaleString()}
                </p>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
