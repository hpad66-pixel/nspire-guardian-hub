/**
 * WS-2 / WS-4 · Global search helpers.
 *
 * Pure functions so the matching + detail-route logic for #9 can be unit
 * tested without rendering the cmdk palette. RLS already scopes the rows
 * the hooks return; these helpers only filter/route what the user can see.
 */

/** Case-insensitive substring match across several fields. Empty query matches nothing useful → caller guards on `search`. */
export function matchesQuery(haystacks: (string | null | undefined)[], query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return false;
  return haystacks.some((h) => (h ?? '').toLowerCase().includes(q));
}

/** Detail route for an RFI — deep-links to the project's RFIs tab. */
export function rfiRoute(projectId: string): string {
  return `/projects/${projectId}?tab=rfis`;
}

/** Detail route for a submittal — deep-links to the project's Submittals tab. */
export function submittalRoute(projectId: string): string {
  return `/projects/${projectId}?tab=submittals`;
}

/** Contacts and documents are org-level list pages. */
export const contactsRoute = '/contacts';
export const documentsRoute = '/documents';
