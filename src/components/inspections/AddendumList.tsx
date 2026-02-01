import { useInspectionAddendums } from '@/hooks/useInspectionAddendums';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Paperclip, FileText, User } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

interface AddendumListProps {
  inspectionId: string;
}

export function AddendumList({ inspectionId }: AddendumListProps) {
  const { data: addendums, isLoading } = useInspectionAddendums(inspectionId);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (!addendums || addendums.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Addendums ({addendums.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {addendums.map((addendum, index) => (
          <div 
            key={addendum.id} 
            className="border-l-4 border-primary/30 pl-4 py-2 bg-muted/30 rounded-r-lg"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <User className="h-3 w-3" />
                <span>
                  {addendum.profile?.full_name || addendum.profile?.email || 'Unknown'}
                </span>
                <span>•</span>
                <span>
                  {format(parseISO(addendum.created_at), 'MMM d, yyyy h:mm a')}
                </span>
              </div>
              <span className="text-xs bg-muted px-2 py-0.5 rounded">
                Addendum #{index + 1}
              </span>
            </div>
            
            <p className="text-sm whitespace-pre-wrap">{addendum.content}</p>
            
            {addendum.attachments && addendum.attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {addendum.attachments.map((url, i) => (
                  <a
                    key={i}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 px-2 py-1 bg-background border rounded text-xs hover:bg-muted transition-colors"
                  >
                    <Paperclip className="h-3 w-3" />
                    Attachment {i + 1}
                  </a>
                ))}
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
