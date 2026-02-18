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
        throw error;
      }

      if (data?.error) {
        throw new Error(data.error);
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
