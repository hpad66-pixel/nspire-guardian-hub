import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type ProposalType =
  | "project_proposal"
  | "change_order_request"
  | "scope_amendment"
  | "cost_estimate"
  | "letter"
  | "memo"
  | "correspondence";

export type ProposalStatus = "draft" | "review" | "approved" | "sent" | "archived";

export interface Proposal {
  id: string;
  project_id: string;
  proposal_number: number;
  proposal_type: ProposalType;
  title: string;
  subject: string | null;
  status: ProposalStatus;
  content_html: string | null;
  content_text: string | null;
  ai_prompt: string | null;
  ai_generated: boolean;
  include_letterhead: boolean;
  include_logo: boolean;
  letterhead_config: Record<string, unknown>;
  recipient_name: string | null;
  recipient_email: string | null;
  recipient_company: string | null;
  recipient_address: string | null;
  sent_at: string | null;
  sent_by: string | null;
  sent_email_id: string | null;
  attachment_ids: string[];
  created_by: string;
  created_at: string;
  updated_at: string;
  version: number;
  parent_version_id: string | null;
}

export interface ProposalTemplate {
  id: string;
  name: string;
  description: string | null;
  proposal_type: ProposalType;
  prompt_template: string;
  content_template: string | null;
  is_default: boolean;
  created_by: string | null;
  created_at: string;
}

export interface CreateProposalData {
  project_id: string;
  proposal_type: ProposalType;
  title: string;
  subject?: string;
  content_html?: string;
  content_text?: string;
  ai_prompt?: string;
  ai_generated?: boolean;
  recipient_name?: string;
  recipient_email?: string;
  recipient_company?: string;
  recipient_address?: string;
  include_letterhead?: boolean;
  include_logo?: boolean;
  attachment_ids?: string[];
}

export interface UpdateProposalData extends Partial<CreateProposalData> {
  id: string;
  status?: ProposalStatus;
}

export function useProposalsByProject(projectId: string | null) {
  return useQuery({
    queryKey: ["proposals", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_proposals")
        .select("*")
        .eq("project_id", projectId!)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching proposals:", error);
        throw error;
      }

      return data as Proposal[];
    },
  });
}

export function useProposal(id: string | null) {
  return useQuery({
    queryKey: ["proposal", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_proposals")
        .select("*")
        .eq("id", id!)
        .single();

      if (error) throw error;
      return data as Proposal;
    },
  });
}

export function useProposalTemplates() {
  return useQuery({
    queryKey: ["proposal-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("proposal_templates")
        .select("*")
        .order("proposal_type");

      if (error) throw error;
      return data as ProposalTemplate[];
    },
  });
}

export function useCreateProposal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateProposalData) => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error("Not authenticated");
      }

      const { data: proposal, error } = await supabase
        .from("project_proposals")
        .insert({
          ...data,
          created_by: sessionData.session.user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return proposal as Proposal;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["proposals", data.project_id] });
      toast.success("Proposal created successfully");
    },
    onError: (error: Error) => {
      console.error("Failed to create proposal:", error);
      toast.error(`Failed to create proposal: ${error.message}`);
    },
  });
}

export function useUpdateProposal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateProposalData) => {
      const { data: proposal, error } = await supabase
        .from("project_proposals")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return proposal as Proposal;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["proposals", data.project_id] });
      queryClient.invalidateQueries({ queryKey: ["proposal", data.id] });
      toast.success("Proposal updated");
    },
    onError: (error: Error) => {
      console.error("Failed to update proposal:", error);
      toast.error(`Failed to update proposal: ${error.message}`);
    },
  });
}

export function useDeleteProposal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, projectId }: { id: string; projectId: string }) => {
      const { error } = await supabase.from("project_proposals").delete().eq("id", id);
      if (error) throw error;
      return { id, projectId };
    },
    onSuccess: ({ projectId }) => {
      queryClient.invalidateQueries({ queryKey: ["proposals", projectId] });
      toast.success("Proposal deleted");
    },
    onError: (error: Error) => {
      console.error("Failed to delete proposal:", error);
      toast.error(`Failed to delete proposal: ${error.message}`);
    },
  });
}

export function useProposalStats(projectId: string | null) {
  return useQuery({
    queryKey: ["proposal-stats", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_proposals")
        .select("status")
        .eq("project_id", projectId!);

      if (error) throw error;

      return {
        total: data.length,
        draft: data.filter((p) => p.status === "draft").length,
        review: data.filter((p) => p.status === "review").length,
        approved: data.filter((p) => p.status === "approved").length,
        sent: data.filter((p) => p.status === "sent").length,
      };
    },
  });
}
