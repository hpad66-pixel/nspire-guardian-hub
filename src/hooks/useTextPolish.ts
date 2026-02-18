import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type PolishContext = 'description' | 'scope' | 'notes' | 'correspondence' | 'meeting_minutes';

export interface PolishOptions {
  context?: PolishContext;
  /** Override the AI model used. Falls back to context-based routing if omitted. */
  model?: string;
}

interface UseTextPolishResult {
  polish: (text: string, options?: PolishContext | PolishOptions) => Promise<string>;
  isPolishing: boolean;
}

export function useTextPolish(): UseTextPolishResult {
  const [isPolishing, setIsPolishing] = useState(false);

  const polish = useCallback(async (
    text: string,
    options?: PolishContext | PolishOptions,
  ): Promise<string> => {
    // Always return the original text as a safe fallback
    if (!text.trim()) return text;

    // Accept either a plain context string (legacy) or an options object
    const context: PolishContext =
      typeof options === 'string' ? options : (options?.context ?? 'notes');
    const preferredModel: string | undefined =
      typeof options === 'object' ? options?.model : undefined;

    setIsPolishing(true);

    try {
      const { data, error } = await supabase.functions.invoke('polish-text', {
        body: { text, context, preferredModel },
      });

      // SDK-level error (network failure, unexpected non-2xx, etc.)
      if (error) {
        console.warn('polish-text function error:', error.message);
        toast.warning('AI polish unavailable right now. Your text has been kept as-is.');
        return text;
      }

      // Edge function signalled credits exhausted via a 200 + warning flag
      if (data?.warning === 'credits_exhausted') {
        toast.warning('AI credits exhausted — text saved as-is. Add credits in Settings → Workspace → Usage.');
        return data.original ?? text;
      }

      // Any other data-level error
      if (data?.error) {
        console.warn('polish-text data error:', data.error);
        toast.warning('AI polish unavailable. Your text has been kept as-is.');
        return text;
      }

      if (data?.polished) {
        toast.success('Text polished successfully');
        return data.polished;
      }

      return text;
    } catch (err) {
      // Should never reach here given the try/catch in invoke, but just in case
      console.error('Unexpected polish error:', err);
      toast.warning('AI polish unavailable. Your text has been kept as-is.');
      return text;
    } finally {
      setIsPolishing(false);
    }
  }, []);

  return { polish, isPolishing };
}
