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
        // Try to extract the human-readable message from the edge function response
        let message = 'Failed to polish text';
        if (error.message) {
          try {
            const parsed = JSON.parse(error.message);
            message = parsed.error || error.message;
          } catch {
            message = error.message;
          }
        }
        toast.error(message);
        return null;
      }

      if (data?.error) {
        toast.error(data.error);
        return null;
      }

      if (data?.polished) {
        toast.success('Text polished');
        return data.polished;
      }

      return null;
    } catch (error) {
      console.error('Polish error:', error);
      const message = error instanceof Error ? error.message : 'Failed to polish text';
      toast.error(message);
      return null;
    } finally {
      setIsPolishing(false);
    }
  }, []);

  return { polish, isPolishing };
}
