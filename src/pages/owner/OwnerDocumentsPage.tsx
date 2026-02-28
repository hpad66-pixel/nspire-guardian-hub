import { format } from 'date-fns';
import { useOwnerDocuments } from '@/hooks/useOwnerPortal';
import { Button } from '@/components/ui/button';
import { FileText, Mail } from 'lucide-react';

export default function OwnerDocumentsPage() {
  const { data: documents = [], isLoading } = useOwnerDocuments();

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6 md:p-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Documents</h1>
        <p className="mt-1 text-sm text-muted-foreground">Files shared with you by APAS Consulting</p>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}

      {!isLoading && documents.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-background py-16 text-center">
          <FileText className="h-12 w-12 text-muted-foreground/50" />
          <p className="mt-4 text-sm font-medium text-foreground">No documents have been shared yet.</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Contact APAS Consulting to request specific reports or deliverables.
          </p>
          <a
            href="mailto:hardeep@apas.ai"
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            <Mail className="h-3.5 w-3.5" />
            hardeep@apas.ai
          </a>
        </div>
      )}

      {!isLoading && documents.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {documents.map(doc => (
            <div key={doc.id} className="flex flex-col rounded-lg border border-border bg-background p-4 shadow-sm">
              <FileText className="h-8 w-8 text-primary" />
              <p className="mt-3 truncate text-sm font-semibold text-foreground">{doc.name}</p>
              <p className="truncate text-xs text-muted-foreground">{doc.folder}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {doc.created_at ? format(new Date(doc.created_at), 'MMM d, yyyy') : '—'}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                asChild
              >
                <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                  Download
                </a>
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
