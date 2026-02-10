import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface SuggestedIssue {
  title: string;
  description: string;
  severity: 'severe' | 'moderate' | 'low';
  area: 'unit' | 'inside' | 'outside';
  category: string;
  selected: boolean;
}

export function useTranscriptIssueExtraction() {
  const [isExtracting, setIsExtracting] = useState(false);
  const [suggestedIssues, setSuggestedIssues] = useState<SuggestedIssue[]>([]);
  const [hasExtracted, setHasExtracted] = useState(false);

  const extractIssues = async (params: {
    transcript: string;
    property_id: string;
    caller_name: string;
    issue_category: string;
  }) => {
    setIsExtracting(true);
    try {
      const { data, error } = await supabase.functions.invoke('extract-transcript-issues', {
        body: params,
      });

      if (error) throw error;

      if (data?.error) {
        throw new Error(data.error);
      }

      const issues: SuggestedIssue[] = (data?.issues || []).map((issue: any) => ({
        ...issue,
        selected: true,
      }));

      setSuggestedIssues(issues);
      setHasExtracted(true);

      if (issues.length === 0) {
        toast.info('No actionable issues found in the transcript');
      }

      return issues;
    } catch (error: any) {
      console.error('Issue extraction failed:', error);
      toast.error(error.message || 'Failed to extract issues from transcript');
      return [];
    } finally {
      setIsExtracting(false);
    }
  };

  const toggleIssue = (index: number) => {
    setSuggestedIssues(prev =>
      prev.map((issue, i) => (i === index ? { ...issue, selected: !issue.selected } : issue))
    );
  };

  const updateIssue = (index: number, updates: Partial<SuggestedIssue>) => {
    setSuggestedIssues(prev =>
      prev.map((issue, i) => (i === index ? { ...issue, ...updates } : issue))
    );
  };

  const reset = () => {
    setSuggestedIssues([]);
    setHasExtracted(false);
  };

  return {
    isExtracting,
    suggestedIssues,
    hasExtracted,
    extractIssues,
    toggleIssue,
    updateIssue,
    reset,
  };
}
