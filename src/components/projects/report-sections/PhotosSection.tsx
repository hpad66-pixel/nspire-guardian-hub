/**
 * Site Photos section for the daily report builder — upload pictures from the field
 * (camera or file) and add a caption to explain each one. Wraps EnhancedPhotoUpload,
 * which handles storage upload + per-photo captions (click a photo to caption it).
 */
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { EnhancedPhotoUpload } from '@/components/ui/enhanced-photo-upload';

export interface ReportPhoto {
  id: string;
  url: string;
  caption?: string;
  timestamp: Date;
}

export function PhotosSection({
  open, onClose, data, onChange, projectId,
}: {
  open: boolean;
  onClose: () => void;
  data: ReportPhoto[];
  onChange: (v: ReportPhoto[]) => void;
  projectId: string;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Site Photos</DialogTitle>
          <DialogDescription>
            Take or upload photos from the field, then click a photo to add a caption explaining what it shows.
            They appear in the report and the PDF.
          </DialogDescription>
        </DialogHeader>
        <EnhancedPhotoUpload photos={data} onPhotosChange={onChange} folderPath={`${projectId}/daily/`} />
      </DialogContent>
    </Dialog>
  );
}
