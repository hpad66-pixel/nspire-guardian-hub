import { useModules } from '@/contexts/ModuleContext';
import { useProperties } from '@/hooks/useProperties';
import { useCurrentUserRole } from '@/hooks/useUserManagement';
import { useClientsWithCounts } from '@/hooks/useClients';
import { useWorkspaceContext } from '@/contexts/WorkspaceContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import {
  Settings,
  ClipboardCheck,
  FolderKanban,
  CreditCard,
  Building2,
  Sun,
  TreePine,
  ArrowRight,
  Briefcase,
  Home,
  Shield,
  History,
  Link2,
  ExternalLink,
  Copy,
} from 'lucide-react';
import { UserManagement } from '@/components/settings/UserManagement';
import { AISkillsSettings } from '@/components/settings/AISkillsSettings';
import { NotificationSettings } from '@/components/settings/NotificationSettings';
import { AssistantSettings } from '@/components/settings/AssistantSettings';
import { ClickUpSettings } from '@/components/settings/ClickUpSettings';
import { DemoModeButton } from '@/components/settings/DemoModeButton';
import { useActivityLogStats } from '@/hooks/useActivityLog';
import { useUsers } from '@/hooks/useUserManagement';
import { format } from 'date-fns';
import { toast } from 'sonner';

// #18: these read-heavy queries are deferred into the tab bodies. Radix
// only mounts the active <TabsContent>, so each hook fires only when its
// tab is opened — the Settings shell paints immediately.
function AuditStats() {
  const { data: activityStats } = useActivityLogStats();
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div className="p-3 rounded-lg border bg-card">
        <p className="text-xs text-muted-foreground">Recent Events</p>
        <p className="text-2xl font-bold leading-tight">{activityStats?.total ?? 0}</p>
      </div>
      <div className="p-3 rounded-lg border bg-card">
        <p className="text-xs text-muted-foreground">Creates</p>
        <p className="text-2xl font-bold leading-tight">{activityStats?.actions?.create ?? 0}</p>
      </div>
      <div className="p-3 rounded-lg border bg-card">
        <p className="text-xs text-muted-foreground">Updates</p>
        <p className="text-2xl font-bold leading-tight">{activityStats?.actions?.update ?? 0}</p>
      </div>
      <div className="p-3 rounded-lg border bg-card">
        <p className="text-xs text-muted-foreground">Deletes</p>
        <p className="text-2xl font-bold leading-tight">{activityStats?.actions?.delete ?? 0}</p>
      </div>
    </div>
  );
}

function SeatCount() {
  const { data: workspaceUsers } = useUsers();
  const n = workspaceUsers?.length ?? 0;
  return <>{n} {n === 1 ? 'seat' : 'seats'}</>;
}

function DeferredOrganizations({
  children,
}: {
  children: (organizations: ReturnType<typeof useClientsWithCounts>['data']) => React.ReactNode;
}) {
  const { data: organizations } = useClientsWithCounts();
  return <>{children(organizations)}</>;
}

export default function SettingsPage() {
  // Module config now lives entirely on /admin/modules — kept here only for the
  // "Enabled/Disabled" status read-outs on the Billing tab below.
  const { modules } = useModules();
  const { data: properties } = useProperties();
  const { data: currentUserRole } = useCurrentUserRole();
  const navigate = useNavigate();
  const { workspace, isLoading: workspaceLoading, isTrialing, trialDaysLeft } = useWorkspaceContext();

  const isAdmin = currentUserRole === 'admin' || currentUserRole === 'owner';
  const canManageUsers = currentUserRole === 'admin' || currentUserRole === 'owner' || currentUserRole === 'manager';

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
              <Settings className="h-5 w-5 text-primary-foreground" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          </div>
          {!workspaceLoading && workspace && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground hidden sm:inline">{workspace.name}</span>
              <Badge variant="outline" className="capitalize text-xs">
                {workspace.plan}
              </Badge>
              <Badge
                variant={workspace.status === 'active' ? 'default' : 'secondary'}
                className="text-xs capitalize"
              >
                {workspace.status}
              </Badge>
            </div>
          )}
        </div>
        <p className="text-muted-foreground">
          Manage platform modules, users, and tenant configuration
        </p>
      </div>

      <Tabs defaultValue="billing" className="space-y-6">
        <TabsList>
          {canManageUsers && <TabsTrigger value="users">Users & Roles</TabsTrigger>}
          {isAdmin && <TabsTrigger value="ai-skills">AI Skills</TabsTrigger>}
          <TabsTrigger value="billing">Billing</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="assistant">Assistant</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="organization">Organization</TabsTrigger>
          {isAdmin && <TabsTrigger value="audit">Audit Log</TabsTrigger>}
          {isAdmin && <TabsTrigger value="demo">Demo Mode</TabsTrigger>}
        </TabsList>

        <TabsContent value="notifications" className="space-y-6">
          <NotificationSettings />
        </TabsContent>

        <TabsContent value="assistant" className="space-y-6">
          <AssistantSettings />
        </TabsContent>

        <TabsContent value="integrations" className="space-y-6">
          <ClickUpSettings />
        </TabsContent>

        {canManageUsers && (
          <TabsContent value="users">
            <UserManagement />
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="ai-skills">
            <AISkillsSettings />
          </TabsContent>
        )}

        <TabsContent value="billing" className="space-y-4">
          {/* Trial banner */}
          {isTrialing && (
            <Card className="border-amber-500/40 bg-amber-500/5">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                    <CreditCard className="h-4 w-4 text-amber-600 dark:text-amber-500" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">
                      Trial ends in {trialDaysLeft} {trialDaysLeft === 1 ? 'day' : 'days'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {workspace?.trial_ends_at && (
                        <>Trial period expires on {format(new Date(workspace.trial_ends_at), 'MMMM d, yyyy')}. </>
                      )}
                      Contact support to activate a paid subscription.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Billing Info */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Billing & Subscription
                  </CardTitle>
                  <CardDescription>Current plan, seats, and module subscriptions</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Current plan summary */}
                <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
                  <div>
                    <p className="font-medium">Current Plan</p>
                    <p className="text-sm text-muted-foreground">
                      {workspaceLoading ? (
                        <Skeleton className="h-4 w-40 inline-block" />
                      ) : workspace ? (
                        <>
                          <span className="capitalize">{workspace.plan}</span>
                          {' • '}
                          <SeatCount />
                          {' • '}
                          {properties?.length || 0} {(properties?.length || 0) === 1 ? 'property' : 'properties'}
                        </>
                      ) : (
                        'No workspace'
                      )}
                    </p>
                  </div>
                  {workspace && (
                    <Badge
                      variant={workspace.status === 'active' ? 'default' : 'secondary'}
                      className="capitalize"
                    >
                      {workspace.status}
                    </Badge>
                  )}
                </div>

                {/* Plan metadata */}
                {workspace && (
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="p-3 rounded-lg border bg-card">
                      <p className="text-xs text-muted-foreground">Workspace ID</p>
                      <p className="text-sm font-mono truncate" title={workspace.id}>{workspace.slug || workspace.id.slice(0, 8)}</p>
                    </div>
                    <div className="p-3 rounded-lg border bg-card">
                      <p className="text-xs text-muted-foreground">Created</p>
                      <p className="text-sm">{format(new Date(workspace.created_at), 'MMM d, yyyy')}</p>
                    </div>
                    <div className="p-3 rounded-lg border bg-card">
                      <p className="text-xs text-muted-foreground">Billing Customer</p>
                      <p className="text-sm">{workspace.stripe_customer_id ? 'Linked to Stripe' : 'Not linked'}</p>
                    </div>
                  </div>
                )}

                {/* Manage subscription placeholder */}
                {isAdmin && (
                  <div className="p-4 rounded-lg border border-dashed bg-muted/30">
                    <div className="flex items-start gap-3">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <CreditCard className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">Change plan or update payment method</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Self-serve subscription management is coming soon. Contact support to upgrade, downgrade, or update billing details.
                        </p>
                      </div>
                      <Button variant="outline" size="sm" disabled title="Self-serve billing not yet enabled">
                        Manage Subscription
                      </Button>
                    </div>
                  </div>
                )}

                {/* Active modules */}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mt-2 mb-3">
                    Core Modules
                  </p>
                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="p-4 rounded-lg border bg-card">
                      <div className="flex items-center gap-2 mb-2">
                        <Sun className="h-4 w-4 text-emerald-500" />
                        <span className="font-medium">Daily Grounds</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {modules.dailyGroundsEnabled ? 'Enabled' : 'Disabled'}
                      </p>
                    </div>
                    <div className="p-4 rounded-lg border bg-card">
                      <div className="flex items-center gap-2 mb-2">
                        <ClipboardCheck className="h-4 w-4 text-module-inspections" />
                        <span className="font-medium">NSPIRE Compliance</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {modules.nspireEnabled ? 'Enabled' : 'Disabled'}
                      </p>
                    </div>
                    <div className="p-4 rounded-lg border bg-card">
                      <div className="flex items-center gap-2 mb-2">
                        <FolderKanban className="h-4 w-4 text-module-projects" />
                        <span className="font-medium">Projects</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {modules.projectsEnabled ? 'Enabled' : 'Disabled'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="organization" className="space-y-4">
          <DeferredOrganizations>{(organizations) => (<>
          {/* Summary */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Organizations & Clients
                  </CardTitle>
                  <CardDescription>
                    Manage companies, clients, and organizational affiliations
                  </CardDescription>
                </div>
                <Button onClick={() => navigate('/organizations')}>
                  Manage Organizations
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Quick stats */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-6">
                {[
                  { type: 'internal_org', label: 'Internal Orgs', icon: <Building2 className="h-4 w-4" /> },
                  { type: 'business_client', label: 'Business Clients', icon: <Briefcase className="h-4 w-4" /> },
                  { type: 'property_management', label: 'Property Mgmt', icon: <Home className="h-4 w-4" /> },
                  { type: 'government', label: 'Government', icon: <Shield className="h-4 w-4" /> },
                ].map(({ type, label, icon }) => (
                  <div key={type} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                      {icon}
                    </div>
                    <div>
                      <p className="text-lg font-bold leading-none">
                        {organizations?.filter(o => o.client_type === type && o.is_active).length ?? 0}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Recent orgs preview */}
              {organizations && organizations.filter(o => o.is_active).length > 0 ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground mb-3">Active Organizations</p>
                  {organizations.filter(o => o.is_active).slice(0, 5).map((org) => (
                    <div key={org.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{org.name}</p>
                          <p className="text-xs text-muted-foreground capitalize">
                            {org.client_type.replace(/_/g, ' ')} · {org.member_count ?? 0} members · {org.project_count ?? 0} projects
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {organizations.filter(o => o.is_active).length > 5 && (
                    <p className="text-xs text-muted-foreground text-center py-2">
                      +{organizations.filter(o => o.is_active).length - 5} more
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground border rounded-lg bg-muted/30">
                  <Building2 className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p className="text-sm font-medium">No organizations yet</p>
                  <p className="text-xs mt-1">Create organizations to link them to projects and team members</p>
                  <Button variant="outline" className="mt-4" size="sm" onClick={() => navigate('/organizations')}>
                    Create First Organization
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Shareable Schedule Preview */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Link2 className="h-5 w-5" />
                    Shareable Schedule Preview
                  </CardTitle>
                  <CardDescription>
                    Hard-coded, standalone A/B/C schedule demo. No login required — safe to email
                    prospects. This is separate from the authenticated client portal.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="shrink-0">Public</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2">
                <Link2 className="h-4 w-4 text-muted-foreground shrink-0" />
                <code className="text-sm break-all flex-1">https://projos.ai/schedule-demo</code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText('https://projos.ai/schedule-demo');
                    toast.success('Link copied');
                  }}
                >
                  <Copy className="h-3.5 w-3.5 mr-1.5" />
                  Copy
                </Button>
                <Button
                  size="sm"
                  onClick={() => window.open('/schedule-demo', '_blank', 'noopener,noreferrer')}
                >
                  <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                  Open preview
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Served as a static page at <code>/schedule-demo</code> on the published site. Check
                milestones, answer the questionnaire — state persists per browser. Customize the
                content directly in <code>public/schedule-demo.html</code>.
              </p>
            </CardContent>
          </Card>

          {/* Platform info */}
          <Card>
            <CardHeader>
              <CardTitle>Platform Information</CardTitle>
              <CardDescription>Your current platform configuration</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label className="text-muted-foreground text-xs">Properties</Label>
                  <p className="font-medium">{properties?.length || 0} active</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Total Units</Label>
                  <p className="font-medium">
                    {properties?.reduce((sum, p) => sum + (p.total_units || 0), 0) || 0}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Organizations</Label>
                  <p className="font-medium">{organizations?.filter(o => o.is_active).length || 0} active</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Linked Members</Label>
                  <p className="font-medium">
                    {organizations?.reduce((sum, o) => sum + (o.member_count ?? 0), 0) || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          </>)}</DeferredOrganizations>
        </TabsContent>

        {isAdmin && (
          <TabsContent value="audit" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <History className="h-5 w-5" />
                      Audit Log
                    </CardTitle>
                    <CardDescription>
                      Review who changed what across the workspace
                    </CardDescription>
                  </div>
                  <Button onClick={() => navigate('/settings/activity-log')}>
                    Open Activity Log
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <AuditStats />
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="demo" className="space-y-4">
            <DemoModeButton />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

