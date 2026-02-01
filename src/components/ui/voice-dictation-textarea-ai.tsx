import { forwardRef, useState, useCallback } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { VoiceDictation } from '@/components/ui/voice-dictation';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useTextPolish, type PolishContext } from '@/hooks/useTextPolish';
import { Sparkles, Loader2, Undo2 } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface VoiceDictationTextareaWithAIProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  onValueChange?: (value: string) => void;
  context?: PolishContext;
  label?: string;
}

export const VoiceDictationTextareaWithAI = forwardRef<HTMLTextAreaElement, VoiceDictationTextareaWithAIProps>(
  ({ className, value, onChange, onValueChange, context = 'notes', ...props }, ref) => {
    const { polish, isPolishing } = useTextPolish();
    const [previousValue, setPreviousValue] = useState<string | null>(null);

    const currentValue = typeof value === 'string' ? value : '';

    const handleTranscript = useCallback((transcript: string) => {
      const newValue = currentValue ? `${currentValue}\n\n${transcript}` : transcript;
      
      if (onValueChange) {
        onValueChange(newValue);
      }
      
      if (onChange) {
        const syntheticEvent = {
          target: { value: newValue },
        } as React.ChangeEvent<HTMLTextAreaElement>;
        onChange(syntheticEvent);
      }
    }, [currentValue, onChange, onValueChange]);

    const handlePolish = useCallback(async () => {
      if (!currentValue.trim()) return;

      setPreviousValue(currentValue);
      const polished = await polish(currentValue, context);

      if (polished) {
        if (onValueChange) {
          onValueChange(polished);
        }
        
        if (onChange) {
          const syntheticEvent = {
            target: { value: polished },
          } as React.ChangeEvent<HTMLTextAreaElement>;
          onChange(syntheticEvent);
        }
      }
    }, [currentValue, context, polish, onChange, onValueChange]);

    const handleUndo = useCallback(() => {
      if (previousValue !== null) {
        if (onValueChange) {
          onValueChange(previousValue);
        }
        
        if (onChange) {
          const syntheticEvent = {
            target: { value: previousValue },
          } as React.ChangeEvent<HTMLTextAreaElement>;
          onChange(syntheticEvent);
        }

        setPreviousValue(null);
      }
    }, [previousValue, onChange, onValueChange]);

    return (
      <TooltipProvider>
        <div className="relative">
          <Textarea
            ref={ref}
            className={cn('pr-24 pb-10', className)}
            value={value}
            onChange={onChange}
            {...props}
          />
          <div className="absolute right-2 bottom-2 flex items-center gap-1">
            {previousValue !== null && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={handleUndo}
                    className="h-8 w-8"
                  >
                    <Undo2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Undo polish</TooltipContent>
              </Tooltip>
            )}

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handlePolish}
                  disabled={isPolishing || !currentValue.trim()}
                  className="h-8 px-2"
                >
                  {isPolishing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-1" />
                      Polish
                    </>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Use AI to polish and professionalize text</TooltipContent>
            </Tooltip>

            <VoiceDictation onTranscript={handleTranscript} disabled={isPolishing} />
          </div>
        </div>
      </TooltipProvider>
    );
  }
);

VoiceDictationTextareaWithAI.displayName = 'VoiceDictationTextareaWithAI';
