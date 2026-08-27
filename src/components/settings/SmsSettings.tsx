import { useState } from 'react';
import { MessageSquareText, CheckCircle2, Loader2, ShieldCheck, Copy, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useConnectSms, useDisconnectSms, useSmsStatus } from '@/hooks/useProjectSms';

export function SmsSettings() {
  const { data: status, isLoading } = useSmsStatus();
  const connect = useConnectSms();
  const disconnect = useDisconnectSms();
  const [accountSid, setAccountSid] = useState('');
  const [authToken, setAuthToken] = useState('');
  const [fromNumber, setFromNumber] = useState('');
  const [messagingServiceSid, setMessagingServiceSid] = useState('');

  const handleConnect = async () => {
    try {
      await connect.mutateAsync({ accountSid, authToken, fromNumber, messagingServiceSid });
      setAccountSid(''); setAuthToken(''); setFromNumber(''); setMessagingServiceSid('');
      toast.success('Project texting connected.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not connect project texting.');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquareText className="h-5 w-5 text-[#F22F46]" />
          Project Texting
          {status?.connected && <Badge variant="outline" className="gap-1 border-emerald-500/40 text-emerald-700"><CheckCircle2 className="h-3 w-3" /> Connected</Badge>}
        </CardTitle>
        <CardDescription>
          Send texts to attached CRM contacts from a project and keep replies and delivery status in its correspondence record.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Checking texting connection…</p>
        ) : status?.connected ? (
          <>
            <div className="rounded-lg border p-4 text-sm space-y-2">
              <div className="flex justify-between gap-4"><span className="text-muted-foreground">Sender</span><span className="font-medium">{status.fromNumber || status.messagingServiceSid}</span></div>
              <div className="flex justify-between gap-4"><span className="text-muted-foreground">Incoming replies</span><span className={status.inboundConfigured ? 'font-medium text-emerald-700' : 'font-medium text-amber-700'}>{status.inboundConfigured ? 'Automatically routed to projects' : 'Needs webhook setup'}</span></div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground"><ShieldCheck className="h-3.5 w-3.5" /> Credentials are stored server-side and never exposed to the browser.</div>
            </div>
            {!status.inboundConfigured && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
                <div className="flex items-start gap-2"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><div><p className="font-medium">Outgoing texts work; connect this webhook in Twilio for replies.</p><p className="mt-0.5 text-xs">{status.inboundError}</p></div></div>
                <div className="mt-2 flex items-center gap-2 rounded border bg-white p-2"><code className="min-w-0 flex-1 truncate text-[11px]">{status.inboundWebhookUrl}</code><Button type="button" size="sm" variant="ghost" className="h-7 px-2" onClick={async () => { await navigator.clipboard.writeText(status.inboundWebhookUrl); toast.success('Webhook URL copied.'); }}><Copy className="h-3.5 w-3.5" /></Button></div>
              </div>
            )}
            <Button variant="outline" disabled={disconnect.isPending} onClick={async () => {
              try { await disconnect.mutateAsync(); toast.success('Project texting disconnected.'); }
              catch (error) { toast.error(error instanceof Error ? error.message : 'Could not disconnect.'); }
            }}>
              {disconnect.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}Disconnect
            </Button>
          </>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5"><Label htmlFor="twilio-sid">Twilio Account SID</Label><Input id="twilio-sid" value={accountSid} onChange={(event) => setAccountSid(event.target.value)} autoComplete="off" className="font-mono text-xs" placeholder="AC…" /></div>
              <div className="grid gap-1.5"><Label htmlFor="twilio-token">Twilio auth token</Label><Input id="twilio-token" type="password" value={authToken} onChange={(event) => setAuthToken(event.target.value)} autoComplete="new-password" className="font-mono text-xs" /></div>
              <div className="grid gap-1.5"><Label htmlFor="twilio-number">Twilio phone number</Label><Input id="twilio-number" type="tel" value={fromNumber} onChange={(event) => setFromNumber(event.target.value)} placeholder="+1 305 555 0123" /></div>
              <div className="grid gap-1.5"><Label htmlFor="twilio-service">Messaging Service SID (optional)</Label><Input id="twilio-service" value={messagingServiceSid} onChange={(event) => setMessagingServiceSid(event.target.value)} className="font-mono text-xs" placeholder="MG…" /></div>
            </div>
            <p className="text-xs text-muted-foreground">Use either a Twilio phone number or a Messaging Service SID. Configure the number's incoming-message webhook to the projOS SMS webhook shown in your deployment documentation.</p>
            <Button onClick={handleConnect} disabled={connect.isPending || !accountSid.trim() || !authToken.trim() || (!fromNumber.trim() && !messagingServiceSid.trim())}>
              {connect.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}Connect project texting
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
