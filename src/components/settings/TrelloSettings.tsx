import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { CheckCircle2, ExternalLink, Loader2, Trello as TrelloIcon } from 'lucide-react';
import {
  useConnectTrello,
  useDisconnectTrello,
  useSetTrelloAutoPush,
  useTrelloLists,
  useTrelloStatus,
  type TrelloList,
} from '@/hooks/useTrello';

export function TrelloSettings() {
  const { data: status, isLoading } = useTrelloStatus();
  const loadLists = useTrelloLists();
  const connect = useConnectTrello();
  const disconnect = useDisconnectTrello();
  const setAutoPush = useSetTrelloAutoPush();
  const [apiKey, setApiKey] = useState('');
  const [token, setToken] = useState('');
  const [lists, setLists] = useState<TrelloList[] | null>(null);
  const [selectedListId, setSelectedListId] = useState('');

  const authorizationUrl = apiKey.trim()
    ? `https://trello.com/1/authorize?expiration=never&name=projOS&scope=read,write&response_type=token&key=${encodeURIComponent(apiKey.trim())}`
    : null;

  const handleLoadLists = async () => {
    const result = await loadLists.mutateAsync({ apiKey: apiKey.trim(), token: token.trim() });
    setLists(result.lists ?? []);
  };

  const handleConnect = async () => {
    await connect.mutateAsync({ apiKey: apiKey.trim(), token: token.trim(), listId: selectedListId });
    setApiKey(''); setToken(''); setLists(null); setSelectedListId('');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrelloIcon className="h-5 w-5 text-[#0C66E4]" />
          Trello
          {status?.connected && (
            <Badge variant="outline" className="gap-1 text-[var(--apas-emerald)] border-[var(--apas-emerald)]/40">
              <CheckCircle2 className="h-3 w-3" /> Connected
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Mirror project instructions, owners, due dates, CC followers, and discussion updates into Trello cards.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Checking Trello connection…</p>
        ) : status?.connected ? (
          <>
            <div className="rounded-lg border p-4 text-sm space-y-2">
              <div className="flex justify-between gap-4"><span className="text-muted-foreground">Trello account</span><span className="font-medium">{status.memberName || 'Connected'}</span></div>
              <div className="flex justify-between gap-4"><span className="text-muted-foreground">Default board</span><span>{status.boardName || '—'}</span></div>
              <div className="flex justify-between gap-4"><span className="text-muted-foreground">Default list</span><span>{status.listName || '—'}</span></div>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3 gap-4">
              <div>
                <p className="text-sm font-medium">Automatically create Trello cards</p>
                <p className="text-xs text-muted-foreground">New project instructions go to Trello immediately. Each project may choose its own list.</p>
              </div>
              <Switch checked={Boolean(status.autoPush)} onCheckedChange={(value) => setAutoPush.mutate(value)} disabled={setAutoPush.isPending} />
            </div>
            <p className="text-xs text-muted-foreground">
              Team members matched to Trello board members are added to the card, so Trello can deliver its normal phone and desktop notifications.
            </p>
            <Button variant="outline" onClick={() => disconnect.mutate()} disabled={disconnect.isPending}>
              {disconnect.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}Disconnect Trello
            </Button>
          </>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-1.5">
              <Label htmlFor="trello-key">Trello API key</Label>
              <Input id="trello-key" value={apiKey} onChange={(event) => { setApiKey(event.target.value); setLists(null); }} autoComplete="off" spellCheck={false} className="font-mono text-xs" />
              <p className="text-xs text-muted-foreground">
                Create or open your Trello Power-Up under <a href="https://trello.com/power-ups/admin" target="_blank" rel="noreferrer" className="text-[var(--apas-sapphire)] underline underline-offset-2">Trello Power-Up Admin</a>, then copy its API key.
              </p>
            </div>
            <div className="grid gap-1.5">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="trello-token">Trello user token</Label>
                {authorizationUrl && (
                  <a href={authorizationUrl} target="_blank" rel="noreferrer" className="text-xs inline-flex items-center gap-1 text-[var(--apas-sapphire)] hover:underline">
                    Authorize projOS <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
              <Input id="trello-token" type="password" value={token} onChange={(event) => { setToken(event.target.value); setLists(null); }} autoComplete="new-password" spellCheck={false} className="font-mono text-xs" />
              <p className="text-xs text-muted-foreground">Stored only on the server. projOS never exposes it back to the browser.</p>
            </div>

            {lists === null ? (
              <Button variant="outline" onClick={handleLoadLists} disabled={!apiKey.trim() || !token.trim() || loadLists.isPending}>
                {loadLists.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}Load my boards and lists
              </Button>
            ) : (
              <div className="space-y-3">
                <div className="grid gap-1.5">
                  <Label>Default Trello list</Label>
                  <Select value={selectedListId} onValueChange={setSelectedListId}>
                    <SelectTrigger><SelectValue placeholder={lists.length ? 'Choose a board and list' : 'No open lists found'} /></SelectTrigger>
                    <SelectContent>{lists.map((list) => <SelectItem key={list.id} value={list.id}>{list.path}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <Button onClick={handleConnect} disabled={!selectedListId || connect.isPending}>
                  {connect.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}Connect Trello
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
