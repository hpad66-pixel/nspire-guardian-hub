import { useState } from 'react';
import { useParams, useSearchParams, Navigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  ExternalLink, Copy, Settings, Archive, Loader2, Users, FileText,
  Activity, Plus, MoreHorizontal, CheckCircle2, Clock, XCircle, AlertCircle
} from 'lucide-react';
import {
  usePortal, usePortalAccess, usePortalRequests, usePortalActivity,
  useUpdatePortal, useInviteContact, useRevokeAccess, ClientPortal
} from '@/hooks/usePortal';
import { RespondToRequestDrawer } from '@/components/portals/RespondToRequestDrawer';
import { ManageExclusionsDrawer } from '@/components/portals/ManageExclusionsDrawer';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-500',
  draft: 'bg-amber-400',
  archived: 'bg-muted-foreground',
};

const MODULE_CONFIG = [
  { key: 'credentials', label: 'Credentials & Licenses', icon: '🏆' },
  { key: 'training', label: 'Training Records', icon: '🎓' },
  { key: 'safety', label: 'Safety Records', icon: '⚠️' },
  { key: 'equipment', label: 'Equipment & Fleet', icon: '🚛' },
];

const REQUEST_STATUS_ICON: Record<string, React.ReactNode> = {
  pending: <AlertCircle className="h-4 w-4 text-amber-500" />,
  in_review: <Clock className="h-4 w-4 text-blue-500" />,
  fulfilled: <CheckCircle2 className="h-4 w-4 text-green-500" />,
  declined: <XCircle className="h-4 w-4 text-destructive" />,
};

export default function PortalManagePage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get('tab') || 'overview';

  const { data: portal, isLoading } = usePortal(id);
  const { data: contacts = [] } = usePortalAccess(id);
  const { data: requests = [] } = usePortalRequests(id);
  const { data: activity = [] } = usePortalActivity(id);
  const updatePortal = useUpdatePortal();
  const inviteContact = useInviteContact(id!);
  const revokeAccess = useRevokeAccess();

  const [respondingTo, setRespondingTo] = useState<string | null>(null);
  const [exclusionsModule, setExclusionsModule] = useState<string | null>(null);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteCompany, setInviteCompany] = useState('');
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [requestFilter, setRequestFilter] = useState('all');

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }
  if (!portal) return <Navigate to="/portals" replace />;

  const portalUrl = `${window.location.origin}/portal/${portal.portal_slug}`;
  const pendingRequests = requests.filter(r => r.status === 'pending');

  function toggleSharedModule(module: string, enabled: boolean) {
    const modules = enabled
      ? [...portal.shared_modules, module]
      : portal.shared_modules.filter(m => m !== module);
    updatePortal.mutate({ id: portal.id, updates: { shared_modules: modules } });
  }

  function handleInvite() {
    if (!inviteEmail.trim()) return;
    inviteContact.mutate({ email: inviteEmail.trim(), name: inviteName || undefined, company: inviteCompany || undefined }, {
      onSuccess: () => { setInviteEmail(''); setInviteName(''); setInviteCompany(''); setShowInviteForm(false); }
    });
  }

  const filteredRequests = requestFilter === 'all' ? requests : requests.filter(r => r.status === requestFilter);
  const respondingRequest = requests.find(r => r.id === respondingTo);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3">
          <div
            className="h-10 w-10 rounded-lg flex-shrink-0 flex items-center justify-center text-sm font-bold text-white"
            style={{ backgroundColor: portal.brand_accent_color ?? '#0F172A' }}
          >
            {portal.brand_logo_url
              ? <img src={portal.brand_logo_url} alt="logo" className="h-10 w-10 rounded-lg object-contain" />
              : (portal.client_name ?? portal.name).charAt(0).toUpperCase()
            }
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-foreground">{portal.name}</h1>
              <span className="flex items-center gap-1.5">
                <span className={cn('h-2 w-2 rounded-full', STATUS_COLORS[portal.status] ?? 'bg-muted-foreground')} />
                <span className="text-xs text-muted-foreground capitalize">{portal.status}</span>
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-muted-foreground font-mono">{portalUrl}</span>
              <button onClick={() => { navigator.clipboard.writeText(portalUrl); toast.success('Link copied'); }} className="text-muted-foreground hover:text-foreground">
                <Copy className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => window.open(portalUrl, '_blank')}>
          <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
          Open Portal
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue={defaultTab}>
        <TabsList className="w-full justify-start">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="contacts">
            Contacts
            {contacts.length > 0 && <Badge variant="secondary" className="ml-2 h-4 px-1 text-[10px]">{contacts.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="requests">
            Requests
            {pendingRequests.length > 0 && <Badge className="ml-2 h-4 px-1 text-[10px] bg-amber-500">{pendingRequests.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        {/* ── OVERVIEW TAB ── */}
        <TabsContent value="overview" className="space-y-6 mt-4">
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1"><Users className="h-4 w-4" /><span className="text-xs">Contacts</span></div>
                <p className="text-2xl font-bold">{contacts.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1"><FileText className="h-4 w-4" /><span className="text-xs">Pending</span></div>
                <p className="text-2xl font-bold text-amber-600">{pendingRequests.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1"><Activity className="h-4 w-4" /><span className="text-xs">Activities</span></div>
                <p className="text-2xl font-bold">{activity.length}</p>
              </CardContent>
            </Card>
          </div>

          {/* Shared modules */}
          <Card>
            <CardHeader><CardTitle className="text-sm">Shared Modules</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {MODULE_CONFIG.map(m => {
                const enabled = portal.shared_modules.includes(m.key);
                return (
                  <div key={m.key} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span>{m.icon}</span>
                      <div>
                        <p className="text-sm font-medium">{m.label}</p>
                        <button
                          onClick={() => setExclusionsModule(m.key)}
                          className="text-xs text-primary hover:underline"
                        >
                          Manage exclusions →
                        </button>
                      </div>
                    </div>
                    <Switch checked={enabled} onCheckedChange={v => toggleSharedModule(m.key, v)} />
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Pending requests preview */}
          {pendingRequests.length > 0 && (
            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle className="text-sm">Pending Requests</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {pendingRequests.slice(0, 3).map(req => (
                  <div key={req.id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{req.subject}</p>
                      <p className="text-xs text-muted-foreground">
                        {req.requested_by_name ?? req.requested_by_email} · {formatDistanceToNow(new Date(req.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    <Button size="sm" onClick={() => setRespondingTo(req.id)}>Respond</Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Recent activity */}
          {activity.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Recent Activity</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {activity.slice(0, 5).map(a => (
                  <div key={a.id} className="flex items-center justify-between gap-3">
                    <p className="text-sm text-foreground">{a.description ?? a.activity_type}</p>
                    <span className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">
                      {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── CONTACTS TAB ── */}
        <TabsContent value="contacts" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setShowInviteForm(v => !v)}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Invite Contact
            </Button>
          </div>

          {showInviteForm && (
            <Card>
              <CardContent className="pt-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Name</Label>
                    <Input value={inviteName} onChange={e => setInviteName(e.target.value)} placeholder="Jane Smith" />
                  </div>
                  <div className="space-y-1">
                    <Label>Email *</Label>
                    <Input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="jane@client.com" />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Company</Label>
                  <Input value={inviteCompany} onChange={e => setInviteCompany(e.target.value)} placeholder="Riverside Construction" />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleInvite} disabled={!inviteEmail.trim() || inviteContact.isPending} size="sm">
                    {inviteContact.isPending && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                    Send Invite
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setShowInviteForm(false)}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {contacts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">No contacts invited yet.</p>
          ) : (
            <div className="space-y-2">
              {contacts.map(c => (
                <div key={c.id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs bg-primary/10 text-primary">
                        {(c.name ?? c.email).charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{c.name ?? c.email}</p>
                      <p className="text-xs text-muted-foreground">
                        {c.name ? c.email : null}
                        {c.last_login_at
                          ? ` · Last login ${formatDistanceToNow(new Date(c.last_login_at), { addSuffix: true })}`
                          : ' · Never logged in'}
                      </p>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <MoreHorizontal className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => revokeAccess.mutate({ id: c.id, portalId: portal.id })}
                        className="text-destructive"
                      >
                        Revoke Access
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── REQUESTS TAB ── */}
        <TabsContent value="requests" className="mt-4 space-y-4">
          <div className="flex gap-2 flex-wrap">
            {['all', 'pending', 'in_review', 'fulfilled', 'declined'].map(s => (
              <Button key={s} variant={requestFilter === s ? 'default' : 'outline'} size="sm" onClick={() => setRequestFilter(s)}>
                {s.charAt(0).toUpperCase() + s.slice(1).replace('_', ' ')}
              </Button>
            ))}
          </div>

          {filteredRequests.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm font-medium text-foreground">No document requests yet</p>
              <p className="text-xs text-muted-foreground mt-1">When your client requests a document or update, it will appear here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredRequests.map(req => (
                <Card key={req.id}>
                  <CardContent className="pt-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        {REQUEST_STATUS_ICON[req.status]}
                        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{req.status.replace('_', ' ')}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(req.created_at), { addSuffix: true })}</span>
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{req.subject}</p>
                      <p className="text-xs text-muted-foreground">From: {req.requested_by_name ?? req.requested_by_email}</p>
                    </div>
                    <p className="text-sm text-foreground leading-relaxed border-t border-border pt-3">{req.message}</p>
                    {req.status === 'pending' && (
                      <div className="flex gap-2 pt-1">
                        <Button size="sm" onClick={() => setRespondingTo(req.id)}>Respond & Fulfill</Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── ACTIVITY TAB ── */}
        <TabsContent value="activity" className="mt-4 space-y-2">
          {activity.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">No portal activity yet.</p>
          ) : (
            activity.map(a => (
              <div key={a.id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
                <div>
                  <p className="text-sm text-foreground">{a.description ?? a.activity_type}</p>
                  <p className="text-xs text-muted-foreground">{a.actor_name ?? a.actor_email}</p>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">
                  {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
                </span>
              </div>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Respond drawer */}
      {respondingRequest && (
        <RespondToRequestDrawer
          open={!!respondingTo}
          onOpenChange={open => { if (!open) setRespondingTo(null); }}
          request={respondingRequest}
          portalId={portal.id}
        />
      )}

      {/* Exclusions drawer */}
      {exclusionsModule && (
        <ManageExclusionsDrawer
          open={!!exclusionsModule}
          onOpenChange={open => { if (!open) setExclusionsModule(null); }}
          portalId={portal.id}
          module={exclusionsModule as 'credentials' | 'training' | 'safety' | 'equipment'}
        />
      )}
    </div>
  );
}
