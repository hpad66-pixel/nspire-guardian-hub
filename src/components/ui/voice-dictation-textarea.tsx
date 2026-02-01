import { forwardRef } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { VoiceDictation } from '@/components/ui/voice-dictation';
import { cn } from '@/lib/utils';

interface VoiceDictationTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  onValueChange?: (value: string) => void;
  label?: string;
}

export const VoiceDictationTextarea = forwardRef<HTMLTextAreaElement, VoiceDictationTextareaProps>(
  ({ className, value, onChange, onValueChange, ...props }, ref) => {
    
    const handleTranscript = (transcript: string) => {
      const currentValue = typeof value === 'string' ? value : '';
      const newValue = currentValue ? `${currentValue}\n\n${transcript}` : transcript;
      
      if (onValueChange) {
        onValueChange(newValue);
      }
      
      // Also trigger onChange event for form compatibility
      if (onChange) {
        const syntheticEvent = {
          target: { value: newValue },
        } as React.ChangeEvent<HTMLTextAreaElement>;
        onChange(syntheticEvent);
      }
    };

    return (
      <div className="relative">
        <Textarea
          ref={ref}
          className={cn('pr-12', className)}
          value={value}
          onChange={onChange}
          {...props}
        />
        <div className="absolute right-2 top-2">
          <VoiceDictation onTranscript={handleTranscript} />
        </div>
      </div>
    );
  }
);

VoiceDictationTextarea.displayName = 'VoiceDictationTextarea';
