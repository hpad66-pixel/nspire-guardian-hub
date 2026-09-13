import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { MeetingSection, MeetingSnapshot } from '../../supabase/functions/_shared/clientMeetingReport';
export type { MeetingSection, MeetingSnapshot };
export interface ClientMeeting {
    id: string;
    title: string;
    meeting_date: string;
    attendees: string;
    transcript: string;
    sections: MeetingSection[];
    project_ids: string[];
    revision: number;
}
export interface MeetingAction {
    id: string;
    meeting_id: string;
    project_id: string;
    title: string;
    assignee_id: string | null;
    assignee_name: string;
    ball_in_court: string;
    due_date: string | null;
    source_quote: string;
    source_locator: string;
    revision: number;
    published: boolean;
    state: string;
    step: number;
}
export interface MeetingPublication {
    id: string;
    meeting_id: string;
    revision: number;
    published_at: string;
    snapshot: MeetingSnapshot;
}
export interface MeetingSource {
    id: string;
    meeting_id: string;
    original_name: string;
    mime_type: string;
    byte_size: number;
    extracted_text?: string;
    manifest: Array<{ name: string; characters: number }>;
    created_at: string;
}
export interface MeetingEmail {
    id: string;
    report_id: string;
    subject: string;
    recipients: string[];
    sent_at: string;
    status: string;
}
export interface MeetingDelivery {
    enabled: boolean;
    weekday: number;
    hour: number;
    timezone: string;
    recipients: string[];
    cc: string[];
    bcc: string[];
}
export interface ClientMeetingBundle {
    client: {
        id: string;
        name: string;
    };
    canEdit: boolean;
    canAddInternalUpdates: boolean;
    viewerKind: 'administrator' | 'assigned_team' | 'client';
    projects: {
        id: string;
        name: string;
    }[];
    members: {
        id: string;
        name: string;
    }[];
    meetings: ClientMeeting[];
    publications: MeetingPublication[];
    actions: MeetingAction[];
    comments: {
        id: string;
        action_id: string;
        author_name: string;
        body: string;
        audience: 'internal' | 'client';
        created_at: string;
    }[];
    delivery: MeetingDelivery | null;
    deliveries: {
        id: string;
        status: string;
        error: string | null;
        updated_at: string;
    }[];
    sources: MeetingSource[];
    emails: MeetingEmail[];
    archivedMeetings: ClientMeeting[];
    archivedSources: MeetingSource[];
    dismissedEmails: MeetingEmail[];
}
// One boundary for RPCs added by the meeting migration until generated types refresh.
export async function meetingRpc<T>(name: string, args: Record<string, unknown>): Promise<T> {
    const { data, error } = await supabase.rpc(name as never, args as never);
    if (error)
        throw error;
    return data as T;
}
export function useClientMeetings(clientId?: string) {
    const qc = useQueryClient();
    const key = ['client-meetings', clientId];
    const list = useQuery({ queryKey: key, enabled: !!clientId, queryFn: async () => {
            const base = await meetingRpc<ClientMeetingBundle>('client_meeting_bundle', { p_client_id: clientId });
            if (!base.canEdit)
                return { ...base, sources: [], emails: [], archivedMeetings: [], archivedSources: [], dismissedEmails: [] };
            const manage = await meetingRpc<Pick<ClientMeetingBundle, 'sources' | 'emails' | 'archivedMeetings' | 'archivedSources' | 'dismissedEmails'>>('client_meeting_manage_bundle', { p_client: clientId });
            return { ...base, ...manage };
        }, refetchInterval: 30000 });
    const command = useMutation({ mutationFn: ({ operation, payload }: {
            operation: string;
            payload?: Record<string, unknown>;
        }) => meetingRpc<{
            id?: string;
            revision?: number;
        }>('client_meeting_command', { p_client_id: clientId, p_operation: operation, p_payload: payload ?? {} }), onSuccess: () => qc.invalidateQueries({ queryKey: key }), onError: (e: Error) => toast.error(e.message) });
    const addUpdate = useMutation({ mutationFn: ({ actionId, body, audience }: {
            actionId: string;
            body: string;
            audience: 'internal' | 'client';
        }) => meetingRpc<{ id: string }>('client_meeting_add_update', { p_client_id: clientId, p_action_id: actionId, p_body: body, p_audience: audience }), onSuccess: () => qc.invalidateQueries({ queryKey: key }), onError: (e: Error) => toast.error(e.message) });
    const bulkAssign = useMutation({ mutationFn: ({ meetingId, actions, assigneeId, dueDate, instruction }: {
            meetingId: string;
            actions: Partial<MeetingAction>[];
            assigneeId?: string;
            dueDate?: string;
            instruction?: string;
        }) => meetingRpc<{ ids: string[]; count: number }>('client_meeting_bulk_actions', {
            p_client_id: clientId,
            p_meeting_id: meetingId,
            p_actions: actions,
            p_assignee_id: assigneeId || null,
            p_due_date: dueDate || null,
            p_instruction: instruction || '',
        }), onSuccess: () => qc.invalidateQueries({ queryKey: key }), onError: (e: Error) => toast.error(e.message) });
    const submitCompletion = useMutation({ mutationFn: (actionId: string) => meetingRpc<{ id: string }>('client_meeting_submit_completion', { p_client_id: clientId, p_action_id: actionId }), onSuccess: () => qc.invalidateQueries({ queryKey: key }), onError: (e: Error) => toast.error(e.message) });
    const generate = useMutation({ mutationFn: async (input: {
            meetingId: string;
            transcript: string;
            sections: MeetingSection[];
            instructions: string;
        }) => {
            const { data, error } = await supabase.functions.invoke('client-meeting-ai', { body: { clientId, ...input } });
            if (error) {
                let message = error.message;
                try {
                    message = (await error.context.json()).error || message;
                }
                catch { /* Keep original error. */ }
                throw new Error(message);
            }
            if (data?.error)
                throw new Error(data.error);
            return data as {
                title: string;
                sections: MeetingSection[];
                actions: Partial<MeetingAction>[];
            };
        }, onError: (e: Error) => toast.error(e.message) });
    const manage = useMutation({ mutationFn: ({ operation, id }: { operation: string; id: string }) => meetingRpc<void>('client_meeting_manage_command', { p_client: clientId, p_operation: operation, p_id: id }), onSuccess: () => qc.invalidateQueries({ queryKey: key }), onError: (e: Error) => toast.error(e.message) });
    const uploadSource = useMutation({ mutationFn: async ({ meetingId, file, extractedText }: { meetingId: string; file: File; extractedText?: string }) => {
            const body = new FormData();
            body.append('clientId', clientId || '');
            body.append('meetingId', meetingId);
            body.append('file', file);
            if (extractedText)
                body.append('extractedText', extractedText);
            const { data, error } = await supabase.functions.invoke('client-meeting-source', { body });
            if (error) {
                let message = error.message;
                try {
                    message = (await error.context.json()).error || message;
                }
                catch { /* Keep original error. */ }
                throw new Error(message);
            }
            if (data?.error)
                throw new Error(data.error);
            return data;
        }, onSuccess: () => qc.invalidateQueries({ queryKey: key }), onError: (e: Error) => toast.error(e.message) });
    return { ...list, command, addUpdate, bulkAssign, submitCompletion, generate, manage, uploadSource };
}
