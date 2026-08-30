/**
 * Project-scoped owner portal URLs.
 *
 * Authenticated clients land on /owner-portal/projects/:projectId/...
 * so each project has its own address, and multi-project clients can tab
 * between them without losing the current section.
 */

const PROJECT_PREFIX = "/owner-portal/projects/";

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

export function uniqueOwnerProjects<T extends { project_id: string; title: string; project_name?: string | null }>(
  contracts: T[],
) {
  const seen = new Map<string, { id: string; name: string; contract: T }>();
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
