export type AppPortalKind = 'main' | 'sub' | 'owner' | 'ops';

/**
 * Portal-only users should not see the internal AppLayout shell. Owner and Ops
 * portals are mounted outside AppLayout, so route them back to their focused UI.
 */
export function internalAppRedirectForPortalKind(kind: AppPortalKind | null | undefined) {
  if (kind === 'owner') return '/owner-portal';
  if (kind === 'ops') return '/ops-portal';
  return null;
}
