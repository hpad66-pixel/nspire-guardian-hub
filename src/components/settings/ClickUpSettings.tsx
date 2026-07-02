import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, Link2, CheckCircle2, ExternalLink } from 'lucide-react';
import { useClickUpStatus, useConnectClickUp, useDisconnectClickUp } from '@/hooks/useClickUp';

export function ClickUpSettings() {
  const { data: status, isLoading } = useClickUpStatus();
  const connect = useConnectClickUp();
  const disconnect = useDisconnectClickUp();

  const [token, setToken] = useState('');
  const [listId, setListId] = useState('');

  const connected = status?.connected;

  const handleConnect = async () => {
    await connect.mutateAsync({ token: token.trim(), listId: listId.trim() });
    setToken('');
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5" />
              ClickUp
              {connected && <Badge variant="outline" className="gap-1 text-[var(--apas-emerald)] border-[var(--apas-emerald)]/40"><CheckCircle2 className="h-3 w-3" />Connected</Badge>}
            </CardTitle>
            <CardDescription>Push action items to a ClickUp List as tasks.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="text-sm text-muted-foreground">Checking connection…</div>
        ) : connected ? (
          <div className="space-y-4">
            <div className="rounded-lg border bg-card p-4">
              <div className="text-sm">
                <div className="flex justify-between py-1"><span className="text-muted-foreground">Target list</span><span className="font-medium">{status?.listName ?? status?.listId ?? '—'}</span></div>
                {status?.teamName && <div className="flex justify-between py-1"><span className="text-muted-foreground">Space</span><span>{status.teamName}</span></div>}
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Open any action item and choose <span className="font-medium text-foreground">Push to ClickUp</span> to create or update its task.
            </p>
            <Button variant="outline" onClick={() => disconnect.mutate()} disabled={disconnect.isPending}>
              {disconnect.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Disconnect'}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-1.5">
              <Label htmlFor="cu-token">API token</Label>
              <Input id="cu-token" type="password" value={token} onChange={(e) => setToken(e.target.value)} placeholder="pk_..." autoComplete="off" />
              <p className="text-xs text-muted-foreground">
                ClickUp → your avatar → Settings → Apps → Generate a personal API token. It's stored securely on the server and never shown again.
              </p>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="cu-list">List ID</Label>
              <Input id="cu-list" value={listId} onChange={(e) => setListId(e.target.value)} placeholder="901234567" />
              <p className="text-xs text-muted-foreground inline-flex items-center gap-1">
                Open the target List in ClickUp — the number in the URL after <code>/li/</code> or <code>/v/l/</code> is the List ID.
                <a href="https://help.clickup.com/hc/en-us/articles/6303426241687" target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 text-[var(--apas-sapphire)]">docs <ExternalLink className="h-3 w-3" /></a>
              </p>
            </div>
            <Button onClick={handleConnect} disabled={connect.isPending || !token.trim() || !listId.trim()}>
              {connect.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}Connect ClickUp
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
