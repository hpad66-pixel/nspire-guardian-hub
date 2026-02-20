/**
 * useWorkspaceBranding — canonical hook for company branding reads/writes.
 *
 * - Read:  fetches the branding row for the current workspace (falls back to
 *          first available row so portal clients still see contractor branding).
 * - Write: upsert keyed on user_id (existing pattern) with workspace_id set.
 * - Logo:  uploads to `workspace-logos` bucket and returns public URL.
 *
 * Re-exports CompanyBranding type so callers import from one place.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type { CompanyBranding, UpdateBrandingData } from "./useCompanyBranding";
export { useCompanyBranding } from "./useCompanyBranding";

// ──────────────────────────────────────────────────────────────────────────────
// Workspace-scoped upsert (used by the admin page)
// ──────────────────────────────────────────────────────────────────────────────
export interface WorkspaceBrandingPayload {
  company_name: string;
  logo_url?: string | null;
  primary_color?: string;
  secondary_color?: string;
  address_line1?: string | null;
  phone?: string | null;
  website?: string | null;
  footer_text?: string | null;
  // extra fields for the workspace profile page
  industry?: string | null;
}

export function useUpsertWorkspaceBranding() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: WorkspaceBrandingPayload) => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) throw new Error("Not authenticated");

      const userId = sessionData.session.user.id;

      // Get workspace_id from profiles
      const { data: profile } = await supabase
        .from("profiles")
        .select("workspace_id")
        .eq("user_id", userId)
        .single();

      const workspaceId = profile?.workspace_id;

      // Check if a row already exists for this user
      const { data: existing } = await supabase
        .from("company_branding")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (existing) {
        const { data, error } = await supabase
          .from("company_branding")
          .update({ ...payload, workspace_id: workspaceId })
          .eq("id", existing.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from("company_branding")
          .insert({ ...payload, user_id: userId, workspace_id: workspaceId })
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-branding"] });
      toast.success("Workspace profile updated");
    },
    onError: (error: Error) => {
      toast.error(`Failed to save: ${error.message}`);
    },
  });
}

// ──────────────────────────────────────────────────────────────────────────────
// Logo upload to workspace-logos bucket
// ──────────────────────────────────────────────────────────────────────────────
export function useUploadWorkspaceLogo() {
  return useMutation({
    mutationFn: async (file: File) => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) throw new Error("Not authenticated");

      const userId = sessionData.session.user.id;
      const ext = file.name.split(".").pop();
      const path = `${userId}/logo.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("workspace-logos")
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("workspace-logos")
        .getPublicUrl(path);

      return urlData.publicUrl;
    },
    onError: (error: Error) => {
      toast.error(`Logo upload failed: ${error.message}`);
    },
  });
}
