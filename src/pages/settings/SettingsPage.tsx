import { useModules } from '@/contexts/ModuleContext';
import { useProperties, useUpdateProperty } from '@/hooks/useProperties';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Settings, 
  ClipboardCheck, 
  FolderKanban, 
  Users, 
  Mail, 
  QrCode,
  Shield,
  CreditCard,
  Building2,
  Sun,
  TreePine,
} from 'lucide-react';
import { UserManagement } from '@/components/settings/UserManagement';
import { toast } from 'sonner';

export default function SettingsPage() {
  const { modules, toggleModule, userRole, setUserRole, isLoading: modulesLoading, refetchModules } = useModules();
  const { data: properties, isLoading: propertiesLoading } = useProperties();
  const updateProperty = useUpdateProperty();

  const isAdmin = userRole === 'super_admin' || userRole === 'tenant_admin';

  const handlePropertyModuleChange = async (
    propertyId: string, 
    module: 'nspire_enabled' | 'daily_grounds_enabled' | 'projects_enabled',
    checked: boolean
  ) => {
    try {
      await updateProperty.mutateAsync({
        id: propertyId,
        [module]: checked,
      });
      await refetchModules();
    } catch (error) {
      toast.error('Failed to update property module');
    }
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
            <Settings className="h-5 w-5 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        </div>
        <p className="text-muted-foreground">
          Manage platform modules, users, and tenant configuration
        </p>
      </div>

      <Tabs defaultValue="modules" className="space-y-6">
        <TabsList>
          <TabsTrigger value="modules">Modules</TabsTrigger>
          <TabsTrigger value="users">Users & Roles</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
          <TabsTrigger value="organization">Organization</TabsTrigger>
        </TabsList>

        <TabsContent value="modules" className="space-y-6">
          {/* Demo Role Switcher */}
          <Card className="border-dashed">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Demo: Role Switcher
              </CardTitle>
              <CardDescription>Switch roles to see different permission levels</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {(['super_admin', 'tenant_admin', 'property_manager', 'inspector', 'viewer'] as const).map((role) => (
                  <Button
                    key={role}
                    variant={userRole === role ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setUserRole(role)}
                    className="capitalize"
                  >
                    {role.replace('_', ' ')}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Module Toggles - Tenant-Wide Defaults */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Tenant-Wide Module Defaults</CardTitle>
                  <CardDescription>Enable or disable paid add-on modules for all properties</CardDescription>
                </div>
                {!isAdmin && (
                  <Badge variant="secondary">View Only</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Daily Grounds */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-emerald-500 flex items-center justify-center">
                    <Sun className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <Label htmlFor="dailyGrounds" className="font-medium">Daily Grounds Inspections</Label>
                      <Badge variant="outline">Paid Add-On</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Ongoing daily inspections of exterior grounds, assets, and infrastructure
                    </p>
                  </div>
                </div>
                <Switch
                  id="dailyGrounds"
                  checked={modules.dailyGroundsEnabled}
                  onCheckedChange={() => toggleModule('dailyGroundsEnabled')}
                  disabled={!isAdmin || modulesLoading}
                />
              </div>

              <Separator />

              {/* NSPIRE Inspections */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-module-inspections flex items-center justify-center">
                    <ClipboardCheck className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <Label htmlFor="nspire" className="font-medium">NSPIRE Compliance</Label>
                      <Badge variant="outline">Paid Add-On</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      HUD NSPIRE-compliant inside unit inspections with mandated defect catalogs
                    </p>
                  </div>
                </div>
                <Switch
                  id="nspire"
                  checked={modules.nspireEnabled}
                  onCheckedChange={() => toggleModule('nspireEnabled')}
                  disabled={!isAdmin || modulesLoading}
                />
              </div>

              <Separator />

              {/* Projects */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-module-projects flex items-center justify-center">
                    <FolderKanban className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <Label htmlFor="projects" className="font-medium">Projects</Label>
                      <Badge variant="outline">Paid Add-On</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Capital improvements, daily reports, change orders, and closeout
                    </p>
                  </div>
                </div>
                <Switch
                  id="projects"
                  checked={modules.projectsEnabled}
                  onCheckedChange={() => toggleModule('projectsEnabled')}
                  disabled={!isAdmin || modulesLoading}
                />
              </div>

              <Separator />

              {/* Occupancy Tracking */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                    <Users className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <Label htmlFor="occupancy" className="font-medium">Occupancy Tracking</Label>
                      <Badge variant="secondary">Coming Soon</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Tenant management and lease tracking
                    </p>
                  </div>
                </div>
                <Switch
                  id="occupancy"
                  checked={modules.occupancyEnabled}
                  onCheckedChange={() => toggleModule('occupancyEnabled')}
                  disabled={!isAdmin}
                />
              </div>

              <Separator />

              {/* Email Inbox */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <Label htmlFor="email" className="font-medium">Email Inbox Integration</Label>
                      <Badge variant="secondary">Phase 2</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Unified email inbox with AI-powered triage
                    </p>
                  </div>
                </div>
                <Switch
                  id="email"
                  checked={modules.emailInboxEnabled}
                  onCheckedChange={() => toggleModule('emailInboxEnabled')}
                  disabled={!isAdmin}
                />
              </div>

              <Separator />

              {/* QR Scanning */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                    <QrCode className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <Label htmlFor="qr" className="font-medium">QR Asset Scanning</Label>
                      <Badge variant="secondary">Phase 2</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Mobile QR code scanning for asset identification
                    </p>
                  </div>
                </div>
                <Switch
                  id="qr"
                  checked={modules.qrScanningEnabled}
                  onCheckedChange={() => toggleModule('qrScanningEnabled')}
                  disabled={!isAdmin}
                />
              </div>
            </CardContent>
          </Card>

          {/* Per-Property Module Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>Per-Property Module Overrides</CardTitle>
              <CardDescription>
                Enable or disable modules for specific properties
              </CardDescription>
            </CardHeader>
            <CardContent>
              {propertiesLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : properties && properties.length > 0 ? (
                <div className="space-y-4">
                  {/* Header */}
                  <div className="grid grid-cols-4 gap-4 px-4 py-2 bg-muted/50 rounded-lg text-sm font-medium text-muted-foreground">
                    <div>Property</div>
                    <div className="text-center flex items-center justify-center gap-1">
                      <Sun className="h-3 w-3" />
                      Daily Grounds
                    </div>
                    <div className="text-center flex items-center justify-center gap-1">
                      <ClipboardCheck className="h-3 w-3" />
                      NSPIRE
                    </div>
                    <div className="text-center flex items-center justify-center gap-1">
                      <FolderKanban className="h-3 w-3" />
                      Projects
                    </div>
                  </div>
                  
                  {/* Property rows */}
                  {properties.map((property) => (
                    <div 
                      key={property.id} 
                      className="grid grid-cols-4 gap-4 px-4 py-3 border rounded-lg items-center"
                    >
                      <div>
                        <p className="font-medium">{property.name}</p>
                        <p className="text-xs text-muted-foreground">{property.city}, {property.state}</p>
                      </div>
                      <div className="flex justify-center">
                        <Checkbox
                          checked={property.daily_grounds_enabled || false}
                          onCheckedChange={(checked) => 
                            handlePropertyModuleChange(property.id, 'daily_grounds_enabled', checked as boolean)
                          }
                          disabled={!isAdmin || updateProperty.isPending}
                        />
                      </div>
                      <div className="flex justify-center">
                        <Checkbox
                          checked={property.nspire_enabled || false}
                          onCheckedChange={(checked) => 
                            handlePropertyModuleChange(property.id, 'nspire_enabled', checked as boolean)
                          }
                          disabled={!isAdmin || updateProperty.isPending}
                        />
                      </div>
                      <div className="flex justify-center">
                        <Checkbox
                          checked={property.projects_enabled || false}
                          onCheckedChange={(checked) => 
                            handlePropertyModuleChange(property.id, 'projects_enabled', checked as boolean)
                          }
                          disabled={!isAdmin || updateProperty.isPending}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No properties found</p>
                  <p className="text-sm">Add properties to configure module access</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users">
          <UserManagement />
        </TabsContent>

        <TabsContent value="billing">
          {/* Billing Info */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Billing & Subscription
                  </CardTitle>
                  <CardDescription>Current plan and module subscriptions</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
                  <div>
                    <p className="font-medium">Current Plan</p>
                    <p className="text-sm text-muted-foreground">Enterprise • {properties?.length || 0} properties</p>
                  </div>
                  <Badge>Active</Badge>
                </div>
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
                {!isAdmin && (
                  <Button variant="outline" className="w-full">
                    Request Module Upgrade
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="organization">
          {/* Tenant Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Tenant Configuration
              </CardTitle>
              <CardDescription>Organization settings and preferences</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label className="text-muted-foreground text-xs">Organization Name</Label>
                    <p className="font-medium">Acme Property Management</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Tenant ID</Label>
                    <p className="font-medium font-mono text-sm">tenant_abc123</p>
                  </div>
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
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
