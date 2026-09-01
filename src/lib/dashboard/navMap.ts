/**
 * Dashboard "Where to go" map — categorized launchers so the Command Center
 * explains the product journey instead of dumping flat module tiles.
 */

export type DashboardNavItemId =
  | 'my-day'
  | 'projects'
  | 'work-orders'
  | 'cockpit'
  | 'permits'
  | 'inspections'
  | 'daily-reports'
  | 'daily-grounds'
  | 'clients'
  | 'contacts'
  | 'messages'
  | 'inbox'
  | 'voice'
  | 'stores'
  | 'reports'
  | 'documents'
  | 'portals'
  | 'people';

export interface DashboardNavItemDef {
  id: DashboardNavItemId;
  label: string;
  description: string;
  to: string;
  /** Optional module flag from ModuleContext — omit = always show. */
  module?:
    | 'cockpitEnabled'
    | 'propertyMgmtEnabled'
    | 'nspireEnabled'
    | 'dailyGroundsEnabled'
    | 'emailInboxEnabled'
    | 'aiEnabled'
    | 'reportsEnabled'
    | 'clientPortalEnabled'
    | 'projectsEnabled';
  /** Soft hint badge key resolved by the page (counts). */
  badgeKey?: 'critical' | 'warnings' | 'issues' | 'workOrders' | 'projects' | 'messages' | 'reviews';
}

export interface DashboardNavCategoryDef {
  id: string;
  title: string;
  subtitle: string;
  items: DashboardNavItemDef[];
}

/** Canonical navigation map for the Dashboard entrance. */
export const DASHBOARD_NAV_CATEGORIES: DashboardNavCategoryDef[] = [
  {
    id: 'work',
    title: 'Work',
    subtitle: 'Your plate, projects, and field execution',
    items: [
      {
        id: 'my-day',
        label: 'My Day',
        description: 'Personal plate — overdue, due today, waiting on others',
        to: '/my-day',
      },
      {
        id: 'projects',
        label: 'Projects',
        description: 'Construction & consulting workspaces',
        to: '/projects',
        badgeKey: 'projects',
      },
      {
        id: 'work-orders',
        label: 'Work Orders',
        description: 'Maintenance queue, aging, and backlog',
        to: '/work-orders',
        badgeKey: 'workOrders',
        module: 'propertyMgmtEnabled',
      },
      {
        id: 'cockpit',
        label: 'Cockpit',
        description: 'Portfolio health across every project',
        to: '/cockpit',
        module: 'cockpitEnabled',
      },
    ],
  },
  {
    id: 'field',
    title: 'Field & compliance',
    subtitle: 'Capture, inspect, and close out in the field',
    items: [
      {
        id: 'permits',
        label: 'Compliance Permits',
        description: 'Scan, annotate, and track permit closeout',
        to: '/permits',
        module: 'propertyMgmtEnabled',
      },
      {
        id: 'inspections',
        label: 'Inspections',
        description: 'NSPIRE / review queue and sign-off',
        to: '/inspections',
        module: 'nspireEnabled',
        badgeKey: 'reviews',
      },
      {
        id: 'daily-grounds',
        label: 'Daily Grounds',
        description: 'Site walks tied to inspectable assets',
        to: '/daily-grounds',
        module: 'dailyGroundsEnabled',
      },
      {
        id: 'daily-reports',
        label: 'Daily Reports',
        description: 'Field activity logs next to inspections',
        to: '/daily-reports',
        module: 'propertyMgmtEnabled',
      },
    ],
  },
  {
    id: 'money-people',
    title: 'Money, people & inbox',
    subtitle: 'Clients, communications, and the paper trail',
    items: [
      {
        id: 'clients',
        label: 'Clients',
        description: 'Organizations and project portfolios',
        to: '/clients',
        module: 'projectsEnabled',
      },
      {
        id: 'contacts',
        label: 'Contacts',
        description: 'CRM — attach people to projects & properties',
        to: '/contacts',
      },
      {
        id: 'messages',
        label: 'Messages',
        description: 'Internal team threads',
        to: '/messages',
        badgeKey: 'messages',
      },
      {
        id: 'inbox',
        label: 'Inbox',
        description: 'Email mailbox for project correspondence',
        to: '/inbox',
        module: 'emailInboxEnabled',
      },
    ],
  },
  {
    id: 'ops-insights',
    title: 'Ops & insights',
    subtitle: 'Resident voice, stores, reports, and portals',
    items: [
      {
        id: 'voice',
        label: 'Voice Complaints',
        description: 'ElevenLabs hotline → tickets → work orders',
        to: '/voice-agent',
        module: 'aiEnabled',
      },
      {
        id: 'reports',
        label: 'Reports',
        description: 'Analytics across modules',
        to: '/reports',
        module: 'reportsEnabled',
      },
      {
        id: 'documents',
        label: 'Documents',
        description: 'Shared files and compliance packs',
        to: '/documents',
      },
      {
        id: 'portals',
        label: 'Client portals',
        description: 'Owner / sub portals and invites',
        to: '/portals',
        module: 'clientPortalEnabled',
      },
      {
        id: 'people',
        label: 'People',
        description: 'Team directory and compliance',
        to: '/people',
      },
    ],
  },
];

export function filterDashboardNavCategories(
  categories: DashboardNavCategoryDef[],
  isEnabled: (module: NonNullable<DashboardNavItemDef['module']>) => boolean,
): DashboardNavCategoryDef[] {
  return categories
    .map((cat) => ({
      ...cat,
      items: cat.items.filter((item) => !item.module || isEnabled(item.module)),
    }))
    .filter((cat) => cat.items.length > 0);
}
