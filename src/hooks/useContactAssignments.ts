import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { requireTenantId } from "@/lib/tenant";
import { diffIds, mergeAssignmentIds } from "@/lib/crm/contactAssignments";
import { toast } from "sonner";

export interface ContactAssignmentMaps {
  projectsByContact: Record<string, string[]>;
  propertiesByContact: Record<string, string[]>;
}

export async function fetchProjectContactIds(projectId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("project_directory_entries" as any)
    .select("contact_id")
    .eq("project_id", projectId)
    .not("contact_id", "is", null);
  if (error) throw error;
  return Array.from(
    new Set(
      ((data ?? []) as Array<{ contact_id: string | null }>)
        .map((row) => row.contact_id)
        .filter((id): id is string => Boolean(id)),
    ),
  );
}

export async function fetchContactProjectIds(contactId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("project_directory_entries" as any)
    .select("project_id")
    .eq("contact_id", contactId);
  if (error) throw error;
  return ((data ?? []) as Array<{ project_id: string }>).map((row) => row.project_id);
}

export async function fetchContactPropertyIds(contactId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("crm_contact_properties" as any)
    .select("property_id")
    .eq("contact_id", contactId);
  if (error) throw error;
  return ((data ?? []) as Array<{ property_id: string }>).map((row) => row.property_id);
}

export async function syncContactProjects(contactId: string, projectIds: string[]): Promise<void> {
  const tenantId = await requireTenantId();
  const { data: existing, error: readError } = await supabase
    .from("project_directory_entries" as any)
    .select("id, project_id")
    .eq("contact_id", contactId);
  if (readError) throw readError;

  const rows = (existing ?? []) as Array<{ id: string; project_id: string }>;
  const { toAdd, toRemove } = diffIds(
    rows.map((row) => row.project_id),
    projectIds,
  );

  if (toRemove.length > 0) {
    const removeIds = rows.filter((row) => toRemove.includes(row.project_id)).map((row) => row.id);
    const { error } = await supabase
      .from("project_directory_entries" as any)
      .delete()
      .in("id", removeIds);
    if (error) throw error;
  }

  if (toAdd.length > 0) {
    const { error } = await supabase.from("project_directory_entries" as any).insert(
      toAdd.map((project_id) => ({
        tenant_id: tenantId,
        project_id,
        contact_id: contactId,
        role_label: "Contact",
      })) as any,
    );
    if (error) throw error;
  }
}

export async function syncContactProperties(
  contactId: string,
  propertyIds: string[],
  primaryPropertyId?: string | null,
): Promise<void> {
  const tenantId = await requireTenantId();
  const { data: existing, error: readError } = await supabase
    .from("crm_contact_properties" as any)
    .select("id, property_id")
    .eq("contact_id", contactId);
  if (readError) throw readError;

  const rows = (existing ?? []) as Array<{ id: string; property_id: string }>;
  const { toAdd, toRemove } = diffIds(
    rows.map((row) => row.property_id),
    propertyIds,
  );

  if (toRemove.length > 0) {
    const removeIds = rows.filter((row) => toRemove.includes(row.property_id)).map((row) => row.id);
    const { error } = await supabase
      .from("crm_contact_properties" as any)
      .delete()
      .in("id", removeIds);
    if (error) throw error;
  }

  if (toAdd.length > 0) {
    const { error } = await supabase.from("crm_contact_properties" as any).insert(
      toAdd.map((property_id) => ({
        tenant_id: tenantId,
        contact_id: contactId,
        property_id,
      })) as any,
    );
    if (error) throw error;
  }

  const nextPrimary = propertyIds.includes(primaryPropertyId ?? "")
    ? primaryPropertyId
    : (propertyIds[0] ?? null);

  const { error: updateError } = await supabase
    .from("crm_contacts")
    .update({ property_id: nextPrimary })
    .eq("id", contactId);
  if (updateError) throw updateError;
}

export function useContactAssignmentsMap() {
  return useQuery<ContactAssignmentMaps>({
    queryKey: ["contact-assignments"],
    queryFn: async () => {
      const [projectsRes, propertiesRes] = await Promise.all([
        supabase
          .from("project_directory_entries" as any)
          .select("contact_id, project_id")
          .not("contact_id", "is", null),
        supabase.from("crm_contact_properties" as any).select("contact_id, property_id"),
      ]);
      if (projectsRes.error) throw projectsRes.error;
      if (propertiesRes.error) throw propertiesRes.error;

      const projectsByContact: Record<string, string[]> = {};
      for (const row of (projectsRes.data ?? []) as Array<{ contact_id: string; project_id: string }>) {
        (projectsByContact[row.contact_id] ??= []).push(row.project_id);
      }

      const propertiesByContact: Record<string, string[]> = {};
      for (const row of (propertiesRes.data ?? []) as Array<{ contact_id: string; property_id: string }>) {
        (propertiesByContact[row.contact_id] ??= []).push(row.property_id);
      }

      return { projectsByContact, propertiesByContact };
    },
  });
}

export function useContactProjects(contactId: string | null) {
  return useQuery({
    queryKey: ["contact-projects", contactId],
    enabled: Boolean(contactId),
    queryFn: () => fetchContactProjectIds(contactId!),
  });
}

export function useContactProperties(contactId: string | null, primaryPropertyId?: string | null) {
  return useQuery({
    queryKey: ["contact-properties", contactId],
    enabled: Boolean(contactId),
    queryFn: async () =>
      mergeAssignmentIds(primaryPropertyId, await fetchContactPropertyIds(contactId!)),
  });
}

export function useProjectContactIds(projectId: string | null) {
  return useQuery({
    queryKey: ["project-contact-ids", projectId],
    enabled: Boolean(projectId),
    queryFn: () => fetchProjectContactIds(projectId!),
  });
}

export function useSyncContactAssignments() {
  const qc = useQueryClient();

  const invalidate = (contactId?: string) => {
    qc.invalidateQueries({ queryKey: ["contact-assignments"] });
    qc.invalidateQueries({ queryKey: ["crm-contacts"] });
    qc.invalidateQueries({ queryKey: ["project-directory"] });
    qc.invalidateQueries({ queryKey: ["project-contacts"] });
    qc.invalidateQueries({ queryKey: ["project-contact-ids"] });
    if (contactId) {
      qc.invalidateQueries({ queryKey: ["contact-projects", contactId] });
      qc.invalidateQueries({ queryKey: ["contact-properties", contactId] });
      qc.invalidateQueries({ queryKey: ["crm-contact", contactId] });
    }
  };

  const sync = useMutation({
    mutationFn: async (input: {
      contactId: string;
      projectIds: string[];
      propertyIds: string[];
      primaryPropertyId?: string | null;
    }) => {
      await syncContactProjects(input.contactId, input.projectIds);
      await syncContactProperties(input.contactId, input.propertyIds, input.primaryPropertyId);
      return input.contactId;
    },
    onSuccess: (contactId) => {
      invalidate(contactId);
    },
    onError: (error: Error) => {
      toast.error(`Failed to update contact assignments: ${error.message}`);
    },
  });

  return { sync, invalidate };
}
