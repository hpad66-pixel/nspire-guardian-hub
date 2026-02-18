import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

// UI labels mapped to DB enum values (call | email | meeting | note)
export type CommType = 'call' | 'email' | 'meeting' | 'note';
export type UICommType = 'call' | 'site_visit' | 'email_summary' | 'note' | 'other';

// Maps our UI type labels to DB-compatible enum values and stores UI label in subject prefix
export const COMM_TYPE_LABELS: Record<UICommType, { label: string; dbType: CommType }> = {
  call:          { label: 'Phone Call',    dbType: 'call'    },
  site_visit:    { label: 'Site Visit',    dbType: 'note'    },
  email_summary: { label: 'Email Summary', dbType: 'email'   },
  note:          { label: 'General Note',  dbType: 'note'    },
  other:         { label: 'Other',         dbType: 'note'    },
};

export interface ProjectComm {
  id: string;
  project_id: string;
  type: CommType;
  subject: string;
  content: string | null;
  participants: string[] | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // UI-only helper derived from subject prefix
  uiType?: UICommType;
}

const UI_TYPE_PREFIX = '__uiType:';

export function encodeUIType(uiType: UICommType, subject: string) {
  return `${UI_TYPE_PREFIX}${uiType}|${subject}`;
}

export function decodeUIType(raw: string): { uiType: UICommType; subject: string } {
  if (raw.startsWith(UI_TYPE_PREFIX)) {
    const rest = raw.slice(UI_TYPE_PREFIX.length);
    const idx = rest.indexOf('|');
    if (idx !== -1) {
      return { uiType: rest.slice(0, idx) as UICommType, subject: rest.slice(idx + 1) };
    }
  }
  return { uiType: 'note', subject: raw };
}

export function useProjectCommunications(projectId: string) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: comms = [], isLoading } = useQuery({
    queryKey: ['project-comms', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_communications')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return ((data || []) as ProjectComm[]).map((row) => {
        const { uiType, subject } = decodeUIType(row.subject);
        return { ...row, subject, uiType };
      });
    },
    enabled: !!projectId,
  });

  const createComm = useMutation({
    mutationFn: async (payload: {
      uiType: UICommType;
      subject: string;
      content?: string;
      participants?: string[];
    }) => {
      const { dbType } = COMM_TYPE_LABELS[payload.uiType];
      const encodedSubject = encodeUIType(payload.uiType, payload.subject);
      const { data, error } = await supabase
        .from('project_communications')
        .insert([{
          type: dbType,
          subject: encodedSubject,
          content: payload.content,
          participants: payload.participants,
          project_id: projectId,
          created_by: user?.id,
        }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-comms', projectId] });
      toast.success('Update logged');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteComm = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('project_communications')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-comms', projectId] });
      toast.success('Update deleted');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return { comms, isLoading, createComm, deleteComm };
}
