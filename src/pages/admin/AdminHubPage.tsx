import { useNavigate } from 'react-router-dom';
import { useMemo } from 'react';
import {
  ShieldCheck,
  Building2,
  Coins,
  Workflow,
  Send,
  Globe,
  ScrollText,
  CreditCard,
  KeyRound,
  UsersRound,
  ToggleRight,
  GraduationCap,
  Plug,
  Boxes,
  Sparkles,
  ChevronRight,
  LayoutGrid,
  type LucideIcon,
} from 'lucide-react';
import { useUserPermissions } from '@/hooks/usePermissions';
import { useModules } from '@/contexts/ModuleContext';
import { cn } from '@/lib/utils';

type Scope = 'admin' | 'owner';

interface AdminTile {
  title: string;
  description: string;
  icon: LucideIcon;
  to: string;
  /** Lowest role that may see this tile. 'owner' => admin + owner; 'admin' => admin only. */
  scope: Scope;
  /** Optional module flag that must be enabled. */
  module?: string;
}

// Workspace group — org/property admins (owner) and platform admins both manage these.
const WORKSPACE_TILES: AdminTile[] = [
  { title: 'Modules & Packages', description: 'Turn suites on or off, or apply a package, for this workspace.', icon: Boxes, to: '/admin/modules', scope: 'owner' },
  { title: 'Roles & Permissions', description: 'Permission templates and role access across the workspace.', icon: ShieldCheck, to: '/admin/permission-templates', scope: 'owner' },
  { title: 'Workspace Settings', description: 'Organization profile, branding, and enabled modules.', icon: Building2, to: '/settings/workspace', scope: 'owner' },
  { title: 'Cost Code Libraries', description: 'Master cost codes that drive budgets and financials.', icon: Coins, to: '/admin/cost-codes', scope: 'owner' },
  { title: 'Workflows', description: 'Approval flows and ball-in-court routing.', icon: Workflow, to: '/admin/workflows', scope: 'owner' },
  { title: 'Distribution Lists', description: 'Named recipient groups for notifications and sends.', icon: Send, to: '/settings/distribution-lists', scope: 'owner' },
  { title: 'Client Portals', description: 'Owner and subcontractor portal access.', icon: Globe, to: '/portals', scope: 'owner', module: 'clientPortalEnabled' },
  { title: 'Activity Log', description: 'Audit trail of changes across the workspace.', icon: ScrollText, to: '/settings/activity-log', scope: 'owner' },
];

// Platform group — reserved for platform (super) admins.
const PLATFORM_TILES: AdminTile[] = [
  { title: 'Billing & Plan', description: 'Subscription, invoices, and plan limits.', icon: CreditCard, to: '/admin/billing', scope: 'admin' },
  { title: 'Single Sign-On', description: 'SAML 2.0 SSO configuration.', icon: KeyRound, to: '/admin/sso', scope: 'admin' },
  { title: 'SCIM Provisioning', description: 'Automated user provisioning and deprovisioning.', icon: UsersRound, to: '/admin/scim', scope: 'admin' },
  { title: 'Feature Registry', description: 'Enable or disable platform modules.', icon: ToggleRight, to: '/admin/registry', scope: 'admin' },
  { title: 'LearnWorlds Schools', description: 'Training school assignments and sync.', icon: GraduationCap, to: '/admin/schools', scope: 'admin' },
  { title: 'API Clients', description: 'API keys, webhooks, and developer access.', icon: Plug, to: '/settings/api/clients', scope: 'admin' },
  { title: 'AI Usage & Cost', description: 'Token usage and spend by model, feature, project, and client.', icon: Sparkles, to: '/admin/ai-usage', scope: 'admin' },
];

function TileCard({ tile, onOpen }: { tile: AdminTile; onOpen: (to: string) => void }) {
  const Icon = tile.icon;
  return (
    <button
      onClick={() => onOpen(tile.to)}
      className={cn(
        'group flex items-start gap-4 rounded-xl border bg-card p-5 text-left',
        'transition-all duration-200 hover:border-accent/50 hover:shadow-md hover:-translate-y-0.5',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40',
      )}
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent/12 text-accent transition-colors group-hover:bg-accent/20">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-semibold leading-tight">{tile.title}</h3>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-accent" />
        </div>
        <p className="mt-1 text-sm text-muted-foreground leading-snug">{tile.description}</p>
      </div>
    </button>
  );
}

export default function AdminHubPage() {
  const navigate = useNavigate();
  const { currentRole } = useUserPermissions();
  const { isModuleEnabled } = useModules();

  const isAdmin = currentRole === 'admin';
  const isOwner = currentRole === 'owner';
  const canSeeHub = isAdmin || isOwner;

  const visible = (tiles: AdminTile[]) =>
    tiles.filter((t) => {
      if (t.scope === 'admin' && !isAdmin) return false;
      if (t.scope === 'owner' && !(isAdmin || isOwner)) return false;
      if (t.module && !isModuleEnabled(t.module as any)) return false;
      return true;
    });

  const workspaceTiles = useMemo(() => visible(WORKSPACE_TILES), [currentRole, isModuleEnabled]);
  const platformTiles = useMemo(() => visible(PLATFORM_TILES), [currentRole]);

  if (!canSeeHub) {
    return (
      <div className="mx-auto max-w-md px-6 py-20 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
          <ShieldCheck className="h-7 w-7 text-muted-foreground" />
        </div>
        <h1 className="text-xl font-semibold">Admin access required</h1>
        <p className="mt-2 text-muted-foreground">
          You do not have administrator permissions for this workspace.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-foreground text-background">
          <LayoutGrid className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Admin</h1>
          <p className="mt-1 text-muted-foreground">What action would you like to take?</p>
        </div>
      </div>

      {/* Workspace group */}
      {workspaceTiles.length > 0 && (
        <section className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Workspace
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {workspaceTiles.map((tile) => (
              <TileCard key={tile.to} tile={tile} onOpen={navigate} />
            ))}
          </div>
        </section>
      )}

      {/* Platform group — only renders for platform admins */}
      {platformTiles.length > 0 && (
        <section className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Platform
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {platformTiles.map((tile) => (
              <TileCard key={tile.to} tile={tile} onOpen={navigate} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
