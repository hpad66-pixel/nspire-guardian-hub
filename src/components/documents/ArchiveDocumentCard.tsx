import { format } from 'date-fns';
import { motion } from 'framer-motion';
import {
  FileType,
  FileImage,
  FileSpreadsheet,
  FileText,
  File,
  Eye,
  Download,
  Edit,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PropertyArchive } from '@/hooks/usePropertyArchives';
import { cn } from '@/lib/utils';

interface ArchiveDocumentCardProps {
  document: PropertyArchive;
  canEdit: boolean;
  onView: (doc: PropertyArchive) => void;
  onDownload: (doc: PropertyArchive) => void;
  onEdit?: (doc: PropertyArchive) => void;
  index: number;
}

function getFileIcon(mimeType: string | null) {
  if (!mimeType) return <File className="h-6 w-6 text-muted-foreground" />;

  if (mimeType.startsWith('image/')) {
    return <FileImage className="h-6 w-6 text-blue-500" />;
  }
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) {
    return <FileSpreadsheet className="h-6 w-6 text-green-500" />;
  }
  if (mimeType.includes('pdf')) {
    return <FileType className="h-6 w-6 text-red-500" />;
  }
  return <FileText className="h-6 w-6 text-muted-foreground" />;
}

function formatFileSize(bytes: number | null) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ArchiveDocumentCard({
  document,
  canEdit,
  onView,
  onDownload,
  onEdit,
  index,
}: ArchiveDocumentCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03, duration: 0.2 }}
      className="group p-4 rounded-xl border bg-card hover:shadow-md transition-all duration-200"
    >
      <div className="flex items-start gap-4">
        {/* File type icon */}
        <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          {getFileIcon(document.mime_type)}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-semibold truncate">{document.name}</h4>
            {document.revision && (
              <Badge variant="outline" className="text-xs font-mono">
                REV {document.revision}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground flex-wrap">
            {document.document_number && (
              <span className="font-mono">{document.document_number}</span>
            )}
            {document.document_number && document.received_from && (
              <span>•</span>
            )}
            {document.received_from && <span>{document.received_from}</span>}
            {(document.document_number || document.received_from) &&
              document.original_date && <span>•</span>}
            {document.original_date && (
              <span>{format(new Date(document.original_date), 'MMM yyyy')}</span>
            )}
          </div>

          {document.description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
              {document.description}
            </p>
          )}

          <div className="flex items-center gap-2 mt-2">
            {document.file_size && (
              <span className="text-xs text-muted-foreground">
                {formatFileSize(document.file_size)}
              </span>
            )}
            {document.tags && document.tags.length > 0 && (
              <div className="flex items-center gap-1">
                {document.tags.slice(0, 2).map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="text-xs px-1.5 py-0"
                  >
                    {tag}
                  </Badge>
                ))}
                {document.tags.length > 2 && (
                  <span className="text-xs text-muted-foreground">
                    +{document.tags.length - 2}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onView(document)}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onDownload(document)}
          >
            <Download className="h-4 w-4" />
          </Button>
          {canEdit && onEdit && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onEdit(document)}
            >
              <Edit className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
