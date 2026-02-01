import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

export type ContactType = 
  | "vendor"
  | "regulator"
  | "contractor"
  | "tenant"
  | "owner"
  | "inspector"
  | "utility"
  | "government"
  | "other";

export interface CRMContact {
  id: string;
  user_id: string | null;
  property_id: string | null;
  first_name: string;
  last_name: string | null;
  company_name: string | null;
  job_title: string | null;
  contact_type: ContactType;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  fax: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  country: string | null;
  website: string | null;
  license_number: string | null;
  insurance_expiry: string | null;
  tags: string[];
  notes: string | null;
  is_favorite: boolean;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CRMContactFormData {
  first_name: string;
  last_name?: string;
  company_name?: string;
  job_title?: string;
  contact_type: ContactType;
  email?: string;
  phone?: string;
  mobile?: string;
  fax?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country?: string;
  website?: string;
  license_number?: string;
  insurance_expiry?: string;
  tags?: string[];
  notes?: string;
  is_favorite?: boolean;
  property_id?: string; // If set, creates property-level contact
}

export interface CRMContactFilters {
  search?: string;
  contactType?: ContactType | "all";
  propertyId?: string;
  showPersonal?: boolean;
  showProperty?: boolean;
  favoritesOnly?: boolean;
}

export function useCRMContacts(filters?: CRMContactFilters) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["crm-contacts", filters, user?.id],
    enabled: !!user,
    queryFn: async () => {
      let query = supabase
        .from("crm_contacts")
        .select("*")
        .eq("is_active", true)
        .order("is_favorite", { ascending: false })
        .order("first_name", { ascending: true });

      // Apply filters
      if (filters?.search) {
        query = query.or(
          `first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,company_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`
        );
      }

      if (filters?.contactType && filters.contactType !== "all") {
        query = query.eq("contact_type", filters.contactType);
      }

      if (filters?.propertyId) {
        query = query.eq("property_id", filters.propertyId);
      }

      if (filters?.favoritesOnly) {
        query = query.eq("is_favorite", true);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching CRM contacts:", error);
        throw error;
      }

      // Filter by personal/property in JS since we may want both
      let contacts = data as CRMContact[];
      
      if (filters?.showPersonal === false) {
        contacts = contacts.filter(c => c.property_id !== null);
      }
      if (filters?.showProperty === false) {
        contacts = contacts.filter(c => c.user_id !== null);
      }

      return contacts;
    },
  });
}

export function useCRMContact(id: string | null) {
  return useQuery({
    queryKey: ["crm-contact", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_contacts")
        .select("*")
        .eq("id", id!)
        .single();

      if (error) throw error;
      return data as CRMContact;
    },
  });
}

export function useCreateCRMContact() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (contact: CRMContactFormData) => {
      if (!user) throw new Error("Not authenticated");

      const insertData = {
        ...contact,
        user_id: contact.property_id ? null : user.id, // Personal if no property_id
        created_by: user.id,
      };

      const { data, error } = await supabase
        .from("crm_contacts")
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      return data as CRMContact;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-contacts"] });
      toast.success("Contact created successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create contact: ${error.message}`);
    },
  });
}

export function useUpdateCRMContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CRMContact> & { id: string }) => {
      const { data, error } = await supabase
        .from("crm_contacts")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as CRMContact;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["crm-contacts"] });
      queryClient.invalidateQueries({ queryKey: ["crm-contact", variables.id] });
      toast.success("Contact updated successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update contact: ${error.message}`);
    },
  });
}

export function useDeleteCRMContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Soft delete by setting is_active to false
      const { error } = await supabase
        .from("crm_contacts")
        .update({ is_active: false })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-contacts"] });
      toast.success("Contact deleted");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete contact: ${error.message}`);
    },
  });
}

export function useToggleFavorite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, is_favorite }: { id: string; is_favorite: boolean }) => {
      const { error } = await supabase
        .from("crm_contacts")
        .update({ is_favorite })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-contacts"] });
    },
  });
}

// Contact type labels for UI
export const CONTACT_TYPE_LABELS: Record<ContactType, string> = {
  vendor: "Vendor",
  regulator: "Regulator",
  contractor: "Contractor",
  tenant: "Tenant",
  owner: "Owner",
  inspector: "Inspector",
  utility: "Utility",
  government: "Government",
  other: "Other",
};

// Contact type colors for badges
export const CONTACT_TYPE_COLORS: Record<ContactType, string> = {
  vendor: "bg-blue-100 text-blue-800",
  regulator: "bg-purple-100 text-purple-800",
  contractor: "bg-orange-100 text-orange-800",
  tenant: "bg-green-100 text-green-800",
  owner: "bg-indigo-100 text-indigo-800",
  inspector: "bg-yellow-100 text-yellow-800",
  utility: "bg-cyan-100 text-cyan-800",
  government: "bg-red-100 text-red-800",
  other: "bg-gray-100 text-gray-800",
};
