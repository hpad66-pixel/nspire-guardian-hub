import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import {
  FileText, Download, Trash2, Plus, AlertCircle, Clock, CheckCircle2,
  FolderOpen, Upload,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useHRVault, getHRDocumentExpiryStatus, type HRDocument } from '@/hooks/useHRVault';
import { useUserPermissions } from '@/hooks/usePermissions';
import { HRVaultUploadSheet } from './HRVaultUploadSheet';

interface HRVaultTabProps {
  employeeId: string;
}

// ─── Expiry badge ─────────────────────────────────────────────────────────────

function ExpiryBadge({ expiryDate }: { expiryDate: string | null }) {
  const status = getHRDocumentExpiryStatus(expiryDate);
  if (status === 'no_expiry') return null;

  const label = expiryDate ? format(parseISO(expiryDate), 'MMM d, yyyy') : '';

  switch (status) {
    case 'expired':
      return (
        <Badge variant="destructive" className="gap-1 text-xs">
          <AlertCircle className="h-3 w-3" />
          Expired · {label}
        </Badge>
      );
    case 'expiring_soon':
      return (
        <Badge variant="secondary" className="gap-1 text-xs border border-border">
          <Clock className="h-3 w-3" />
          Expiring · {label}
        </Badge>
      );
    case 'valid':
      return (
        <Badge variant="outline" className="gap-1 text-xs">
          <CheckCircle2 className="h-3 w-3" />
          Valid · {label}
        </Badge>
      );
    default:
      return null;
  }
}

// ─── Single document row ──────────────────────────────────────────────────────

function DocumentRow({
  doc,
  canDelete,
  onDelete,
}: {
  doc: HRDocument;
  canDelete: boolean;
  onDelete: (id: string) => void;
}) {
  const formatBytes = (bytes: number | null) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="flex items-start justify-between gap-3 py-3 border-b last:border-0">
      <div className="flex items-start gap-3 min-w-0">
        <div className="mt-0.5 h-8 w-8 rounded-md bg-muted flex items-center justify-center shrink-0">
          <FileText className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {doc.category && (
              <Badge variant="secondary" className="text-xs shrink-0">
                {doc.category.name}
              </Badge>
            )}
            <span className="font-medium text-sm truncate">{doc.title}</span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <ExpiryBadge expiryDate={doc.expiry_date} />
          </div>
          <div className="mt-1 text-xs text-muted-foreground space-y-0.5">
            {doc.file_name && (
              <div className="truncate">
                {doc.file_name}
                {doc.file_size_bytes ? ` · ${formatBytes(doc.file_size_bytes)}` : ''}
              </div>
            )}
            <div>
              Uploaded {format(parseISO(doc.created_at), 'MMM d, yyyy')}
            </div>
            {doc.notes && (
              <div className="text-muted-foreground italic">{doc.notes}</div>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {doc.file_url && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            asChild
          >
            <a href={doc.file_url} target="_blank" rel="noopener noreferrer" title="Download">
              <Download className="h-4 w-4" />
            </a>
          </Button>
        )}
        {canDelete && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete document?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently remove "{doc.title}" from the HR Vault. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={() => onDelete(doc.id)}
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function HRVaultTab({ employeeId }: HRVaultTabProps) {
  const [showUpload, setShowUpload] = useState(false);
  const { documents, categories, isLoading, error, deleteDocument } = useHRVault(employeeId);
  const { isAdmin, isOwner, isPropertyManager } = useUserPermissions();
  const canManage = isAdmin || isOwner || isPropertyManager;

  const handleDelete = (id: string) => {
    deleteDocument.mutate(id);
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-6 text-center text-sm text-destructive">
          <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-60" />
          Could not load HR Vault documents.
        </CardContent>
      </Card>
    );
  }

  // Group documents by category
  const grouped = documents.reduce<Record<string, HRDocument[]>>((acc, doc) => {
    const key = doc.category?.name ?? 'Uncategorized';
    if (!acc[key]) acc[key] = [];
    acc[key].push(doc);
    return acc;
  }, {});

  const groupKeys = Object.keys(grouped).sort();

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold">HR Vault</h3>
          <p className="text-xs text-muted-foreground">
            {documents.length} document{documents.length !== 1 ? 's' : ''} on file
          </p>
        </div>
        {canManage && (
          <Button size="sm" onClick={() => setShowUpload(true)}>
            <Upload className="h-4 w-4 mr-1" />
            Upload Document
          </Button>
        )}
      </div>

      {documents.length === 0 ? (
        <Card>
          <CardContent className="py-10 flex flex-col items-center text-center">
            <FolderOpen className="h-10 w-10 text-muted-foreground mb-3 opacity-50" />
            <p className="font-medium text-sm">No documents in HR Vault</p>
            <p className="text-xs text-muted-foreground mt-1">
              {canManage
                ? 'Upload an offer letter, I-9, W-4, or any employment paperwork.'
                : 'No documents have been uploaded for this employee yet.'}
            </p>
            {canManage && (
              <Button size="sm" variant="outline" className="mt-4" onClick={() => setShowUpload(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Add First Document
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {groupKeys.map(group => (
            <Card key={group}>
              <CardContent className="pt-4 pb-2 px-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  {group}
                </p>
                {grouped[group].map(doc => (
                  <DocumentRow
                    key={doc.id}
                    doc={doc}
                    canDelete={canManage}
                    onDelete={handleDelete}
                  />
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <HRVaultUploadSheet
        open={showUpload}
        onOpenChange={setShowUpload}
        employeeId={employeeId}
        categories={categories}
      />
    </>
  );
}
