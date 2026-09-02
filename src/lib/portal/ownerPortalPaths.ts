/**
 * Project-scoped owner portal URLs.
 *
 * Authenticated clients land on /owner-portal/projects/:projectId/...
 * so each project has its own address, and multi-project clients can tab
 * between them without losing the current section.
 */

const PROJECT_PREFIX = "/owner-portal/projects/";

/** Remember which client portfolio a public /portal/:slug link opened. */
export const OWNER_PORTAL_CLIENT_KEY = "owner-portal-client-id";

export function rememberOwnerPortalClient(clientId: string | null | undefined) {
  if (typeof sessionStorage === "undefined") return;
  if (clientId) sessionStorage.setItem(OWNER_PORTAL_CLIENT_KEY, clientId);
}

export function readRememberedOwnerPortalClient() {
  if (typeof sessionStorage === "undefined") return null;
  return sessionStorage.getItem(OWNER_PORTAL_CLIENT_KEY);
}

/** Prefer an explicit project, then the first tab in the active portfolio. */
export function pickOwnerPortalLandingProject(input: {
  requestedProjectId?: string | null;
  selectedProjectId?: string | null;
  projectIds: string[];
  contractProjectIds?: string[];
}) {
  const {
    requestedProjectId = null,
    selectedProjectId = null,
    projectIds,
    contractProjectIds = [],
  } = input;
  if (requestedProjectId && projectIds.includes(requestedProjectId)) return requestedProjectId;
  if (requestedProjectId && contractProjectIds.includes(requestedProjectId)) return requestedProjectId;
  if (selectedProjectId && projectIds.includes(selectedProjectId)) return selectedProjectId;
  if (projectIds.length === 1) return projectIds[0] ?? null;
  return projectIds[0] ?? contractProjectIds[0] ?? null;
}

export function ownerPortalPath(
  projectId: string | null | undefined,
  suffix = "",
  hash = "",
) {
  const normalized = suffix && !suffix.startsWith("/") ? `/${suffix}` : suffix;
  if (!projectId) return `/owner-portal${normalized}${hash}`;
  return `${PROJECT_PREFIX}${projectId}${normalized}${hash}`;
}

/** Path after /owner-portal/projects/:projectId, e.g. "/documents" or "". */
export function ownerPortalSection(pathname: string) {
  const match = pathname.match(/^\/owner-portal\/projects\/[^/]+(\/.*)?$/);
  return match?.[1] ?? "";
}

export function isOwnerPortalProjectPath(pathname: string) {
  return pathname.startsWith(PROJECT_PREFIX);
}

/**
 * Rewrite a legacy flat /owner-portal/... path onto a project.
 * Returns null when the path is already project-scoped.
 */
export function rewriteOwnerPortalPath(pathname: string, projectId: string) {
  if (isOwnerPortalProjectPath(pathname) || !pathname.startsWith("/owner-portal")) {
    return null;
  }
  const rest = pathname.slice("/owner-portal".length);
  return `${PROJECT_PREFIX}${projectId}${rest}`;
}

/** Keep the current section when switching projects, except record-specific pages. */
export function ownerPortalProjectSwitchPath(pathname: string, nextProjectId: string) {
  if (/\/(cos|pay-apps)\//.test(pathname)) {
    return ownerPortalPath(nextProjectId);
  }
  if (isOwnerPortalProjectPath(pathname)) {
    return ownerPortalPath(nextProjectId, ownerPortalSection(pathname));
  }
  return rewriteOwnerPortalPath(pathname, nextProjectId) ?? ownerPortalPath(nextProjectId);
}

export type OwnerProjectSource = {
  id: string;
  name: string;
  client_id?: string | null;
  client_name?: string | null;
  status?: string | null;
};

export type OwnerContractSource = {
  project_id: string;
  title: string;
  project_name?: string | null;
};

export type OwnerProjectTab<TContract = OwnerContractSource> = {
  id: string;
  name: string;
  contract: TContract | null;
  client_id?: string | null;
  client_name?: string | null;
  status?: string | null;
};

export function uniqueOwnerProjects<T extends OwnerContractSource>(
  contracts: T[],
) {
  const seen = new Map<string, OwnerProjectTab<T>>();
  for (const contract of contracts) {
    if (!contract.project_id || seen.has(contract.project_id)) continue;
    seen.set(contract.project_id, {
      id: contract.project_id,
      name: contract.project_name || contract.title,
      contract,
    });
  }
  return [...seen.values()];
}

/**
 * Build portal tabs from every project the client can see, not only jobs
 * that already have a prime contract. Stormdrain / consulting work still
 * appears next to contracted siblings.
 */
export function buildOwnerProjectTabs<T extends OwnerContractSource>(
  projects: OwnerProjectSource[],
  contracts: T[] = [],
): OwnerProjectTab<T>[] {
  const contractByProject = new Map<string, T>();
  for (const contract of contracts) {
    if (!contract.project_id || contractByProject.has(contract.project_id)) continue;
    contractByProject.set(contract.project_id, contract);
  }

  const seen = new Map<string, OwnerProjectTab<T>>();
  for (const project of projects) {
    if (!project.id || seen.has(project.id)) continue;
    seen.set(project.id, {
      id: project.id,
      name: project.name || contractByProject.get(project.id)?.title || "Project",
      contract: contractByProject.get(project.id) ?? null,
      client_id: project.client_id ?? null,
      client_name: project.client_name ?? null,
      status: project.status ?? null,
    });
  }
  for (const contract of contracts) {
    if (!contract.project_id || seen.has(contract.project_id)) continue;
    seen.set(contract.project_id, {
      id: contract.project_id,
      name: contract.project_name || contract.title,
      contract,
    });
  }
  return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name));
}

/** Staff preview is tenant-wide; keep the tab strip scoped to one client. */
export function filterOwnerProjectsForClient<T>(
  projects: OwnerProjectTab<T>[],
  anchorProjectId: string | null,
  clientId?: string | null,
) {
  if (projects.length <= 1) return projects;
  if (anchorProjectId) {
    const anchor = projects.find((project) => project.id === anchorProjectId);
    if (anchor?.client_id) {
      const siblings = projects.filter((project) => project.client_id === anchor.client_id);
      return siblings.length ? siblings : [anchor];
    }
    if (anchor) return [anchor];
  }
  if (clientId) {
    const byClient = projects.filter((project) => project.client_id === clientId);
    if (byClient.length) return byClient;
  }
  return projects;
}
