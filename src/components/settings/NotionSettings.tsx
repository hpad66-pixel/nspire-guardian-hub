import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, Copy, Database, ExternalLink, Loader2, Search, Unlink } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useNotionConnection, type NotionSearchResult } from '@/hooks/useNotionConnection';

type ClientOption = { id: string; name: string };
type ProjectOption = { id: string; name: string; client_id: string | null };

const notionCallbackUrl = 'https://xlfwzqpixlrnntzqhvcm.supabase.co/functions/v1/notion-oauth-callback';

export function NotionSettings() {
  const notion = useNotionConnection();
  const [searchParams, setSearchParams] = useSearchParams();
  const connected = notion.status.data?.connected;
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState<'all' | 'page' | 'database'>('all');
  const [selectedSource, setSelectedSource] = useState<NotionSearchResult | null>(null);
  const [clientId, setClientId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [purpose, setPurpose] = useState('meetings');

  const clients = useQuery({
    queryKey: ['notion-clients'],
    queryFn: async () => {
      const { data, error } = await supabase.from('clients').select('id,name').order('name');
      if (error) throw error;
      return (data ?? []) as ClientOption[];
    },
  });

  const projects = useQuery({
    queryKey: ['notion-projects'],
    queryFn: async () => {
      const { data, error } = await supabase.from('projects').select('id,name,client_id').is('deleted_at', null).order('name');
      if (error) throw error;
      return (data ?? []) as ProjectOption[];
    },
  });

  const visibleProjects = useMemo(() => {
    if (!clientId) return projects.data ?? [];
    return (projects.data ?? []).filter(project => project.client_id === clientId);
  }, [clientId, projects.data]);

  const searchResults = notion.search.data?.results ?? [];
  const mappings = notion.status.data?.mappings ?? [];
  const connectError = notion.connect.error instanceof Error ? notion.connect.error.message : null;
  const statusError = notion.status.error instanceof Error ? notion.status.error.message : null;
  const setupError = connectError || statusError;

  useEffect(() => {
    const callbackStatus = searchParams.get('notion');
    if (!callbackStatus) return;

    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('notion');
    nextParams.set('tab', 'integrations');
    setSearchParams(nextParams, { replace: true });

    if (callbackStatus === 'connected') {
      toast.success('Notion connected. You can now map shared pages and databases to clients or projects.');
      void notion.status.refetch();
      return;
    }

    toast.error('Notion did not connect. Check the Notion OAuth app callback URL and Supabase secrets.');
  }, [notion.status, searchParams, setSearchParams]);

  const handleConnect = () => {
    notion.connect.mutate('/settings?tab=integrations', {
      onError: error => {
        const message = error instanceof Error ? error.message : 'Could not start the Notion connection.';
        toast.error(message);
      },
    });
  };

  const handleCopyCallbackUrl = async () => {
    await navigator.clipboard.writeText(notionCallbackUrl);
    toast.success('Notion callback URL copied.');
  };
  const handleSearch = async () => {
    const result = await notion.search.mutateAsync({ query, kind });
    if (!result.results.length) toast.info('No shared Notion pages or databases were found. In Notion, share the page/database with the Proj OS connection and try again.');
  };
  const handleMap = async () => {
    if (!selectedSource) {
      toast.error('Choose a Notion page or database first.');
      return;
    }
    if (!clientId && !projectId) {
      toast.error('Choose a Proj OS client or project first.');
      return;
    }
    await notion.map.mutateAsync({ clientId, projectId, mappingPurpose: purpose, source: selectedSource });
    toast.success('Notion source mapped to Proj OS. Sync will remain review-first before anything reaches the client portal.');
    setSelectedSource(null);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-[var(--apas-sapphire)]" />
              Notion
              {connected && (
                <Badge variant="outline" className="gap-1 border-[var(--apas-emerald)]/40 text-[var(--apas-emerald)]">
                  <CheckCircle2 className="h-3 w-3" /> Connected
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Connect your own Notion workspace, map selected pages or databases into projects, and prepare reviewed meeting or comment workflows.
            </CardDescription>
          </div>
          {connected ? (
            <Button variant="outline" onClick={() => notion.disconnect.mutate()} disabled={notion.disconnect.isPending}>
              {notion.disconnect.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Unlink className="mr-2 h-4 w-4" />}
              Disconnect
            </Button>
          ) : (
            <Button onClick={handleConnect} disabled={notion.connect.isPending || notion.status.isLoading}>
              {notion.connect.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Connect Notion
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {!connected && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-50 p-4 text-sm text-amber-950 dark:bg-amber-950/20 dark:text-amber-100">
            <div className="flex gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
              <div className="space-y-3">
                <div>
                  <p className="font-semibold">Notion setup check</p>
                  <p className="mt-1 text-amber-900/80 dark:text-amber-100/80">
                    If Connect Notion does not open the Notion consent screen, production is missing the Notion OAuth client ID or secret.
                  </p>
                </div>
                {setupError && (
                  <p className="rounded-lg border border-amber-500/20 bg-white/60 px-3 py-2 font-mono text-xs text-amber-950 dark:bg-black/20 dark:text-amber-100">
                    {setupError}
                  </p>
                )}
                <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-center">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-200">Required Notion redirect URI</p>
                    <p className="break-all font-mono text-xs text-amber-950 dark:text-amber-100">{notionCallbackUrl}</p>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={handleCopyCallbackUrl} className="border-amber-500/30 bg-white/70 text-amber-950 hover:bg-white dark:bg-amber-950/40 dark:text-amber-50">
                    <Copy className="mr-2 h-4 w-4" />
                    Copy
                  </Button>
                </div>
                <p className="text-xs text-amber-900/80 dark:text-amber-100/75">
                  Supabase secrets needed: <span className="font-mono">NOTION_OAUTH_CLIENT_ID</span> and <span className="font-mono">NOTION_OAUTH_CLIENT_SECRET</span>.
                </p>
              </div>
            </div>
          </div>
        )}
        {notion.status.isLoading ? (
          <p className="text-sm text-muted-foreground">Checking Notion connection...</p>
        ) : connected ? (
          <>
            <div className="rounded-lg border bg-card p-4 text-sm">
              <div className="flex justify-between gap-4 py-1">
                <span className="text-muted-foreground">Workspace</span>
                <span className="font-medium">{notion.status.data?.connection?.workspace_name || 'Connected Notion workspace'}</span>
              </div>
              <div className="flex justify-between gap-4 py-1">
                <span className="text-muted-foreground">Status</span>
                <span className="capitalize">{notion.status.data?.connection?.status || 'active'}</span>
              </div>
            </div>

            <div className="rounded-lg border p-4 space-y-4">
              <div>
                <p className="text-sm font-medium">Map a Notion source to Proj OS</p>
                <p className="text-xs text-muted-foreground">
                  Search only returns pages and databases the user selected in Notion. Mapping creates the project boundary before sync or review.
                </p>
              </div>
              <div className="grid gap-3 lg:grid-cols-[1fr_150px_auto]">
                <Input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search shared Notion sources" />
                <Select value={kind} onValueChange={value => setKind(value as typeof kind)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Pages and databases</SelectItem>
                    <SelectItem value="page">Pages only</SelectItem>
                    <SelectItem value="database">Databases only</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={handleSearch} disabled={notion.search.isPending}>
                  {notion.search.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                  Search
                </Button>
              </div>

              {searchResults.length > 0 && (
                <div className="grid gap-2">
                  {searchResults.map(source => (
                    <button
                      key={source.id}
                      type="button"
                      aria-pressed={selectedSource?.id === source.id}
                      onClick={() => setSelectedSource(source)}
                      className="rounded-lg border p-3 text-left text-sm transition hover:bg-muted/40 aria-pressed:border-primary aria-pressed:bg-primary/5"
                    >
                      <span className="font-medium">{source.title}</span>
                      <span className="ml-2 text-xs uppercase tracking-wide text-muted-foreground">{source.object}</span>
                      {source.url ? <ExternalLink className="ml-2 inline h-3 w-3 text-muted-foreground" /> : null}
                    </button>
                  ))}
                </div>
              )}

              <div className="grid gap-3 md:grid-cols-3">
                <div className="grid gap-1.5">
                  <Label>Client</Label>
                  <Select value={clientId || 'none'} onValueChange={value => { setClientId(value === 'none' ? '' : value); setProjectId(''); }}>
                    <SelectTrigger><SelectValue placeholder="Optional client" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No client</SelectItem>
                      {(clients.data ?? []).map(client => <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label>Project</Label>
                  <Select value={projectId || 'none'} onValueChange={value => setProjectId(value === 'none' ? '' : value)}>
                    <SelectTrigger><SelectValue placeholder="Optional project" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No project</SelectItem>
                      {visibleProjects.map(project => <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label>Purpose</Label>
                  <Select value={purpose} onValueChange={setPurpose}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="meetings">Meetings</SelectItem>
                      <SelectItem value="documents">Documents</SelectItem>
                      <SelectItem value="tasks">Tasks</SelectItem>
                      <SelectItem value="knowledge">Knowledge</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={handleMap} disabled={!selectedSource || (!clientId && !projectId) || notion.map.isPending}>
                {notion.map.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save mapping
              </Button>
            </div>

            <div className="rounded-lg border bg-muted/20 p-4">
              <p className="text-sm font-medium">Current mappings</p>
              {mappings.length ? (
                <div className="mt-3 grid gap-2">
                  {mappings.map(mapping => (
                    <div key={mapping.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-card p-3 text-sm">
                      <div>
                        <p className="font-medium">{mapping.notion_title}</p>
                        <p className="text-xs text-muted-foreground">{mapping.mapping_purpose} · {mapping.notion_object_type} · {mapping.status}</p>
                      </div>
                      {mapping.last_synced_at ? <Badge variant="outline">Synced {new Date(mapping.last_synced_at).toLocaleDateString()}</Badge> : <Badge variant="secondary">Not synced</Badge>}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">No Notion sources mapped yet.</p>
              )}
            </div>
          </>
        ) : (
          <div className="rounded-lg border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground">
            Connect Notion to let each user share selected pages or databases into Proj OS. Content and comments stay governed by Notion selection plus Proj OS review before anything becomes client visible.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
