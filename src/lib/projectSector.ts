import {
  Landmark, Briefcase, Home, Building2, FolderKanban, Globe,
  type LucideIcon,
} from 'lucide-react';
import type { Project } from '@/hooks/useProjects';

/**
 * Sector = the "kind of owner" a project belongs to, derived from the linked
 * organization's client_type (or the project being a property/standalone job).
 * Used to color-code and filter projects at a glance as the portfolio grows.
 *
 * Colors are deliberately chosen to NOT collide with the health palette
 * (green / amber / red / slate) so a card's sector accent reads independently
 * of its health badge.
 */
export type ProjectSector =
  | 'government'
  | 'private'
  | 'property_mgmt'
  | 'internal'
  | 'property'
  | 'other';

export interface SectorConfig {
  key: ProjectSector;
  label: string;
  icon: LucideIcon;
  bg: string;
  text: string;
  border: string;
  dot: string;
  /** Left-border accent class for cards (border-l-4 + this). */
  accent: string;
}

export const SECTOR_CONFIG: Record<ProjectSector, SectorConfig> = {
  government: {
    key: 'government', label: 'Government', icon: Landmark,
    bg: 'bg-blue-50 dark:bg-blue-950/30', text: 'text-blue-700 dark:text-blue-400',
    border: 'border-blue-200 dark:border-blue-800', dot: 'bg-blue-500', accent: 'border-l-blue-500',
  },
  private: {
    key: 'private', label: 'Private Sector', icon: Briefcase,
    bg: 'bg-emerald-50 dark:bg-emerald-950/30', text: 'text-emerald-700 dark:text-emerald-400',
    border: 'border-emerald-200 dark:border-emerald-800', dot: 'bg-emerald-500', accent: 'border-l-emerald-500',
  },
  property_mgmt: {
    key: 'property_mgmt', label: 'Property Mgmt', icon: Home,
    bg: 'bg-violet-50 dark:bg-violet-950/30', text: 'text-violet-700 dark:text-violet-400',
    border: 'border-violet-200 dark:border-violet-800', dot: 'bg-violet-500', accent: 'border-l-violet-500',
  },
  internal: {
    key: 'internal', label: 'Internal', icon: Building2,
    bg: 'bg-cyan-50 dark:bg-cyan-950/30', text: 'text-cyan-700 dark:text-cyan-400',
    border: 'border-cyan-200 dark:border-cyan-800', dot: 'bg-cyan-500', accent: 'border-l-cyan-500',
  },
  property: {
    key: 'property', label: 'Property', icon: FolderKanban,
    bg: 'bg-teal-50 dark:bg-teal-950/30', text: 'text-teal-700 dark:text-teal-400',
    border: 'border-teal-200 dark:border-teal-800', dot: 'bg-teal-500', accent: 'border-l-teal-500',
  },
  other: {
    key: 'other', label: 'Other', icon: Globe,
    bg: 'bg-slate-100 dark:bg-slate-800/60', text: 'text-slate-600 dark:text-slate-300',
    border: 'border-slate-200 dark:border-slate-700', dot: 'bg-slate-400', accent: 'border-l-slate-400',
  },
};

/** Stable display order for the sector filter strip / legends. */
export const SECTOR_ORDER: ProjectSector[] = [
  'government', 'private', 'property_mgmt', 'internal', 'property', 'other',
];

/** Resolve a project's sector from its linked organization's client_type. */
export function getProjectSector(project: Project): ProjectSector {
  const clientType = (project as any).client?.client_type as string | undefined;
  switch (clientType) {
    case 'government': return 'government';
    case 'business_client': return 'private';
    case 'property_management': return 'property_mgmt';
    case 'internal_org': return 'internal';
    case 'other': return 'other';
  }
  // No linked organization → owned-property or standalone project.
  if ((project as any).project_type === 'property') return 'property';
  return 'other';
}

export function getSectorConfig(project: Project): SectorConfig {
  return SECTOR_CONFIG[getProjectSector(project)];
}
