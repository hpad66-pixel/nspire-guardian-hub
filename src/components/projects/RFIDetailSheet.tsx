import { useState } from 'react';
import { format } from 'date-fns';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { Calendar, User, MessageSquare, CheckCircle, XCircle, Clock, Send, Mail } from 'lucide-react';
import { type RFI, useRespondToRFI, useCloseRFI } from '@/hooks/useRFIs';
import { useAuth } from '@/hooks/useAuth';
import { SendExternalEmailDialog } from './SendExternalEmailDialog';

interface RFIDetailSheetProps {
  rfi: RFI | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectName?: string;
}

const statusConfig = {
  open: { label: 'Open', variant: 'outline' as const, className: 'border-warning text-warning' },
  pending: { label: 'Pending', variant: 'secondary' as const, className: 'bg-blue-500/10 text-blue-500' },
  answered: { label: 'Answered', variant: 'default' as const, className: 'bg-success text-success-foreground' },
  closed: { label: 'Closed', variant: 'secondary' as const, className: '' },
};

export function RFIDetailSheet({ rfi, open, onOpenChange, projectName = '' }: RFIDetailSheetProps) {
  const { user } = useAuth();
  const respondToRFI = useRespondToRFI();
  const closeRFI = useCloseRFI();
  
  const [response, setResponse] = useState('');
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  
  if (!rfi) return null;
  
  const config = statusConfig[rfi.status];
  
  const handleRespond = async () => {
    if (!user || !response.trim()) return;
    
    await respondToRFI.mutateAsync({
      id: rfi.id,
      response,
      respondedBy: user.id,
    });
    
    setResponse('');
  };
  
  const handleClose = async () => {
    await closeRFI.mutateAsync(rfi.id);
  };
  
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="pb-4">
          <div className="flex items-center gap-2">
            <span className="font-mono text-muted-foreground">RFI #{rfi.rfi_number}</span>
            <Badge variant={config.variant} className={config.className}>
              {config.label}
            </Badge>
          </div>
          <SheetTitle className="text-xl">{rfi.subject}</SheetTitle>
          <SheetDescription>Request for Information</SheetDescription>
        </SheetHeader>
        
        <div className="space-y-6">
          {/* Due Date */}
          {rfi.due_date && (
            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs uppercase tracking-wider">Due Date</Label>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>{format(new Date(rfi.due_date), 'MMM d, yyyy')}</span>
              </div>
            </div>
          )}
          
          {/* Question */}
          <div className="space-y-2">
            <Label className="text-muted-foreground text-xs uppercase tracking-wider">Question</Label>
            <div className="p-4 rounded-lg border bg-muted/30">
              <p className="whitespace-pre-wrap">{rfi.question}</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Submitted on {format(new Date(rfi.created_at), 'MMM d, yyyy h:mm a')}
            </p>
          </div>
          
          <Separator />
          
          {/* Response */}
          {rfi.response ? (
            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs uppercase tracking-wider">Response</Label>
              <div className="p-4 rounded-lg border bg-success/5 border-success/20">
                <p className="whitespace-pre-wrap">{rfi.response}</p>
              </div>
              {rfi.responded_at && (
                <p className="text-xs text-muted-foreground">
                  Responded on {format(new Date(rfi.responded_at), 'MMM d, yyyy h:mm a')}
                </p>
              )}
            </div>
          ) : rfi.status !== 'closed' ? (
            <div className="space-y-3">
              <Label className="text-muted-foreground text-xs uppercase tracking-wider">Add Response</Label>
              <Textarea
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                placeholder="Type your response..."
                rows={4}
              />
              <Button
                onClick={handleRespond}
                disabled={!response.trim() || respondToRFI.isPending}
                className="w-full"
              >
                <Send className="h-4 w-4 mr-2" />
                {respondToRFI.isPending ? 'Submitting...' : 'Submit Response'}
              </Button>
            </div>
          ) : null}
          
          <Separator />
          
          {/* Actions */}
          <div className="space-y-3">
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => setEmailDialogOpen(true)}
            >
              <Mail className="h-4 w-4" />
              Email Externally
            </Button>
            {rfi.status !== 'closed' && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="w-full">
                    <XCircle className="h-4 w-4 mr-2" />
                    Close RFI
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Close RFI</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to close this RFI? This indicates the question has been resolved.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleClose}>Close RFI</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>
      </SheetContent>

      <SendExternalEmailDialog
        open={emailDialogOpen}
        onOpenChange={setEmailDialogOpen}
        documentType="rfi"
        documentTitle={`RFI #${rfi.rfi_number} — ${rfi.subject}`}
        documentId={rfi.id}
        projectName={projectName}
        contentHtml={`
          <table style="width:100%;border-collapse:collapse;font-size:13px;">
            <tr><td style="padding:8px 12px;border:1px solid #E5E7EB;background:#F8FAFC;font-weight:600;width:140px;">Status</td><td style="padding:8px 12px;border:1px solid #E5E7EB;">${rfi.status}</td></tr>
            ${rfi.due_date ? `<tr><td style="padding:8px 12px;border:1px solid #E5E7EB;background:#F8FAFC;font-weight:600;">Due Date</td><td style="padding:8px 12px;border:1px solid #E5E7EB;">${rfi.due_date}</td></tr>` : ''}
            <tr><td style="padding:8px 12px;border:1px solid #E5E7EB;background:#F8FAFC;font-weight:600;">Question</td><td style="padding:8px 12px;border:1px solid #E5E7EB;">${rfi.question}</td></tr>
            ${rfi.response ? `<tr><td style="padding:8px 12px;border:1px solid #E5E7EB;background:#F8FAFC;font-weight:600;">Response</td><td style="padding:8px 12px;border:1px solid #E5E7EB;">${rfi.response}</td></tr>` : ''}
          </table>
        `}
      />
    </Sheet>
  );
}
