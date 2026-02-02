import { format } from 'date-fns';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Download,
  ExternalLink,
  FileType,
  FileImage,
  FileSpreadsheet,
  FileText,
  File,
  Calendar,
  Building,
  User,
  Tag,
  Archive,
  Lock,
} from 'lucide-react';
import { PropertyArchive, ARCHIVE_CATEGORIES } from '@/hooks/usePropertyArchives';

interface ArchiveViewerSheetProps {
  document: PropertyArchive | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function getFileIcon(mimeType: string | null) {
  if (!mimeType) return <File className="h-8 w-8 text-muted-foreground" />;

  if (mimeType.startsWith('image/')) {
    return <FileImage className="h-8 w-8 text-blue-500" />;
  }
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) {
    return <FileSpreadsheet className="h-8 w-8 text-green-500" />;
  }
  if (mimeType.includes('pdf')) {
    return <FileType className="h-8 w-8 text-red-500" />;
  }
  return <FileText className="h-8 w-8 text-muted-foreground" />;
}

function formatFileSize(bytes: number | null) {
  if (!bytes) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ArchiveViewerSheet({
  document,
  open,
  onOpenChange,
}: ArchiveViewerSheetProps) {
  if (!document) return null;

  const category = ARCHIVE_CATEGORIES.find((c) => c.id === document.category);

  const handleDownload = () => {
    window.open(document.file_url, '_blank');
  };

  const handleOpenInNewTab = () => {
    window.open(document.file_url, '_blank');
  };

  const isImage = document.mime_type?.startsWith('image/');
  const isPdf = document.mime_type?.includes('pdf');

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader className="pb-4">
          <div className="flex items-start gap-4">
            <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-amber-400/20 to-amber-600/20 flex items-center justify-center flex-shrink-0">
              {getFileIcon(document.mime_type)}
            </div>
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-lg leading-tight">
                {document.name}
              </SheetTitle>
              <SheetDescription className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-xs">
                  {category?.label || document.category}
                </Badge>
                {document.revision && (
                  <Badge variant="secondary" className="text-xs font-mono">
                    REV {document.revision}
                  </Badge>
                )}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="space-y-6">
          {/* Preview for images */}
          {isImage && (
            <div className="rounded-lg border overflow-hidden bg-muted">
              <img
                src={document.file_url}
                alt={document.name}
                className="w-full h-auto max-h-64 object-contain"
              />
            </div>
          )}

          {/* Preview for PDFs */}
          {isPdf && (
            <div className="rounded-lg border overflow-hidden bg-muted h-64">
              <iframe
                src={`${document.file_url}#view=FitH`}
                className="w-full h-full"
                title={document.name}
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <Button onClick={handleDownload} className="flex-1">
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
            <Button variant="outline" onClick={handleOpenInNewTab}>
              <ExternalLink className="mr-2 h-4 w-4" />
              Open
            </Button>
          </div>

          <Separator />

          {/* Metadata */}
          <div className="space-y-4">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <Archive className="h-4 w-4 text-amber-500" />
              Document Details
            </h4>

            <div className="grid gap-3 text-sm">
              {document.document_number && (
                <div className="flex items-start gap-3">
                  <Tag className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-muted-foreground text-xs">Document Number</p>
                    <p className="font-mono">{document.document_number}</p>
                  </div>
                </div>
              )}

              {document.received_from && (
                <div className="flex items-start gap-3">
                  <Building className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-muted-foreground text-xs">Received From</p>
                    <p>{document.received_from}</p>
                  </div>
                </div>
              )}

              {document.original_date && (
                <div className="flex items-start gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-muted-foreground text-xs">Original Date</p>
                    <p>{format(new Date(document.original_date), 'MMMM d, yyyy')}</p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-muted-foreground text-xs">Archived On</p>
                  <p>{format(new Date(document.created_at), 'MMMM d, yyyy')}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <File className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-muted-foreground text-xs">File Size</p>
                  <p>{formatFileSize(document.file_size)}</p>
                </div>
              </div>
            </div>
          </div>

          {document.description && (
            <>
              <Separator />
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Description</h4>
                <p className="text-sm text-muted-foreground">{document.description}</p>
              </div>
            </>
          )}

          {document.tags && document.tags.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Tags</h4>
                <div className="flex flex-wrap gap-1">
                  {document.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}

          {document.notes && (
            <>
              <Separator />
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Notes</h4>
                <p className="text-sm text-muted-foreground">{document.notes}</p>
              </div>
            </>
          )}

          {/* Permanent retention notice */}
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-lg p-4">
            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
              <Lock className="h-4 w-4" />
              <span className="text-sm font-medium">Permanent Archive</span>
            </div>
            <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
              This document is permanently retained and cannot be deleted.
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
