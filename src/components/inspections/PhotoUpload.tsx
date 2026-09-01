import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, Upload, X, Image as ImageIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { FieldCameraDialog } from '@/components/camera/FieldCameraDialog';
import type { StampContext } from '@/lib/camera';

interface PhotoUploadProps {
  photos: string[];
  onPhotosChange: (photos: string[]) => void;
  maxPhotos?: number;
  folder?: string;
  stampContext?: StampContext | null;
}

export function PhotoUpload({
  photos,
  onPhotosChange,
  maxPhotos = 5,
  folder = 'inspections',
  stampContext = null,
}: PhotoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remainingSlots = maxPhotos - photos.length;
    const filesToUpload = Array.from(files).slice(0, remainingSlots);

    if (filesToUpload.length === 0) {
      toast.error(`Maximum ${maxPhotos} photos allowed`);
      return;
    }

    setUploading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const uploadedUrls: string[] = [];

      for (const file of filesToUpload) {
        if (!file.type.startsWith('image/')) {
          toast.error(`${file.name} is not an image`);
          continue;
        }

        if (file.size > 5 * 1024 * 1024) {
          toast.error(`${file.name} is too large (max 5MB)`);
          continue;
        }

        const fileExt = file.name.split('.').pop();
        const fileName = `${user?.id}/${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('inspection-photos')
          .upload(fileName, file);

        if (uploadError) {
          console.error('Upload error:', uploadError);
          toast.error(`Failed to upload ${file.name}`);
          continue;
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from('inspection-photos').getPublicUrl(fileName);

        uploadedUrls.push(publicUrl);
      }

      if (uploadedUrls.length > 0) {
        onPhotosChange([...photos, ...uploadedUrls]);
        toast.success(`${uploadedUrls.length} photo(s) uploaded`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload photos');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemovePhoto = (index: number) => {
    const newPhotos = photos.filter((_, i) => i !== index);
    onPhotosChange(newPhotos);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          onClick={() => setCameraOpen(true)}
          disabled={uploading || photos.length >= maxPhotos}
          className="bg-[var(--apas-sapphire,#1D6FE8)] hover:bg-[var(--apas-sapphire,#1D6FE8)]/90"
        >
          <Camera className="mr-2 h-4 w-4" />
          Field Camera
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || photos.length >= maxPhotos}
        >
          {uploading ? (
            <>
              <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Upload Photo
            </>
          )}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {photos.map((url, index) => (
            <div key={index} className="group relative aspect-square">
              <img
                src={url}
                alt={`Photo ${index + 1}`}
                className="h-full w-full rounded-lg border object-cover"
              />
              <button
                type="button"
                onClick={() => handleRemovePhoto(index)}
                className="absolute right-1 top-1 rounded-full bg-destructive p-1 text-destructive-foreground opacity-0 transition-opacity group-hover:opacity-100"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {photos.length === 0 && (
        <div className="rounded-lg border-2 border-dashed p-8 text-center text-muted-foreground">
          <ImageIcon className="mx-auto mb-2 h-8 w-8 opacity-50" />
          <p className="text-sm">No photos yet</p>
          <p className="text-xs">Open Field Camera to capture a stamped photo</p>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        {photos.length} of {maxPhotos} photos · Field Camera stamps time + GPS into pixels
      </p>

      <FieldCameraDialog
        open={cameraOpen}
        onOpenChange={setCameraOpen}
        folder={folder}
        context={stampContext}
        onCaptured={({ url }) => {
          if (photos.length >= maxPhotos) {
            toast.error(`Maximum ${maxPhotos} photos allowed`);
            return;
          }
          onPhotosChange([...photos, url]);
        }}
      />
    </div>
  );
}
