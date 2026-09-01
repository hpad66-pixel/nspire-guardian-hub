import { useCallback, useRef, useState } from 'react';
import { useConversation } from '@elevenlabs/react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { emitVoiceLive } from '@/lib/voice/liveBus';
import { formatResidentEducationForAgent } from '@/lib/voice/residentEducation';

interface VoiceAgentState {
  isConnecting: boolean;
  error: string | null;
  callId: string | null;
  transcript: string[];
  requestId: string | null;
  ticketNumber: string | null;
  /** True from hang-up until ticket/WO land (or timeout). */
  isProcessing: boolean;
}

interface VoiceAgentContext {
  propertyId?: string | null;
  propertyName?: string | null;
  callerName?: string | null;
  callerEmail?: string | null;
  callerPhone?: string | null;
  onCallEnded?: () => void;
  onTicketCreated?: (ticket: { requestId?: string | null; ticketNumber?: string | null }) => void;
}

export function useVoiceAgent(context?: VoiceAgentContext) {
  const qc = useQueryClient();
  const processingStarted = useRef(false);
  const pollTimer = useRef<number | null>(null);
  const contextRef = useRef(context);
  contextRef.current = context;
  const [state, setState] = useState<VoiceAgentState>({
    isConnecting: false,
    error: null,
    callId: null,
    transcript: [],
    requestId: null,
    ticketNumber: null,
    isProcessing: false,
  });

  const bumpLiveQueries = useCallback(() => {
    qc.invalidateQueries({ queryKey: ['maintenance-requests'] });
    qc.invalidateQueries({ queryKey: ['maintenance-request-stats'] });
    qc.invalidateQueries({ queryKey: ['work-orders'] });
  }, [qc]);

  const markProcessing = useCallback(() => {
    // onDisconnect + endConversation can both fire — only tickle once per call.
    if (processingStarted.current) {
      bumpLiveQueries();
      return;
    }
    processingStarted.current = true;
    setState((prev) => ({ ...prev, callId: null, isProcessing: true }));
    emitVoiceLive({
      kind: 'call_ended',
      title: 'Call ended',
      detail: 'Processing transcript → ticket → work order',
    });
    emitVoiceLive({
      kind: 'processing',
      title: 'System working',
      detail: 'Creating maintenance ticket and wiring the work order…',
    });
    toast.message('Call ended — processing ticket…', {
      description: 'Dashboard will update as soon as the work order is wired.',
    });
    bumpLiveQueries();
    contextRef.current?.onCallEnded?.();

    if (pollTimer.current) window.clearInterval(pollTimer.current);
    const started = Date.now();
    pollTimer.current = window.setInterval(() => {
      bumpLiveQueries();
      if (Date.now() - started > 45_000) {
        if (pollTimer.current) window.clearInterval(pollTimer.current);
        pollTimer.current = null;
        setState((prev) => (prev.isProcessing ? { ...prev, isProcessing: false } : prev));
      }
    }, 2500);
  }, [bumpLiveQueries]);

  const conversation = useConversation({
    onConnect: () => {
      const ctx = contextRef.current;
      emitVoiceLive({
        kind: 'call_started',
        title: 'Call connected',
        detail: ctx?.propertyName
          ? `Routing to ${ctx.propertyName}`
          : 'Voice agent is live',
      });
      toast.success('Connected to voice agent');
    },
    onDisconnect: () => {
      markProcessing();
    },
    onMessage: (message) => {
      const msgAny = message as unknown as {
        type?: string;
        user_transcription_event?: { user_transcript?: string };
        agent_response_event?: { agent_response?: string };
      };

      if (msgAny.type === 'user_transcript' || msgAny.type === 'agent_response') {
        const text =
          msgAny.type === 'user_transcript'
            ? `User: ${msgAny.user_transcription_event?.user_transcript || ''}`
            : `Agent: ${msgAny.agent_response_event?.agent_response || ''}`;

        if (text && text.length > 6) {
          setState((prev) => ({
            ...prev,
            transcript: [...prev.transcript, text],
          }));
        }
      }
    },
    onError: (error: unknown) => {
      console.error('Voice agent error:', error);
      setState((prev) => ({ ...prev, error: String(error), isProcessing: false }));
      emitVoiceLive({
        kind: 'error',
        title: 'Voice agent error',
        detail: String(error),
      });
      toast.error('Voice agent error occurred');
    },
    onAgentToolResponse: (response) => {
      const payload = response as unknown as {
        toolName?: string;
        response?: { request_id?: string; formatted_ticket?: string; work_order_id?: string };
      };

      if (payload?.response?.request_id || payload?.response?.formatted_ticket) {
        const ticketNumber = payload.response?.formatted_ticket || null;
        const requestId = payload.response?.request_id || null;

        setState((prev) => ({
          ...prev,
          requestId,
          ticketNumber,
          isProcessing: !payload.response?.work_order_id,
        }));

        emitVoiceLive({
          kind: 'ticket_created',
          title: ticketNumber ? `Ticket ${ticketNumber} created` : 'Maintenance ticket created',
          detail: 'Refreshing queue…',
          ticketNumber: ticketNumber || undefined,
          requestId: requestId || undefined,
        });

        if (payload.response?.work_order_id) {
          emitVoiceLive({
            kind: 'wo_linked',
            title: 'Work order wired',
            detail: ticketNumber
              ? `${ticketNumber} linked to a work order`
              : 'Work order ready for dispatch',
            ticketNumber: ticketNumber || undefined,
            requestId: requestId || undefined,
            workOrderId: payload.response.work_order_id,
          });
          setState((prev) => ({ ...prev, isProcessing: false }));
        }

        if (ticketNumber) {
          toast.success(`Request created: ${ticketNumber}`);
        } else {
          toast.success('Maintenance request created');
        }

        bumpLiveQueries();
        contextRef.current?.onTicketCreated?.({ requestId, ticketNumber });
      }
    },
  });

  const startConversation = useCallback(async () => {
    processingStarted.current = false;
    if (pollTimer.current) {
      window.clearInterval(pollTimer.current);
      pollTimer.current = null;
    }
    setState((prev) => ({
      ...prev,
      isConnecting: true,
      error: null,
      transcript: [],
      requestId: null,
      ticketNumber: null,
      isProcessing: false,
    }));

    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });

      const { data, error } = await supabase.functions.invoke('voice-agent-token');

      if (error) {
        let message = error.message || 'Failed to get voice agent token';

        if (error instanceof FunctionsHttpError && error.context) {
          try {
            const text = await error.context.text();
            try {
              const parsed = JSON.parse(text);
              if (parsed?.error) message = parsed.error;
              else if (parsed?.message) message = parsed.message;
              else if (text) message = text;
            } catch {
              if (text) message = text;
            }
          } catch {
            // ignore parsing errors
          }
        }

        throw new Error(message);
      }

      if (!data?.signed_url) {
        throw new Error('No signed URL received from server');
      }

      const conversationId = await conversation.startSession({
        signedUrl: data.signed_url,
      });

      const callId = typeof conversationId === 'string' ? conversationId : data.agent_id || 'active';

      setState((prev) => ({
        ...prev,
        isConnecting: false,
        callId,
      }));

      const ctx = contextRef.current;
      const parts = [
        callId ? `call_id=${callId}` : null,
        ctx?.propertyId ? `property_id=${ctx.propertyId}` : null,
        ctx?.propertyName ? `property_name=${ctx.propertyName}` : null,
        ctx?.callerName ? `caller_name=${ctx.callerName}` : null,
        ctx?.callerEmail ? `caller_email=${ctx.callerEmail}` : null,
        ctx?.callerPhone ? `caller_phone=${ctx.callerPhone}` : null,
      ].filter(Boolean);
      if (parts.length > 0) {
        conversation.sendContextualUpdate(
          `Context for this call: ${parts.join(', ')}. Use this context when creating the maintenance request.`,
        );
      }
      // Reinforce HVAC + vacancy/leasing education on every call (in addition
      // to the ElevenLabs system prompt) so the agent can answer those questions.
      conversation.sendContextualUpdate(formatResidentEducationForAgent());
    } catch (error) {
      console.error('Failed to start conversation:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to start voice agent';
      setState((prev) => ({
        ...prev,
        isConnecting: false,
        error: errorMessage,
      }));
      toast.error(errorMessage);
    }
  }, [conversation]);

  const endConversation = useCallback(async () => {
    try {
      await conversation.endSession();
      // onDisconnect also fires; markProcessing is idempotent enough for UX.
      markProcessing();
    } catch (error) {
      console.error('Error ending conversation:', error);
    }
  }, [conversation, markProcessing]);

  const setVolume = useCallback(
    async (volume: number) => {
      await conversation.setVolume({ volume });
    },
    [conversation],
  );

  const clearProcessing = useCallback(() => {
    setState((prev) => ({ ...prev, isProcessing: false }));
  }, []);

  return {
    ...state,
    status: conversation.status,
    isSpeaking: conversation.isSpeaking,
    startConversation,
    endConversation,
    setVolume,
    clearProcessing,
    getInputVolume: conversation.getInputVolume,
    getOutputVolume: conversation.getOutputVolume,
  };
}
