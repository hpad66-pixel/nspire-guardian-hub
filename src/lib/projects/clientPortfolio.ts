import { isGlorietaSewerProject } from '@/lib/projectTileAmounts';

export type ClientPortfolioProjectLike = {
  id?: string | null;
  name?: string | null;
  status?: string | null;
  project_type?: string | null;
  client_id?: string | null;
  property_id?: string | null;
  client?: { name?: string | null } | null;
  property?: { name?: string | null } | null;
  closed_at?: string | null;
};

export type ClientPortfolioGroup<T extends ClientPortfolioProjectLike = ClientPortfolioProjectLike> = {
  id: string;
  name: string;
  clientId: string | null;
  projects: T[];
};

const R4_LABEL = 'R4';
const R4_STANDALONE_CONSULTING_NAMES = new Set([
  'review',
  'approval',
  'assessment',
  'backflow preventer',
  'boundary wall monitoring network',
]);

function normalizedText(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase();
}

export function isR4ClientName(value: string | null | undefined): boolean {
  const text = normalizedText(value);
  return text === 'r4' || text.includes('r4 capital') || text.includes('r4 ');
}

export function isGlorietaPortfolioProject(project: ClientPortfolioProjectLike): boolean {
  if (isGlorietaSewerProject(project)) return true;

  const haystack = [
    project.name,
    project.client?.name,
    project.property?.name,
  ].map(normalizedText).join(' ');

  return haystack.includes('glorieta') || haystack.includes('glorita');
}

export function isR4StandaloneConsultingProject(project: ClientPortfolioProjectLike): boolean {
  if (project.client_id) return false;
  const name = normalizedText(project.name);
  return R4_STANDALONE_CONSULTING_NAMES.has(name);
}

export function isR4PortfolioAliasProject(project: ClientPortfolioProjectLike): boolean {
  return isGlorietaPortfolioProject(project) || isR4StandaloneConsultingProject(project);
}

export function findR4ClientId(projects: ClientPortfolioProjectLike[]): string | null {
  return projects.find((project) => project.client_id && isR4ClientName(project.client?.name))?.client_id ?? null;
}

export function findR4ClientName(projects: ClientPortfolioProjectLike[]): string {
  return projects.find((project) => project.client_id && isR4ClientName(project.client?.name))?.client?.name ?? R4_LABEL;
}

export function resolveClientPortfolioProject<T extends ClientPortfolioProjectLike>(
  project: T,
  projects: ClientPortfolioProjectLike[],
): T {
  if (!isR4PortfolioAliasProject(project)) return project;

  const r4ClientId = findR4ClientId(projects);
  const r4ClientName = findR4ClientName(projects);

  return {
    ...project,
    client_id: r4ClientId ?? project.client_id ?? null,
    client: { ...(project.client ?? {}), name: r4ClientName },
    project_type: isR4StandaloneConsultingProject(project) ? 'consulting' : project.project_type,
  };
}

export function resolveClientPortfolioProjects<T extends ClientPortfolioProjectLike>(projects: T[]): T[] {
  return projects.map((project) => resolveClientPortfolioProject(project, projects));
}

export function shouldIncludeProjectForClientFilter(
  project: ClientPortfolioProjectLike,
  clientId: string | null,
  selectedClientName: string | null | undefined,
): boolean {
  if (!clientId) return true;
  if (project.client_id === clientId) return true;
  return isR4ClientName(selectedClientName) && isR4PortfolioAliasProject(project);
}

export function groupProjectsByClientPortfolio<T extends ClientPortfolioProjectLike>(
  projects: T[],
): ClientPortfolioGroup<T>[] {
  const resolvedProjects = resolveClientPortfolioProjects(projects);
  const groups = new Map<string, ClientPortfolioGroup<T>>();

  for (const project of resolvedProjects) {
    const clientId = project.client_id ?? null;
    const clientName = project.client?.name ?? project.property?.name ?? 'Standalone Projects';
    const key = clientId ?? `property:${project.property_id ?? clientName}`;
    const current = groups.get(key) ?? {
      id: key,
      name: clientName,
      clientId,
      projects: [],
    };
    current.projects.push(project);
    groups.set(key, current);
  }

  return [...groups.values()]
    .map((group) => ({
      ...group,
      projects: group.projects.sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '')),
    }))
    .sort((a, b) => b.projects.length - a.projects.length || a.name.localeCompare(b.name))
    .slice(0, 8);
}
