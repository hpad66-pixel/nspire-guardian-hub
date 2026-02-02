import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Json } from '@/integrations/supabase/types';

export interface VoiceAgentConfig {
  id: string;
  property_id: string | null;
  agent_name: string;
  greeting_message: string | null;
  closing_message: string | null;
  business_hours_start: string;
  business_hours_end: string;
  after_hours_message: string | null;
  emergency_keywords: string[];
  issue_categories: IssueCategory[];
  knowledge_base: KnowledgeEntry[];
  supervisor_notification_emails: string[] | null;
  emergency_notification_phone: string | null;
  calls_handled: number;
  avg_call_duration_seconds: number | null;
  created_at: string;
  updated_at: string;
}

export interface IssueCategory {
  id: string;
  label: string;
  subcategories: string[];
}

export interface KnowledgeEntry {
  question: string;
  answer: string;
}

export function useVoiceAgentConfig(propertyId?: string | null) {
  return useQuery({
    queryKey: ['voice-agent-config', propertyId],
    queryFn: async () => {
      let query = supabase
        .from('voice_agent_config')
        .select('*');

      if (propertyId) {
        query = query.eq('property_id', propertyId);
      } else {
        query = query.is('property_id', null);
      }

      const { data, error } = await query.single();
      
      // If no config exists, return default config
      if (error && error.code === 'PGRST116') {
        return null;
      }
      if (error) throw error;

      return {
        ...data,
        issue_categories: data.issue_categories as unknown as IssueCategory[],
        knowledge_base: data.knowledge_base as unknown as KnowledgeEntry[],
      } as VoiceAgentConfig;
    },
  });
}

export function useCreateVoiceAgentConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (config: Partial<VoiceAgentConfig>) => {
      const { data, error } = await supabase
        .from('voice_agent_config')
        .insert({
          property_id: config.property_id || null,
          agent_name: config.agent_name || 'Alex',
          greeting_message: config.greeting_message,
          closing_message: config.closing_message,
          business_hours_start: config.business_hours_start || '08:00',
          business_hours_end: config.business_hours_end || '18:00',
          after_hours_message: config.after_hours_message,
          emergency_keywords: config.emergency_keywords || ['flood', 'fire', 'gas leak', 'no heat', 'no water', 'broken window', 'security'],
          issue_categories: config.issue_categories as unknown as Json,
          knowledge_base: config.knowledge_base as unknown as Json || [],
          supervisor_notification_emails: config.supervisor_notification_emails,
          emergency_notification_phone: config.emergency_notification_phone,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['voice-agent-config'] });
      toast.success('Voice agent configuration created');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create config: ${error.message}`);
    },
  });
}

export function useUpdateVoiceAgentConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<VoiceAgentConfig> & { id: string }) => {
      const updateData: Record<string, unknown> = { ...updates };
      
      // Convert typed arrays to Json for Supabase
      if (updates.issue_categories) {
        updateData.issue_categories = updates.issue_categories as unknown as Json;
      }
      if (updates.knowledge_base) {
        updateData.knowledge_base = updates.knowledge_base as unknown as Json;
      }

      const { data, error } = await supabase
        .from('voice_agent_config')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['voice-agent-config'] });
      toast.success('Configuration updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update config: ${error.message}`);
    },
  });
}
