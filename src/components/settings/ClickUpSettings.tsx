import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Loader2, Link2, CheckCircle2, ExternalLink } from 'lucide-react';
import { useClickUpStatus, useConnectClickUp, useDisconnectClickUp, useClickUpLists, useSetClickUpAutoPush, useSetClickUpSync, type ClickUpList } from '@/hooks/useClickUp';

export function ClickUpSettings() {
  const { data: status, isLoading } = useClickUpStatus();
  const connect = useConnectClickUp();
  const disconnect = useDisconnectClickUp();
  const loadLists = useClickUpLists();
  const setAutoPush = useSetClickUpAutoPush();
  const setSync = useSetClickUpSync();

  const [token, setToken] = useState('');
  const [lists, setLists] = useState<ClickUpList[] | null>(null);
  const [selectedListId, setSelectedListId] = useState('');
  const [manualMode, setManualMode] = useState(false);
  const [manualListId, setManualListId] = useState('');

  const connected = status?.connected;
  const tokenLooksValid = token.trim().startsWith('pk_');

  const handleLoadLists = async () => {
    const res = await loadLists.mutateAsync(token.trim());
    setLists(res.lists ?? []);
    setManualMode((res.lists ?? []).length === 0);
  };

  const handleConnect = async () => {
    const listId = manualMode ? manualListId.trim() : selectedListId;
    await connect.mutateAsync({ token: token.trim(), listId });
    setToken(''); setLists(null); setSelectedListId(''); setManualListId('');
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
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <div className="text-sm font-medium">Auto-push new action items</div>
                <div className="text-xs text-muted-foreground">Create a ClickUp task automatically whenever an action item is added.</div>
              </div>
              <Switch checked={!!status?.autoPush} onCheckedChange={(v) => setAutoPush.mutate(v)} disabled={setAutoPush.isPending} />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <div className="text-sm font-medium">Two-way sync</div>
                <div className="text-xs text-muted-foreground">Mirror ClickUp status changes back into projOS (needs a ClickUp plan with webhooks).</div>
              </div>
              <Switch checked={!!status?.syncEnabled} onCheckedChange={(v) => setSync.mutate(v)} disabled={setSync.isPending} />
            </div>
            <p className="text-sm text-muted-foreground">
              Open any action item and choose <span className="font-medium text-foreground">Push to ClickUp</span> to create or update its task. Each consulting project can target its own list from the Action Items tab.
            </p>
            <Button variant="outline" onClick={() => disconnect.mutate()} disabled={disconnect.isPending}>
              {disconnect.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Disconnect'}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-1.5">
              <Label htmlFor="cu-token">API token</Label>
              {/* text (not password) + autofill off so a password manager can't
                  overwrite the pasted value — that produces ClickUp "token not found". */}
              <Input
                id="cu-token"
                name="clickup-api-token"
                type="text"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="pk_..."
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                className="font-mono text-xs"
              />
              <p className="text-xs text-muted-foreground">
                ClickUp → your avatar → Settings → Apps → Generate a personal API token (it starts with <code>pk_</code>). Stored securely on the server. {token && !token.startsWith('pk_') ? <span className="text-[var(--apas-rose)]">This value doesn’t start with “pk_” — that’s not a personal API token.</span> : null}
              </p>
            </div>
            {lists === null ? (
              <Button variant="outline" onClick={handleLoadLists} disabled={loadLists.isPending || !tokenLooksValid}>
                {loadLists.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}Load my lists
              </Button>
            ) : (
              <div className="space-y-4">
                {!manualMode ? (
                  <div className="grid gap-1.5">
                    <Label>Target list</Label>
                    <Select value={selectedListId} onValueChange={setSelectedListId}>
                      <SelectTrigger><SelectValue placeholder={lists.length ? 'Choose a ClickUp list' : 'No lists found'} /></SelectTrigger>
                      <SelectContent>
                        {lists.map((l) => <SelectItem key={l.id} value={l.id}>{l.path}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <button type="button" className="text-xs text-muted-foreground text-left underline w-fit" onClick={() => setManualMode(true)}>Enter a List ID manually instead</button>
                  </div>
                ) : (
                  <div className="grid gap-1.5">
                    <Label htmlFor="cu-list">List ID</Label>
                    <Input id="cu-list" value={manualListId} onChange={(e) => setManualListId(e.target.value)} placeholder="901234567" className="font-mono text-xs" />
                    <p className="text-xs text-muted-foreground inline-flex items-center gap-1">
                      In a list URL, the number after <code>/li/</code> is the List ID (the one after <code>/v/l/</code> is a view, not a list).
                      <a href="https://help.clickup.com/hc/en-us/articles/6303426241687" target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 text-[var(--apas-sapphire)]">docs <ExternalLink className="h-3 w-3" /></a>
                    </p>
                    {lists.length > 0 && <button type="button" className="text-xs text-muted-foreground text-left underline w-fit" onClick={() => setManualMode(false)}>Pick from my lists instead</button>}
                  </div>
                )}
                <Button onClick={handleConnect} disabled={connect.isPending || (manualMode ? !manualListId.trim() : !selectedListId)}>
                  {connect.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}Connect ClickUp
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
