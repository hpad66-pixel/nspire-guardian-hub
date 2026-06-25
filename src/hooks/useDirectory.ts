/**
 * B1 · Directory — tenant-wide people + organizations queries.
 *
 * Procore Lite's directory has three identity sources:
 *   - Platform users   (profiles rows)
 *   - CRM contacts     (crm_contacts — the existing property-mgmt table we
 *                        reuse as the non-login contact store)
 *   - Organizations    (organizations rows; vendors, subs, GCs, owners, …)
 *
 * This hook wraps search, create, and metadata fetches for each.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { requireTenantId } from "@/lib/tenant";

export interface DirectoryPerson {
  /** `user_id` (profiles.id) or `contact_id` (crm_contacts.id). */
  id: string;
  /** Discriminator — always "user" or "contact". */
  kind: "user" | "contact";
  name: string;
  email: string | null;
  phone: string | null;
  companyName: string | null;
}

export interface Organization {
  id: string;
  tenant_id: string;
  name: string;
  legal_name: string | null;
  kind:
    | "owner" | "gc" | "sub" | "vendor"
    | "consultant" | "municipality" | "other";
  email: string | null;
  phone: string | null;
  website: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
  notes: string | null;
  is_active: boolean;
  vendor_number: string | null;
  tax_id: string | null;
  insurance_expiry: string | null;
  bonding_capacity_cents: number | null;
  created_at: string;
  updated_at: string;
}

/** Unified search across profiles + crm_contacts. */
export function usePersonSearch(query: string) {
  return useQuery<DirectoryPerson[]>({
    queryKey: ["directory-person-search", query],
    enabled: query.trim().length > 0,
    queryFn: async () => {
      const q = query.trim();
      const [users, contacts] = await Promise.all([
        supabase.from("profiles" as any)
          .select("id, display_name, email")
          .or(`display_name.ilike.%${q}%,email.ilike.%${q}%`)
          .limit(25),
        supabase.from("crm_contacts" as any)
          .select("id, first_name, last_name, email, phone, company_name")
          .or(
            `first_name.ilike.%${q}%,last_name.ilike.%${q}%,` +
            `email.ilike.%${q}%,company_name.ilike.%${q}%`,
          )
          .limit(25),
      ]);
      if (users.error) throw users.error;
      if (contacts.error) throw contacts.error;

      const mappedUsers: DirectoryPerson[] = ((users.data ?? []) as any[]).map((u) => ({
        id: u.id,
        kind: "user",
        name: u.display_name ?? u.email ?? "(unnamed)",
        email: u.email ?? null,
        phone: null,
        companyName: null,
      }));
      const mappedContacts: DirectoryPerson[] = ((contacts.data ?? []) as any[]).map((c) => ({
        id: c.id,
        kind: "contact",
        name: [c.first_name, c.last_name].filter(Boolean).join(" ") || c.email || "(unnamed)",
        email: c.email ?? null,
        phone: c.phone ?? null,
        companyName: c.company_name ?? null,
      }));
      return [...mappedUsers, ...mappedContacts];
    },
  });
}

export function useOrganizations(opts?: { search?: string; kind?: Organization["kind"] }) {
  const qc = useQueryClient();

  const list = useQuery<Organization[]>({
    queryKey: ["organizations", opts?.search ?? "", opts?.kind ?? "any"],
    queryFn: async () => {
      let q = supabase.from("organizations" as any)
        .select("*")
        .eq("is_active", true)
        .order("name");
      if (opts?.kind) q = q.eq("kind", opts.kind);
      if (opts?.search?.trim()) q = q.ilike("name", `%${opts.search.trim()}%`);
      const { data, error } = await q.limit(200);
      if (error) throw error;
      return (data ?? []) as unknown as Organization[];
    },
  });

  const create = useMutation({
    mutationFn: async (input: {
      name: string; kind?: Organization["kind"];
      email?: string; phone?: string; website?: string;
      vendor_number?: string;
    }) => {
      const tenant_id = await requireTenantId();
      const { data, error } = await supabase.from("organizations" as any)
        .insert({
          tenant_id,
          name: input.name,
          kind: input.kind ?? "vendor",
          email: input.email ?? null,
          phone: input.phone ?? null,
          website: input.website ?? null,
          vendor_number: input.vendor_number ?? null,
          is_active: true,
        } as any)
        .select().single();
      if (error) throw error;
      return data as unknown as Organization;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["organizations"] }),
  });

  const update = useMutation({
    mutationFn: async (input: Partial<Organization> & { id: string }) => {
      const { id, ...patch } = input;
      const { error } = await supabase.from("organizations" as any)
        .update(patch as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["organizations"] }),
  });

  return { ...list, create, update };
}

/** Create a brand-new crm_contacts row from the AddPersonDialog. */
export function useCreateContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      first_name: string; last_name?: string;
      email?: string; phone?: string;
      company_name?: string;
    }) => {
      const { data, error } = await supabase.from("crm_contacts" as any)
        .insert({
          first_name: input.first_name,
          last_name: input.last_name ?? null,
          email: input.email ?? null,
          phone: input.phone ?? null,
          company_name: input.company_name ?? null,
          contact_type: "business",
        } as any)
        .select().single();
      if (error) throw error;
      return data as any;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["directory-person-search"] }),
  });
}

/** Look up the profiles or crm_contacts row referenced by a directory entry. */
export function usePersonByReference(
  userId: string | null,
  contactId: string | null,
) {
  return useQuery<DirectoryPerson | null>({
    queryKey: ["directory-person-by-ref", userId, contactId],
    enabled: Boolean(userId || contactId),
    queryFn: async () => {
      if (userId) {
        const { data, error } = await supabase
          .from("profiles" as any).select("id, display_name, email")
          .eq("id", userId).maybeSingle();
        if (error) throw error;
        if (!data) return null;
        return {
          id: (data as any).id, kind: "user",
          name: (data as any).display_name ?? (data as any).email ?? "(unnamed)",
          email: (data as any).email ?? null,
          phone: null, companyName: null,
        };
      }
      if (contactId) {
        const { data, error } = await supabase
          .from("crm_contacts" as any)
          .select("id, first_name, last_name, email, phone, company_name")
          .eq("id", contactId).maybeSingle();
        if (error) throw error;
        if (!data) return null;
        return {
          id: (data as any).id, kind: "contact",
          name: [(data as any).first_name, (data as any).last_name]
            .filter(Boolean).join(" ") || (data as any).email || "(unnamed)",
          email: (data as any).email ?? null,
          phone: (data as any).phone ?? null,
          companyName: (data as any).company_name ?? null,
        };
      }
      return null;
    },
  });
}

export function useOrganization(id: string | null) {
  return useQuery<Organization | null>({
    queryKey: ["organization", id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data, error } = await supabase.from("organizations" as any)
        .select("*").eq("id", id!).maybeSingle();
      if (error) throw error;
      return (data as unknown as Organization | null) ?? null;
    },
  });
}
