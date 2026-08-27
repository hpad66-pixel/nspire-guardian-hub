import { useEffect, useState } from 'react';
import { MessageSquareText, Loader2, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useSendProjectSms, useSmsStatus } from '@/hooks/useProjectSms';

export interface SmsRecipient {
  contactId?: string;
  recipientUserId?: string;
  name: string;
  phone: string | null;
  companyName?: string | null;
}

export function ProjectSmsComposer({
  open, onOpenChange, projectId, projectName, recipient,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectName: string;
  recipient: SmsRecipient | null;
}) {
  const navigate = useNavigate();
  const [message, setMessage] = useState('');
  const status = useSmsStatus();
  const send = useSendProjectSms(projectId);

  useEffect(() => { if (open) setMessage(''); }, [open, recipient?.contactId, recipient?.recipientUserId]);

  const handleSend = async () => {
    if (!recipient) return;
    try {
      await send.mutateAsync({ contactId: recipient.contactId, recipientUserId: recipient.recipientUserId, message });
      toast.success(`Text sent to ${recipient.name} and saved to ${projectName}.`);
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Text could not be sent.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><MessageSquareText className="h-5 w-5 text-[#F22F46]" /> Text project contact</DialogTitle>
          <DialogDescription>Sent from the project and recorded in Correspondence.</DialogDescription>
        </DialogHeader>
        {recipient && (
          <div className="space-y-4">
            <div className="rounded-xl border bg-muted/30 p-3">
              <div className="flex items-center gap-2"><span className="font-medium">{recipient.name}</span><Badge variant="outline">No login required</Badge></div>
              <p className="text-xs text-muted-foreground mt-1">{[recipient.companyName, recipient.phone].filter(Boolean).join(' · ') || 'No mobile number'}</p>
            </div>
            {!status.isLoading && !status.data?.connected && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                Connect Twilio once in Settings → Integrations to send and record project texts.
              </div>
            )}
            <div>
              <Textarea value={message} onChange={(event) => setMessage(event.target.value.slice(0, 1600))} rows={7} placeholder={`Write an update to ${recipient.name}…`} />
              <div className="mt-1 text-right text-xs text-muted-foreground">{message.length} / 1,600</div>
            </div>
          </div>
        )}
        <DialogFooter className="gap-2">
          {!status.isLoading && !status.data?.connected && <Button variant="outline" onClick={() => navigate('/settings')}><Settings className="mr-1.5 h-4 w-4" />Open Settings</Button>}
          <Button onClick={handleSend} disabled={!recipient?.phone || !message.trim() || send.isPending || !status.data?.connected}>
            {send.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <MessageSquareText className="mr-1.5 h-4 w-4" />}Send & record
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
