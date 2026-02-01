import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Loader2, Languages } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface VoiceDictationProps {
  onTranscript: (text: string, metadata?: { wasTranslated?: boolean; originalTranscript?: string; detectedLanguage?: string }) => void;
  disabled?: boolean;
  className?: string;
}

export function VoiceDictation({ onTranscript, disabled, className }: VoiceDictationProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      });
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });
      
      chunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        
        if (chunksRef.current.length === 0) {
          toast.error('No audio recorded');
          return;
        }
        
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        await processAudio(audioBlob);
      };
      
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(1000); // Collect data every second
      setIsRecording(true);
      toast.info('Recording started - speak clearly (any language)');
    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error('Could not access microphone. Please check permissions.');
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  const processAudio = async (audioBlob: Blob) => {
    setIsProcessing(true);
    
    try {
      // Convert blob to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
      });
      reader.readAsDataURL(audioBlob);
      const base64Audio = await base64Promise;

      // Call the ElevenLabs transcription edge function
      const { data, error } = await supabase.functions.invoke('elevenlabs-transcribe', {
        body: { audio: base64Audio },
      });

      if (error) {
        throw error;
      }

      if (data?.transcript) {
        onTranscript(data.transcript, {
          wasTranslated: data.wasTranslated,
          originalTranscript: data.originalTranscript,
          detectedLanguage: data.detectedLanguage,
        });
        
        if (data.wasTranslated) {
          toast.success(
            <div className="flex items-center gap-2">
              <Languages className="h-4 w-4" />
              <span>Translated from {getLanguageName(data.detectedLanguage)} to English</span>
            </div>,
            { duration: 4000 }
          );
        } else {
          toast.success('Transcription complete');
        }
      } else {
        toast.error('No transcript received');
      }
    } catch (error) {
      console.error('Transcription error:', error);
      toast.error('Failed to transcribe audio. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <Button
      type="button"
      variant={isRecording ? 'destructive' : 'outline'}
      size="icon"
      onClick={handleClick}
      disabled={disabled || isProcessing}
      className={cn(
        'relative',
        isRecording && 'animate-pulse',
        className
      )}
      title={isRecording ? 'Stop recording' : 'Start voice dictation (any language)'}
    >
      {isProcessing ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : isRecording ? (
        <MicOff className="h-4 w-4" />
      ) : (
        <Mic className="h-4 w-4" />
      )}
      {isRecording && (
        <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-red-500 animate-pulse" />
      )}
    </Button>
  );
}

// Helper function to convert language codes to readable names
function getLanguageName(code: string | null): string {
  if (!code) return 'another language';
  
  const languageMap: Record<string, string> = {
    'spa': 'Spanish',
    'fra': 'French',
    'deu': 'German',
    'ita': 'Italian',
    'por': 'Portuguese',
    'rus': 'Russian',
    'zho': 'Chinese',
    'jpn': 'Japanese',
    'kor': 'Korean',
    'ara': 'Arabic',
    'hin': 'Hindi',
    'pol': 'Polish',
    'ukr': 'Ukrainian',
    'vie': 'Vietnamese',
    'tha': 'Thai',
    'tur': 'Turkish',
    'nld': 'Dutch',
    'swe': 'Swedish',
    'nor': 'Norwegian',
    'dan': 'Danish',
    'fin': 'Finnish',
    'ell': 'Greek',
    'heb': 'Hebrew',
    'ind': 'Indonesian',
    'msa': 'Malay',
    'fil': 'Filipino',
    'ces': 'Czech',
    'ron': 'Romanian',
    'hun': 'Hungarian',
  };
  
  return languageMap[code] || 'another language';
}
