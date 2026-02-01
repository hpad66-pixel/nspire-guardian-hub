import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface CompanyBranding {
  id: string;
  user_id: string;
  company_name: string;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  address_line1: string | null;
  address_line2: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  footer_text: string | null;
  created_at: string;
  updated_at: string;
}

export interface UpdateBrandingData {
  company_name?: string;
  logo_url?: string;
  primary_color?: string;
  secondary_color?: string;
  address_line1?: string;
  address_line2?: string;
  phone?: string;
  email?: string;
  website?: string;
  footer_text?: string;
}

export function useCompanyBranding() {
  return useQuery({
    queryKey: ["company-branding"],
    queryFn: async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) return null;

      const { data, error } = await supabase
        .from("company_branding")
        .select("*")
        .eq("user_id", sessionData.session.user.id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching branding:", error);
        throw error;
      }

      return data as CompanyBranding | null;
    },
  });
}

export function useUpsertBranding() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateBrandingData & { company_name: string }) => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error("Not authenticated");
      }

      const userId = sessionData.session.user.id;

      // Check if branding exists
      const { data: existing } = await supabase
        .from("company_branding")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (existing) {
        // Update
        const { data: updated, error } = await supabase
          .from("company_branding")
          .update(data)
          .eq("id", existing.id)
          .select()
          .single();

        if (error) throw error;
        return updated as CompanyBranding;
      } else {
        // Insert
        const { data: created, error } = await supabase
          .from("company_branding")
          .insert({ ...data, user_id: userId })
          .select()
          .single();

        if (error) throw error;
        return created as CompanyBranding;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-branding"] });
      toast.success("Branding settings saved");
    },
    onError: (error: Error) => {
      console.error("Failed to save branding:", error);
      toast.error(`Failed to save branding: ${error.message}`);
    },
  });
}

export function useUploadLogo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error("Not authenticated");
      }

      const userId = sessionData.session.user.id;
      const fileExt = file.name.split(".").pop();
      const fileName = `${userId}/logo.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("organization-documents")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("organization-documents")
        .getPublicUrl(fileName);

      return urlData.publicUrl;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-branding"] });
    },
    onError: (error: Error) => {
      console.error("Failed to upload logo:", error);
      toast.error(`Failed to upload logo: ${error.message}`);
    },
  });
}
