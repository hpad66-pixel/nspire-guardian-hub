import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { useRespondToRequest, PortalDocumentRequest } from '@/hooks/usePortal';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface RespondToRequestDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: PortalDocumentRequest;
  portalId: string;
}

const REQUEST_TYPE_LABELS: Record<string, string> = {
  document: 'Document Request',
  update: 'Update Request',
  clarification: 'Clarification',
};

const MODULE_LABELS: Record<string, string> = {
  credentials: 'Credentials',
  training: 'Training',
  safety: 'Safety',
  equipment: 'Equipment',
  general: 'General',
};

export function RespondToRequestDrawer({ open, onOpenChange, request, portalId }: RespondToRequestDrawerProps) {
  const [response, setResponse] = useState('');
  const respondMutation = useRespondToRequest();

  function handleFulfill() {
    respondMutation.mutate({
      id: request.id,
      portalId,
      responseMessage: response,
      newStatus: 'fulfilled',
    }, {
      onSuccess: () => onOpenChange(false),
    });
  }

  function handleDecline() {
    respondMutation.mutate({
      id: request.id,
      portalId,
      responseMessage: response || 'Request declined.',
      newStatus: 'declined',
    }, {
      onSuccess: () => onOpenChange(false),
    });
  }

  const createdAgo = formatDistanceToNow(new Date(request.created_at), { addSuffix: true });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Respond to Request</SheetTitle>
          <SheetDescription>Review and respond to your client's request.</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-5">
          {/* Original request */}
          <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex gap-2">
                <Badge variant="secondary">{REQUEST_TYPE_LABELS[request.request_type] ?? request.request_type}</Badge>
                {request.module && (
                  <Badge variant="outline">{MODULE_LABELS[request.module] ?? request.module}</Badge>
                )}
              </div>
              <span className="text-xs text-muted-foreground">{createdAgo}</span>
            </div>

            <div>
              <p className="font-semibold text-sm">{request.subject}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                From: {request.requested_by_name ? `${request.requested_by_name} (${request.requested_by_email})` : request.requested_by_email}
              </p>
            </div>

            <p className="text-sm text-foreground border-t border-border pt-3 leading-relaxed">
              {request.message}
            </p>
          </div>

          {/* Response message */}
          <div className="space-y-1.5">
            <Label htmlFor="response">Your Response</Label>
            <Textarea
              id="response"
              value={response}
              onChange={e => setResponse(e.target.value)}
              placeholder="Type your response to the client..."
              rows={5}
            />
            <p className="text-xs text-muted-foreground">This message will be visible to the client.</p>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2">
            <Button
              onClick={handleFulfill}
              disabled={respondMutation.isPending || !response.trim()}
              className="w-full"
            >
              {respondMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Send Response & Mark Fulfilled
            </Button>
            <Button
              variant="outline"
              onClick={handleDecline}
              disabled={respondMutation.isPending}
              className="w-full text-destructive hover:text-destructive"
            >
              Decline Request
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
