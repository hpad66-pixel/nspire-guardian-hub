import { useModules } from '@/contexts/ModuleContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
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
} from 'lucide-react';

export default function SettingsPage() {
  const { modules, toggleModule, userRole, setUserRole } = useModules();

  const isAdmin = userRole === 'super_admin' || userRole === 'tenant_admin';

  return (
    <div className="p-6 space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
            <Settings className="h-5 w-5 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        </div>
        <p className="text-muted-foreground">
          Manage platform modules, billing, and tenant configuration
        </p>
      </div>

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

      {/* Module Toggles */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Platform Modules</CardTitle>
              <CardDescription>Enable or disable paid add-on modules for this tenant</CardDescription>
            </div>
            {!isAdmin && (
              <Badge variant="secondary">View Only</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* NSPIRE Inspections */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg bg-module-inspections flex items-center justify-center">
                <ClipboardCheck className="h-5 w-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="nspire" className="font-medium">NSPIRE Inspections</Label>
                  <Badge variant="outline">Paid Add-On</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  100% standards-compliant inspection engine with defect tracking
                </p>
              </div>
            </div>
            <Switch
              id="nspire"
              checked={modules.nspireEnabled}
              onCheckedChange={() => toggleModule('nspireEnabled')}
              disabled={!isAdmin}
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
              disabled={!isAdmin}
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
                <p className="text-sm text-muted-foreground">Enterprise • 12 properties</p>
              </div>
              <Badge>Active</Badge>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="p-4 rounded-lg border bg-card">
                <div className="flex items-center gap-2 mb-2">
                  <ClipboardCheck className="h-4 w-4 text-module-inspections" />
                  <span className="font-medium">NSPIRE Inspections</span>
                </div>
                <p className="text-sm text-muted-foreground">Enabled since Jan 1, 2024</p>
              </div>
              <div className="p-4 rounded-lg border bg-card">
                <div className="flex items-center gap-2 mb-2">
                  <FolderKanban className="h-4 w-4 text-module-projects" />
                  <span className="font-medium">Projects</span>
                </div>
                <p className="text-sm text-muted-foreground">Enabled since Jan 1, 2024</p>
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
                <p className="font-medium">12 active</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Total Units</Label>
                <p className="font-medium">847</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
