import { useState, useRef } from 'react';
import { format } from 'date-fns';
import { X, Camera, Upload, Plus, Loader2 } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { toast } from 'sonner';
import { useAddGalleryPhotos } from '@/hooks/useProjectGallery';

interface AddPhotosSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId?: string;
  propertyId?: string;
  contextName: string;
}

export function AddPhotosSheet({ open, onOpenChange, projectId, propertyId, contextName }: AddPhotosSheetProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [caption, setCaption] = useState('');
  const [takenAt, setTakenAt] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [dateOpen, setDateOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const addPhotos = useAddGalleryPhotos();

  const handleFiles = (newFiles: FileList | null) => {
    if (!newFiles) return;
    const arr = Array.from(newFiles).filter(f => f.type.startsWith('image/'));
    setFiles(prev => [...prev, ...arr]);
  };

  const removeFile = (idx: number) => {
    setFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    if (files.length === 0) {
      toast.error('Please select at least one photo');
      return;
    }
    addPhotos.mutate({ files, caption, takenAt, projectId, propertyId }, {
      onSuccess: () => {
        toast.success(`${files.length} photo${files.length !== 1 ? 's' : ''} added to gallery ✓`);
        setFiles([]);
        setCaption('');
        setTakenAt(format(new Date(), 'yyyy-MM-dd'));
        onOpenChange(false);
      },
      onError: (err: any) => {
        toast.error(`Failed to upload: ${err.message}`);
      },
    });
  };

  const thumbnails = files.map(f => URL.createObjectURL(f));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[92vh] overflow-y-auto">
        <SheetHeader className="pb-4 border-b">
          <SheetTitle>Add Photos to Gallery</SheetTitle>
          <p className="text-sm text-muted-foreground">{contextName}</p>
        </SheetHeader>

        <div className="pt-5 space-y-6">
          {/* Upload methods */}
          {files.length === 0 && (
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => cameraInputRef.current?.click()}
                className="flex flex-col items-center gap-2 p-6 border-2 border-dashed rounded-xl hover:bg-muted/50 transition-colors"
              >
                <Camera className="h-8 w-8 text-muted-foreground" />
                <span className="text-sm font-medium">Camera</span>
                <span className="text-xs text-muted-foreground">Take a photo</span>
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center gap-2 p-6 border-2 border-dashed rounded-xl hover:bg-muted/50 transition-colors"
              >
                <Upload className="h-8 w-8 text-muted-foreground" />
                <span className="text-sm font-medium">Upload from Device</span>
                <span className="text-xs text-muted-foreground">Choose files</span>
              </button>
            </div>
          )}

          {/* Selected photos */}
          {files.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold">Photos Selected ({files.length})</h3>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1 text-xs text-primary"
                >
                  <Plus className="h-3 w-3" /> Add More
                </button>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {thumbnails.map((thumb, i) => (
                  <div key={i} className="relative flex-shrink-0">
                    <img src={thumb} alt="" className="h-20 w-20 object-cover rounded-lg" />
                    <button
                      onClick={() => removeFile(i)}
                      className="absolute -top-1 -right-1 h-5 w-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Hidden inputs */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={e => handleFiles(e.target.files)}
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            className="hidden"
            onChange={e => handleFiles(e.target.files)}
          />

          {/* Date */}
          <div>
            <h3 className="text-sm font-semibold mb-2">Photo Date</h3>
            <p className="text-xs text-muted-foreground mb-2">When were these taken?</p>
            <Popover open={dateOpen} onOpenChange={setDateOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  {format(new Date(takenAt + 'T12:00:00'), 'EEEE, MMMM d, yyyy')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={new Date(takenAt + 'T12:00:00')}
                  onSelect={d => { if (d) { setTakenAt(format(d, 'yyyy-MM-dd')); setDateOpen(false); }}}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
            <p className="text-xs text-muted-foreground/60 mt-1">Date auto-set when possible</p>
          </div>

          {/* Caption */}
          <div>
            <h3 className="text-sm font-semibold mb-2">Caption</h3>
            <textarea
              value={caption}
              onChange={e => setCaption(e.target.value)}
              rows={5}
              className="w-full text-sm border rounded-xl p-3 resize-none bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder={
                `Describe what you see and why it matters.\n\nExample: 'View looking east from the retention pond weir. Shows erosion on north bank, approx 8 linear feet. Camera facing east.'\n\nGood documentation = location · direction · what you see · why`
              }
            />
            <p className="text-xs text-muted-foreground/60 mt-2">
              📌 A captioned photo is evidence. An uncaptioned photo is just a file.
            </p>
          </div>

          {/* Submit */}
          <Button
            onClick={handleSubmit}
            disabled={files.length === 0 || addPhotos.isPending}
            className="w-full h-12 text-base font-semibold"
          >
            {addPhotos.isPending ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Uploading...</>
            ) : (
              `Add ${files.length > 0 ? files.length : ''} Photo${files.length !== 1 ? 's' : ''} to Gallery`
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
