import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type PolishContext = 'description' | 'scope' | 'notes' | 'correspondence' | 'meeting_minutes';

interface UseTextPolishResult {
  polish: (text: string, context?: PolishContext) => Promise<string | null>;
  isPolishing: boolean;
}

export function useTextPolish(): UseTextPolishResult {
  const [isPolishing, setIsPolishing] = useState(false);

  const polish = useCallback(async (text: string, context: PolishContext = 'notes'): Promise<string | null> => {
    if (!text.trim()) {
      toast.error('Please enter some text first');
      return null;
    }

    setIsPolishing(true);

    try {
      const { data, error } = await supabase.functions.invoke('polish-text', {
        body: { text, context },
      });

      if (error) {
        // Parse error message from edge function response
        let message = 'Failed to polish text';
        let isCreditsError = false;
        if (error.message) {
          try {
            const parsed = JSON.parse(error.message);
            message = parsed.error || error.message;
            isCreditsError = message.toLowerCase().includes('credits');
          } catch {
            message = error.message;
            isCreditsError = message.toLowerCase().includes('credits');
          }
        }
        if (isCreditsError) {
          // Gracefully fall back to original text — don't block the user
          toast.warning('AI polish unavailable (credits exhausted). Your text has been saved as-is.');
          return text;
        }
        toast.error(message);
        return text; // Always return original text so the UI doesn't get stuck
      }

      if (data?.error) {
        const isCreditsError = data.error.toLowerCase().includes('credits');
        if (isCreditsError) {
          toast.warning('AI polish unavailable (credits exhausted). Your text has been saved as-is.');
          return text;
        }
        toast.error(data.error);
        return text;
      }

      if (data?.polished) {
        toast.success('Text polished successfully');
        return data.polished;
      }

      return text;
    } catch (err) {
      console.error('Polish error:', err);
      // Never crash — return original text
      toast.warning('AI polish unavailable. Your text has been saved as-is.');
      return text;
    } finally {
      setIsPolishing(false);
    }
  }, []);

  return { polish, isPolishing };
}
