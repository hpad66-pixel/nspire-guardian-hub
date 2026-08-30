/**
 * Pure helpers for contact ↔ project / property assignment and
 * email recipient scoping. Kept side-effect free so Vitest can
 * cover the filter contract without a live database.
 */
import type { CRMContact } from "@/hooks/useCRMContacts";

export type ContactEmailScope = "workspace" | "project";

export function contactDisplayName(contact: Pick<CRMContact, "first_name" | "last_name" | "company_name">): string {
  const name = [contact.first_name, contact.last_name].filter(Boolean).join(" ");
  return contact.company_name ? `${name} (${contact.company_name})` : name;
}

/** Emailable contacts at workspace (master) or project-directory scope. */
export function filterContactsForEmail(
  contacts: CRMContact[],
  opts: {
    scope: ContactEmailScope;
    projectContactIds?: Iterable<string>;
    search?: string;
  },
): CRMContact[] {
  const q = (opts.search ?? "").trim().toLowerCase();
  const projectIds = new Set(opts.projectContactIds ?? []);

  return contacts.filter((contact) => {
    if (!contact.email) return false;
    if (opts.scope === "project" && !projectIds.has(contact.id)) return false;
    if (!q) return true;
    const haystack = [
      contact.first_name,
      contact.last_name,
      contact.company_name,
      contact.email,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });
}

export function mergeAssignmentIds(
  primaryId: string | null | undefined,
  linkedIds: Iterable<string> = [],
): string[] {
  const merged = new Set<string>();
  if (primaryId) merged.add(primaryId);
  for (const id of linkedIds) {
    if (id) merged.add(id);
  }
  return Array.from(merged);
}

export function diffIds(current: Iterable<string>, next: Iterable<string>): {
  toAdd: string[];
  toRemove: string[];
} {
  const currentSet = new Set(current);
  const nextSet = new Set(next);
  return {
    toAdd: Array.from(nextSet).filter((id) => !currentSet.has(id)),
    toRemove: Array.from(currentSet).filter((id) => !nextSet.has(id)),
  };
}
