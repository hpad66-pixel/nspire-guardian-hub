/**
 * Unified project navigation for consulting and construction.
 *
 * Single source of truth for sidebar groups, labels, and routed destinations.
 * Visibility is gated by moduleVisibility; billing kind drives group labels.
 */

import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard, FolderTree, Users, ListTree, CalendarDays, ClipboardList,
  Images, Wallet, FileSignature, HelpCircle, Package, ListChecks, CheckSquare,
  TrendingUp, ShoppingCart, ShieldCheck, FlaskConical, MessageSquareText, Mail,
  Award, Receipt, Send, Megaphone, Brain, Settings2, FileBadge2, Map, Warehouse, Phone,
} from 'lucide-react';
import { projectKind, type ProjectKind } from '@/lib/projectKind';
import {
  isModuleVisible,
  resolveModuleVisible,
  type ModuleVisibilityProject,
  type ProjectModuleSlug,
} from '@/lib/projects/moduleVisibility';

export type NavGroupKey =
  | 'engagement'
  | 'field'
  | 'commercial'
  | 'documents'
  | 'client'
  | 'admin'
  // Legacy construction aliases used in older tests / deep links
  | 'core'
  | 'compliance'
  | 'reports'
  | 'delivery';

export interface NavGroupDef {
  key: NavGroupKey;
  label: string;
  color: string;
}

export interface ProjectNavItem {
  value: ProjectModuleSlug;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
  group: NavGroupKey;
  /** If set, selecting this tab navigates to a dedicated route instead of in-page content. */
  route?: (projectId: string) => string;
  /** Open a sheet/dialog instead of a tab (e.g. People). */
  action?: 'team-sheet';
  adminOnly?: boolean;
}

const CONSTRUCTION_GROUPS: NavGroupDef[] = [
  { key: 'engagement', label: 'Project', color: 'text-blue-400' },
  { key: 'field', label: 'Field', color: 'text-amber-400' },
  { key: 'commercial', label: 'Money', color: 'text-[var(--apas-sapphire)]' },
  { key: 'documents', label: 'Docs & Comms', color: 'text-purple-400' },
  { key: 'client', label: 'Client', color: 'text-emerald-400' },
  { key: 'admin', label: 'Admin', color: 'text-muted-foreground' },
];

const CONSULTING_GROUPS: NavGroupDef[] = [
  { key: 'engagement', label: 'Engagement', color: 'text-blue-400' },
  { key: 'field', label: 'Delivery', color: 'text-emerald-400' },
  { key: 'commercial', label: 'Commercial', color: 'text-[var(--apas-sapphire)]' },
  { key: 'documents', label: 'Docs & Comms', color: 'text-purple-400' },
  { key: 'client', label: 'Client', color: 'text-amber-400' },
  { key: 'admin', label: 'Admin', color: 'text-muted-foreground' },
];

/** Canonical nav items — order within each group matters. */
export const PROJECT_NAV_ITEMS: ProjectNavItem[] = [
  // Engagement / Project
  { value: 'overview', label: 'Overview', shortLabel: 'Overview', icon: LayoutDashboard, group: 'engagement' },
  { value: 'subprojects', label: 'Subprojects', shortLabel: 'Subs', icon: FolderTree, group: 'engagement' },
  { value: 'directory', label: 'People & Team', shortLabel: 'People', icon: Users, group: 'engagement', route: (id) => `/projects/${id}/directory` },
  { value: 'scope', label: 'Scope', shortLabel: 'Scope', icon: ListTree, group: 'engagement' },
  { value: 'schedule', label: 'Schedule', shortLabel: 'Schedule', icon: CalendarDays, group: 'engagement' },
  { value: 'action-items', label: 'Action Items', shortLabel: 'Actions', icon: CheckSquare, group: 'engagement' },

  // Field / Delivery
  { value: 'daily-logs', label: 'Daily Logs', shortLabel: 'Logs', icon: ClipboardList, group: 'field' },
  { value: 'rfis', label: 'RFIs', shortLabel: 'RFIs', icon: HelpCircle, group: 'field' },
  { value: 'submittals', label: 'Submittals', shortLabel: 'Submit', icon: Package, group: 'field' },
  { value: 'punch-list', label: 'Punch List', shortLabel: 'Punch', icon: ListChecks, group: 'field' },
  { value: 'progress', label: 'Progress', shortLabel: 'Progress', icon: TrendingUp, group: 'field' },
  { value: 'procurement', label: 'Procurement', shortLabel: 'Procure', icon: ShoppingCart, group: 'field' },
  { value: 'safety', label: 'Safety', shortLabel: 'Safety', icon: ShieldCheck, group: 'field' },
  { value: 'env-compliance', label: 'Environmental', shortLabel: 'Env', icon: FlaskConical, group: 'field' },
  { value: 'permits', label: 'Permits', shortLabel: 'Permits', icon: FileBadge2, group: 'field' },
  { value: 'site-map', label: 'Site Map', shortLabel: 'Map', icon: Map, group: 'field' },
  { value: 'stores', label: 'Stores & Materials', shortLabel: 'Stores', icon: Warehouse, group: 'field' },
  { value: 'voice-agent', label: 'Voice Complaints', shortLabel: 'Voice', icon: Phone, group: 'field' },
  { value: 'closeout', label: 'Closeout', shortLabel: 'Close', icon: Award, group: 'field' },
  { value: 'project-log', label: 'Project Log', shortLabel: 'Log', icon: ClipboardList, group: 'field' },
  { value: 'meetings', label: 'Meetings', shortLabel: 'Meetings', icon: MessageSquareText, group: 'documents' },

  // Commercial / Money
  { value: 'financials', label: 'Financials', shortLabel: 'Finance', icon: Wallet, group: 'commercial', route: (id) => `/projects/${id}/financials/overview` },
  { value: 'contracts', label: 'Contracts', shortLabel: 'Contracts', icon: FileSignature, group: 'commercial', route: (id) => `/projects/${id}/financials/prime-contract` },
  { value: 'proposals', label: 'Proposals', shortLabel: 'Proposals', icon: Send, group: 'commercial', route: (id) => `/projects/${id}/financials/proposals` },
  { value: 'invoicing', label: 'Client Invoices', shortLabel: 'Invoices', icon: Receipt, group: 'commercial', route: (id) => `/projects/${id}/financials/client-invoices` },

  // Docs & Comms
  { value: 'repository', label: 'Documents', shortLabel: 'Docs', icon: Brain, group: 'documents', route: (id) => `/projects/${id}/repository` },
  { value: 'gallery', label: 'Gallery', shortLabel: 'Gallery', icon: Images, group: 'documents' },
  { value: 'correspondence', label: 'Correspondence', shortLabel: 'Mail', icon: Mail, group: 'documents' },

  // Client
  { value: 'client-updates', label: 'Client Updates', shortLabel: 'Updates', icon: Megaphone, group: 'client', route: (id) => `/projects/${id}/client-updates` },
  { value: 'client-portal', label: 'Client Portal', shortLabel: 'Portal', icon: Users, group: 'client' },

  // Admin
  { value: 'admin', label: 'Project Admin', shortLabel: 'Admin', icon: Settings2, group: 'admin', route: (id) => `/projects/${id}/admin`, adminOnly: true },
];

export function navGroupsForKind(kind: ProjectKind): NavGroupDef[] {
  return kind === 'consulting' ? CONSULTING_GROUPS : CONSTRUCTION_GROUPS;
}

export interface ResolvedNavItem extends ProjectNavItem {
  badge: number | null;
}

export interface GetProjectNavOptions {
  project: ModuleVisibilityProject | null | undefined;
  parent?: ModuleVisibilityProject | null;
  isAdmin?: boolean;
  badges?: Partial<Record<ProjectModuleSlug, number | null>>;
}

/**
 * Visible nav items for a project, filtered by module config + admin role.
 */
export function getProjectNav(opts: GetProjectNavOptions): {
  kind: ProjectKind;
  groups: NavGroupDef[];
  items: ResolvedNavItem[];
} {
  const kind = projectKind(opts.project ?? {});
  const groups = navGroupsForKind(kind);
  const items: ResolvedNavItem[] = [];

  for (const item of PROJECT_NAV_ITEMS) {
    if (item.adminOnly && !opts.isAdmin) continue;
    const visible = opts.parent
      ? resolveModuleVisible(opts.project, item.value, opts.parent)
      : isModuleVisible(opts.project, item.value);
    if (!visible) continue;
    items.push({
      ...item,
      badge: opts.badges?.[item.value] ?? null,
    });
  }

  return { kind, groups, items };
}

/** Routed tab map used by ProjectDetailPage deep links. */
export function routedTabDestinations(projectId: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const item of PROJECT_NAV_ITEMS) {
    if (item.route) out[item.value] = item.route(projectId);
  }
  return out;
}

export const GROUP_ICON_COLORS: Record<string, string> = {
  engagement: 'text-blue-400',
  field: 'text-amber-400',
  commercial: 'text-[var(--apas-sapphire)]',
  documents: 'text-purple-400',
  client: 'text-emerald-400',
  admin: 'text-muted-foreground',
  // legacy
  core: 'text-blue-400',
  compliance: 'text-amber-400',
  reports: 'text-purple-400',
  delivery: 'text-emerald-400',
};

export const GROUP_ICON_BG: Record<string, string> = {
  engagement: 'bg-blue-500/15',
  field: 'bg-amber-500/15',
  commercial: 'bg-[var(--apas-sapphire)]/15',
  documents: 'bg-purple-500/15',
  client: 'bg-emerald-500/15',
  admin: 'bg-muted',
  core: 'bg-blue-500/15',
  compliance: 'bg-amber-500/15',
  reports: 'bg-purple-500/15',
  delivery: 'bg-emerald-500/15',
};
