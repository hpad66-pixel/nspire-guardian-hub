import { useCallback, useState } from 'react';
import { useConversation } from '@elevenlabs/react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface VoiceAgentState {
  isConnecting: boolean;
  error: string | null;
  callId: string | null;
  transcript: string[];
}

export function useVoiceAgent() {
  const [state, setState] = useState<VoiceAgentState>({
    isConnecting: false,
    error: null,
    callId: null,
    transcript: [],
  });

  const conversation = useConversation({
    onConnect: () => {
      console.log('Voice agent connected');
      toast.success('Connected to voice agent');
    },
    onDisconnect: () => {
      console.log('Voice agent disconnected');
      setState(prev => ({ ...prev, callId: null }));
    },
    onMessage: (message) => {
      console.log('Voice agent message:', message);
      // Handle different message types from ElevenLabs
      const msgAny = message as unknown as { 
        type?: string; 
        user_transcription_event?: { user_transcript?: string };
        agent_response_event?: { agent_response?: string };
      };
      
      if (msgAny.type === 'user_transcript' || msgAny.type === 'agent_response') {
        const text = msgAny.type === 'user_transcript' 
          ? `User: ${msgAny.user_transcription_event?.user_transcript || ''}`
          : `Agent: ${msgAny.agent_response_event?.agent_response || ''}`;
        
        if (text && text.length > 6) {
          setState(prev => ({
            ...prev,
            transcript: [...prev.transcript, text],
          }));
        }
      }
    },
    onError: (error: unknown) => {
      console.error('Voice agent error:', error);
      setState(prev => ({ ...prev, error: String(error) }));
      toast.error('Voice agent error occurred');
    },
  });

  const startConversation = useCallback(async () => {
    setState(prev => ({ ...prev, isConnecting: true, error: null, transcript: [] }));

    try {
      // Request microphone permission
      await navigator.mediaDevices.getUserMedia({ audio: true });

      // Get signed URL from edge function
      const { data, error } = await supabase.functions.invoke('voice-agent-token');
      
      if (error) {
        throw new Error(error.message || 'Failed to get voice agent token');
      }

      if (!data?.signed_url) {
        throw new Error('No signed URL received from server');
      }

      console.log('Starting conversation with signed URL');

      // Start the conversation with WebSocket (signed URL)
      await conversation.startSession({
        signedUrl: data.signed_url,
      });

      setState(prev => ({ 
        ...prev, 
        isConnecting: false,
        callId: data.agent_id || 'active',
      }));
    } catch (error) {
      console.error('Failed to start conversation:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to start voice agent';
      setState(prev => ({ 
        ...prev, 
        isConnecting: false, 
        error: errorMessage 
      }));
      toast.error(errorMessage);
    }
  }, [conversation]);

  const endConversation = useCallback(async () => {
    try {
      await conversation.endSession();
      setState(prev => ({ ...prev, callId: null }));
      toast.info('Call ended');
    } catch (error) {
      console.error('Error ending conversation:', error);
    }
  }, [conversation]);

  const setVolume = useCallback(async (volume: number) => {
    await conversation.setVolume({ volume });
  }, [conversation]);

  return {
    ...state,
    status: conversation.status,
    isSpeaking: conversation.isSpeaking,
    startConversation,
    endConversation,
    setVolume,
    getInputVolume: conversation.getInputVolume,
    getOutputVolume: conversation.getOutputVolume,
  };
}
