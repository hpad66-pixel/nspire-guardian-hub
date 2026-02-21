import React from 'react';
import { Mic } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VoiceButtonProps {
  onTranscript: (text: string) => void;
  className?: string;
  size?: 'sm' | 'md';
}

/**
 * Minimal voice dictation trigger button.
 * Uses the browser SpeechRecognition API where available,
 * with a graceful fallback message.
 */
export function VoiceButton({ onTranscript, className, size = 'md' }: VoiceButtonProps) {
  const [listening, setListening] = React.useState(false);

  const handleClick = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Voice recognition is not supported on this browser.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    setListening(true);
    recognition.start();

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      onTranscript(transcript);
      setListening(false);
    };

    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      title="Voice dictation"
      className={cn(
        'flex-shrink-0 flex items-center justify-center rounded-xl border transition-all',
        'border-slate-200 bg-white hover:bg-slate-50 text-slate-500',
        listening && 'border-red-400 bg-red-50 text-red-500 animate-pulse',
        size === 'md' && 'w-10 h-10',
        size === 'sm' && 'w-8 h-8',
        className
      )}
    >
      <Mic className={size === 'md' ? 'h-4 w-4' : 'h-3.5 w-3.5'} />
    </button>
  );
}
