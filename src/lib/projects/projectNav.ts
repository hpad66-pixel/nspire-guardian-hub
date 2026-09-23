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
  Award, Receipt, Send, Megaphone, FileText, Settings2, FileBadge2, Map, Warehouse, Phone, ScanEye,
  UserRoundCheck, FileChartColumn,
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
  { key: 'engagement', label: 'Project setup', color: 'text-[#335c7d]' },
  { key: 'commercial', label: 'Money', color: 'text-[#0d6b57]' },
  { key: 'field', label: 'Field execution', color: 'text-[#8b5a15]' },
  { key: 'documents', label: 'Docs & Comms', color: 'text-[#5b5fc7]' },
  { key: 'client', label: 'Client', color: 'text-[#0f766e]' },
  { key: 'admin', label: 'Admin', color: 'text-slate-600' },
];

const CONSULTING_GROUPS: NavGroupDef[] = [
  { key: 'engagement', label: 'Engagement setup', color: 'text-[#335c7d]' },
  { key: 'commercial', label: 'Money', color: 'text-[#0d6b57]' },
  { key: 'field', label: 'Delivery', color: 'text-[#8b5a15]' },
  { key: 'documents', label: 'Docs & Comms', color: 'text-[#5b5fc7]' },
  { key: 'client', label: 'Client', color: 'text-[#0f766e]' },
  { key: 'admin', label: 'Admin', color: 'text-slate-600' },
];

/** Canonical nav items — order within each group matters. */
export const PROJECT_NAV_ITEMS: ProjectNavItem[] = [
  // Engagement / Project
  { value: 'overview', label: 'Overview', shortLabel: 'Overview', icon: LayoutDashboard, group: 'engagement' },
  { value: 'scope', label: 'Scope', shortLabel: 'Scope', icon: ListTree, group: 'engagement' },
  { value: 'schedule', label: 'Schedule', shortLabel: 'Schedule', icon: CalendarDays, group: 'engagement' },
  { value: 'action-items', label: 'Action Items', shortLabel: 'Actions', icon: CheckSquare, group: 'engagement' },
  { value: 'directory', label: 'People & Team', shortLabel: 'People', icon: Users, group: 'engagement', route: (id) => `/projects/${id}/directory` },
  { value: 'contractors', label: 'Contractor Readiness', shortLabel: 'Contractors', icon: UserRoundCheck, group: 'engagement', route: (id) => `/projects/${id}/contractors` },
  { value: 'subprojects', label: 'Subprojects', shortLabel: 'Subs', icon: FolderTree, group: 'engagement' },

  // Commercial / Money — money is the first operational section after setup.
  { value: 'financials', label: 'Financials', shortLabel: 'Finance', icon: Wallet, group: 'commercial', route: (id) => `/projects/${id}/financials/overview` },
  { value: 'contracts', label: 'Contracts', shortLabel: 'Contracts', icon: FileSignature, group: 'commercial', route: (id) => `/projects/${id}/financials/prime-contract` },
  { value: 'proposals', label: 'Proposals', shortLabel: 'Proposals', icon: Send, group: 'commercial', route: (id) => `/projects/${id}/financials/proposals` },
  { value: 'invoicing', label: 'Client Invoices', shortLabel: 'Invoices', icon: Receipt, group: 'commercial', route: (id) => `/projects/${id}/financials/client-invoices` },

  // Field / Delivery — start with the field record, then controls, execution, risk, progress, and closeout.
  { value: 'daily-logs', label: 'Daily Logs', shortLabel: 'Logs', icon: ClipboardList, group: 'field' },
  { value: 'accountability', label: 'Field Accountability', shortLabel: 'Accountability', icon: ScanEye, group: 'field', route: (id) => `/projects/${id}/accountability` },
  { value: 'permits', label: 'Permits', shortLabel: 'Permits', icon: FileBadge2, group: 'field' },
  { value: 'rfis', label: 'RFIs', shortLabel: 'RFIs', icon: HelpCircle, group: 'field' },
  { value: 'submittals', label: 'Submittals', shortLabel: 'Submit', icon: Package, group: 'field' },
  { value: 'punch-list', label: 'Punch List', shortLabel: 'Punch', icon: ListChecks, group: 'field' },
  { value: 'progress', label: 'Progress', shortLabel: 'Progress', icon: TrendingUp, group: 'field' },
  { value: 'procurement', label: 'Procurement', shortLabel: 'Procure', icon: ShoppingCart, group: 'field' },
  { value: 'safety', label: 'Safety', shortLabel: 'Safety', icon: ShieldCheck, group: 'field' },
  { value: 'env-compliance', label: 'Environmental', shortLabel: 'Env', icon: FlaskConical, group: 'field' },
  { value: 'site-map', label: 'Site Map', shortLabel: 'Map', icon: Map, group: 'field' },
  { value: 'stores', label: 'Stores & Materials', shortLabel: 'Stores', icon: Warehouse, group: 'field' },
  { value: 'voice-agent', label: 'Voice Complaints', shortLabel: 'Voice', icon: Phone, group: 'field' },
  { value: 'closeout', label: 'Closeout', shortLabel: 'Close', icon: Award, group: 'field' },
  { value: 'meetings', label: 'Meetings', shortLabel: 'Meetings', icon: MessageSquareText, group: 'documents' },

  // Docs & Comms
  { value: 'project-log', label: 'Project Log', shortLabel: 'Log', icon: ClipboardList, group: 'documents' },
  { value: 'reports', label: 'Reports', shortLabel: 'Reports', icon: FileChartColumn, group: 'documents', route: (id) => `/projects/${id}/reports` },
  { value: 'repository', label: 'Documents', shortLabel: 'Docs', icon: FileText, group: 'documents', route: (id) => `/projects/${id}/repository` },
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
  engagement: 'text-[#335c7d]',
  commercial: 'text-[#0d6b57]',
  field: 'text-[#8b5a15]',
  documents: 'text-[#5b5fc7]',
  client: 'text-[#0f766e]',
  admin: 'text-slate-600',
  // legacy
  core: 'text-[#335c7d]',
  compliance: 'text-[#8b5a15]',
  reports: 'text-[#5b5fc7]',
  delivery: 'text-[#0f766e]',
};

export const GROUP_ICON_BG: Record<string, string> = {
  engagement: 'bg-[#dbeafe]',
  commercial: 'bg-[#d6f5ea]',
  field: 'bg-[#fff2cc]',
  documents: 'bg-[#ecebff]',
  client: 'bg-[#ccfbf1]',
  admin: 'bg-slate-200',
  core: 'bg-[#dbeafe]',
  compliance: 'bg-[#fff2cc]',
  reports: 'bg-[#ecebff]',
  delivery: 'bg-[#ccfbf1]',
};
