import { forwardRef, useState, useCallback, useRef, useImperativeHandle } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { VoiceDictation } from '@/components/ui/voice-dictation';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useTextPolish, type PolishContext } from '@/hooks/useTextPolish';
import { Sparkles, Loader2, Undo2, Languages, Edit3 } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';

interface VoiceDictationTextareaWithAIProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  onValueChange?: (value: string) => void;
  context?: PolishContext;
  label?: string;
}

export const VoiceDictationTextareaWithAI = forwardRef<HTMLTextAreaElement, VoiceDictationTextareaWithAIProps>(
  ({ className, value, onChange, onValueChange, context = 'notes', ...props }, ref) => {
    const { polish, isPolishing } = useTextPolish();
    const [previousValue, setPreviousValue] = useState<string | null>(null);
    const [lastTranslation, setLastTranslation] = useState<{ original: string; language: string } | null>(null);
    const [showEditHint, setShowEditHint] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Forward ref to internal textarea
    useImperativeHandle(ref, () => textareaRef.current!);

    const currentValue = typeof value === 'string' ? value : '';

    const handleTranscript = useCallback((
      transcript: string, 
      metadata?: { wasTranslated?: boolean; originalTranscript?: string; detectedLanguage?: string }
    ) => {
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

      // Track translation for display
      if (metadata?.wasTranslated && metadata.originalTranscript) {
        setLastTranslation({
          original: metadata.originalTranscript,
          language: metadata.detectedLanguage || 'unknown',
        });
      } else {
        setLastTranslation(null);
      }

      // Show edit hint briefly
      setShowEditHint(true);
      setTimeout(() => setShowEditHint(false), 5000);

      // Focus the textarea so user can edit immediately
      setTimeout(() => {
        textareaRef.current?.focus();
        // Move cursor to end
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.value.length;
          textareaRef.current.selectionEnd = textareaRef.current.value.length;
        }
      }, 100);
    }, [currentValue, onChange, onValueChange]);

    const handlePolish = useCallback(async () => {
      if (!currentValue.trim()) return;

      setPreviousValue(currentValue);
      setLastTranslation(null);
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
        
        // Return focus to textarea after polish so user can continue editing
        setTimeout(() => {
          textareaRef.current?.focus();
        }, 100);
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

    const handleShowOriginal = useCallback(() => {
      if (lastTranslation) {
        if (onValueChange) {
          onValueChange(lastTranslation.original);
        }
        
        if (onChange) {
          const syntheticEvent = {
            target: { value: lastTranslation.original },
          } as React.ChangeEvent<HTMLTextAreaElement>;
          onChange(syntheticEvent);
        }
        
        setLastTranslation(null);
      }
    }, [lastTranslation, onChange, onValueChange]);

    return (
      <TooltipProvider>
        <div className="relative">
          <Textarea
            ref={textareaRef}
            className={cn('pr-24 pb-14', className)}
            value={value}
            onChange={(e) => {
              onChange?.(e);
              // Clear hints when user manually types
              setShowEditHint(false);
            }}
            readOnly={false}
            {...props}
          />
          
          {/* Translation/Edit indicators */}
          {(lastTranslation || showEditHint) && (
            <div className="absolute left-2 bottom-12 flex items-center gap-2">
              {lastTranslation && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge 
                      variant="secondary" 
                      className="cursor-pointer hover:bg-secondary/80 gap-1"
                      onClick={handleShowOriginal}
                    >
                      <Languages className="h-3 w-3" />
                      Translated - click to see original
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-sm">
                    <p className="text-xs">Original: "{lastTranslation.original.slice(0, 100)}..."</p>
                  </TooltipContent>
                </Tooltip>
              )}
              {showEditHint && !lastTranslation && (
                <Badge variant="outline" className="gap-1 animate-fade-in">
                  <Edit3 className="h-3 w-3" />
                  Edit text before saving
                </Badge>
              )}
            </div>
          )}

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
