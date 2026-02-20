import { useState, useEffect } from 'react';
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
import { Calendar, XCircle, Send, Mail, Pencil, X } from 'lucide-react';
import { type RFI, useRespondToRFI, useCloseRFI, useUpdateRFI } from '@/hooks/useRFIs';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
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
  const updateRFI = useUpdateRFI();
  const closeRFI = useCloseRFI();
  
  const [newResponse, setNewResponse] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editedResponse, setEditedResponse] = useState('');
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);

  // Fetch the responder's profile so we can show their name
  const { data: responderProfile } = useQuery({
    queryKey: ['profile', rfi?.responded_by],
    queryFn: async () => {
      if (!rfi?.responded_by) return null;
      const { data } = await supabase
        .from('profiles')
        .select('user_id, full_name, email')
        .eq('user_id', rfi.responded_by)
        .single();
      return data;
    },
    enabled: !!rfi?.responded_by,
    staleTime: 5 * 60 * 1000,
  });

  // Reset edit state when the RFI changes
  useEffect(() => {
    setIsEditing(false);
    setEditedResponse('');
    setNewResponse('');
  }, [rfi?.id]);

  if (!rfi) return null;

  const config = statusConfig[rfi.status];
  const isResponder = user?.id === rfi.responded_by;
  const responderName = responderProfile?.full_name || responderProfile?.email || 'Unknown';

  const handleRespond = async () => {
    if (!user || !newResponse.trim()) return;
    await respondToRFI.mutateAsync({
      id: rfi.id,
      response: newResponse.trim(),
      respondedBy: user.id,
    });
    setNewResponse('');
  };

  const handleStartEdit = () => {
    setEditedResponse(rfi.response ?? '');
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedResponse('');
  };

  const handleSaveEdit = async () => {
    if (!editedResponse.trim()) return;
    await updateRFI.mutateAsync({
      id: rfi.id,
      response: editedResponse.trim(),
    });
    setIsEditing(false);
  };

  const handleClose = async () => {
    await closeRFI.mutateAsync(rfi.id);
  };

  // Build the email HTML for external sharing — includes responder attribution
  const emailContentHtml = `
    <table style="width:100%;border-collapse:collapse;font-size:13px;">
      <tr><td style="padding:8px 12px;border:1px solid #E5E7EB;background:#F8FAFC;font-weight:600;width:140px;">Status</td><td style="padding:8px 12px;border:1px solid #E5E7EB;">${rfi.status.charAt(0).toUpperCase() + rfi.status.slice(1)}</td></tr>
      ${rfi.due_date ? `<tr><td style="padding:8px 12px;border:1px solid #E5E7EB;background:#F8FAFC;font-weight:600;">Due Date</td><td style="padding:8px 12px;border:1px solid #E5E7EB;">${format(new Date(rfi.due_date), 'MMM d, yyyy')}</td></tr>` : ''}
      <tr><td style="padding:8px 12px;border:1px solid #E5E7EB;background:#F8FAFC;font-weight:600;">Question</td><td style="padding:8px 12px;border:1px solid #E5E7EB;">${rfi.question.replace(/\n/g, '<br/>')}</td></tr>
      ${rfi.response ? `
        <tr><td style="padding:8px 12px;border:1px solid #E5E7EB;background:#F0FDF4;font-weight:600;">Response</td><td style="padding:8px 12px;border:1px solid #E5E7EB;">${rfi.response.replace(/\n/g, '<br/>')}</td></tr>
        <tr><td style="padding:8px 12px;border:1px solid #E5E7EB;background:#F8FAFC;font-weight:600;">Responded By</td><td style="padding:8px 12px;border:1px solid #E5E7EB;">${responderName}${rfi.responded_at ? ` &bull; ${format(new Date(rfi.responded_at), 'MMM d, yyyy h:mm a')}` : ''}</td></tr>
      ` : ''}
    </table>
  `;
  
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
          
          {/* Response section */}
          {rfi.response ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-muted-foreground text-xs uppercase tracking-wider">Response</Label>
                {/* Only the person who wrote the response can edit it */}
                {isResponder && !isEditing && rfi.status !== 'closed' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
                    onClick={handleStartEdit}
                  >
                    <Pencil className="h-3 w-3" />
                    Edit
                  </Button>
                )}
              </div>

              {isEditing ? (
                <div className="space-y-2">
                  <Textarea
                    value={editedResponse}
                    onChange={(e) => setEditedResponse(e.target.value)}
                    rows={5}
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={handleSaveEdit}
                      disabled={!editedResponse.trim() || updateRFI.isPending}
                      className="flex-1"
                    >
                      {updateRFI.isPending ? 'Saving...' : 'Save Changes'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleCancelEdit}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-lg border bg-success/5 border-success/20">
                  <p className="whitespace-pre-wrap text-sm">{rfi.response}</p>
                </div>
              )}

              {/* Attribution: who responded and when */}
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span>Responded by</span>
                <span className="font-medium text-foreground">{responderName}</span>
                {rfi.responded_at && (
                  <>
                    <span>·</span>
                    <span>{format(new Date(rfi.responded_at), 'MMM d, yyyy h:mm a')}</span>
                  </>
                )}
              </div>
            </div>
          ) : rfi.status !== 'closed' ? (
            <div className="space-y-3">
              <Label className="text-muted-foreground text-xs uppercase tracking-wider">Add Response</Label>
              <Textarea
                value={newResponse}
                onChange={(e) => setNewResponse(e.target.value)}
                placeholder="Type your response..."
                rows={4}
              />
              <Button
                onClick={handleRespond}
                disabled={!newResponse.trim() || respondToRFI.isPending}
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
        contentHtml={emailContentHtml}
      />
    </Sheet>
  );
}
