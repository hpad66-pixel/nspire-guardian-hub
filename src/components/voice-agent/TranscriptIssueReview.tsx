import { useState } from 'react';
import { CheckCircle2, Loader2, Sparkles, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SuggestedIssue, useTranscriptIssueExtraction } from '@/hooks/useTranscriptIssueExtraction';
import { useCreateIssuesFromTranscript } from '@/hooks/useIssues';
import { toast } from 'sonner';

interface TranscriptIssueReviewProps {
  transcript: string;
  propertyId: string;
  callerName: string;
  issueCategory: string;
  maintenanceRequestId: string;
}

const severityConfig = {
  severe: { label: 'Severe', className: 'bg-destructive/10 text-destructive border-destructive/20' },
  moderate: { label: 'Moderate', className: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  low: { label: 'Low', className: 'bg-muted text-muted-foreground border-border' },
};

const areaLabels: Record<string, string> = {
  unit: 'Unit',
  inside: 'Inside (Common)',
  outside: 'Outside',
};

export function TranscriptIssueReview({
  transcript,
  propertyId,
  callerName,
  issueCategory,
  maintenanceRequestId,
}: TranscriptIssueReviewProps) {
  const { isExtracting, suggestedIssues, hasExtracted, extractIssues, toggleIssue, updateIssue, reset } =
    useTranscriptIssueExtraction();
  const createIssues = useCreateIssuesFromTranscript();
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [createdCount, setCreatedCount] = useState(0);

  const handleExtract = () => {
    extractIssues({ transcript, property_id: propertyId, caller_name: callerName, issue_category: issueCategory });
  };

  const handleCreateSelected = async () => {
    const selected = suggestedIssues.filter((i) => i.selected);
    if (selected.length === 0) {
      toast.warning('Select at least one issue to create');
      return;
    }

    const issues = selected.map((issue) => ({
      property_id: propertyId,
      title: issue.title,
      description: issue.description,
      severity: issue.severity as 'severe' | 'moderate' | 'low',
      area: issue.area as 'unit' | 'inside' | 'outside',
      source_module: 'voice_agent' as const,
      maintenance_request_id: maintenanceRequestId,
      status: 'open',
    }));

    try {
      await createIssues.mutateAsync(issues);
      setCreatedCount(issues.length);
      toast.success(`${issues.length} issue(s) created successfully`);
    } catch {
      // error handled by mutation
    }
  };

  // Success state
  if (createdCount > 0) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-green-600">
          <CheckCircle2 className="w-5 h-5" />
          <h4 className="font-medium">
            {createdCount} Issue{createdCount > 1 ? 's' : ''} Created
          </h4>
        </div>
        <p className="text-sm text-muted-foreground">
          Issues have been created and linked to this maintenance request. They are now available in the Issues module
          for assignment and tracking.
        </p>
        <Button variant="outline" size="sm" onClick={() => { setCreatedCount(0); reset(); }}>
          Extract More Issues
        </Button>
      </div>
    );
  }

  // Not yet extracted
  if (!hasExtracted) {
    return (
      <div className="space-y-3">
        <Button onClick={handleExtract} disabled={isExtracting} variant="outline" className="w-full gap-2">
          {isExtracting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Analyzing Transcript…
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Extract Issues from Transcript
            </>
          )}
        </Button>
        {isExtracting && (
          <p className="text-xs text-muted-foreground text-center">AI is reading the transcript and identifying issues…</p>
        )}
      </div>
    );
  }

  // No issues found
  if (suggestedIssues.length === 0) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">No actionable issues were found in the transcript.</p>
        <Button variant="outline" size="sm" onClick={reset}>
          Try Again
        </Button>
      </div>
    );
  }

  const selectedCount = suggestedIssues.filter((i) => i.selected).length;

  // Issue review cards
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          Suggested Issues ({suggestedIssues.length})
        </h4>
        <Badge variant="secondary">{selectedCount} selected</Badge>
      </div>

      <div className="space-y-3">
        {suggestedIssues.map((issue, index) => {
          const isExpanded = expandedIndex === index;
          const config = severityConfig[issue.severity];

          return (
            <div
              key={index}
              className="border rounded-lg p-3 space-y-2 transition-colors hover:border-primary/30"
            >
              <div className="flex items-start gap-3">
                <Checkbox
                  checked={issue.selected}
                  onCheckedChange={() => toggleIssue(index)}
                  className="mt-1"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm truncate">{issue.title}</span>
                    <Badge variant="outline" className={config.className}>
                      {config.label}
                    </Badge>
                    <Badge variant="outline">{areaLabels[issue.area] || issue.area}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{issue.description}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="shrink-0"
                  onClick={() => setExpandedIndex(isExpanded ? null : index)}
                >
                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </Button>
              </div>

              {isExpanded && (
                <div className="pl-9 space-y-3 pt-2 border-t">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Title</label>
                    <Input
                      value={issue.title}
                      onChange={(e) => updateIssue(index, { title: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Description</label>
                    <Textarea
                      value={issue.description}
                      onChange={(e) => updateIssue(index, { description: e.target.value })}
                      rows={3}
                      className="mt-1"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Severity</label>
                      <Select
                        value={issue.severity}
                        onValueChange={(v) => updateIssue(index, { severity: v as SuggestedIssue['severity'] })}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="severe">Severe</SelectItem>
                          <SelectItem value="moderate">Moderate</SelectItem>
                          <SelectItem value="low">Low</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Area</label>
                      <Select
                        value={issue.area}
                        onValueChange={(v) => updateIssue(index, { area: v as SuggestedIssue['area'] })}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unit">Unit</SelectItem>
                          <SelectItem value="inside">Inside (Common)</SelectItem>
                          <SelectItem value="outside">Outside</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex justify-between items-center pt-2">
        <Button variant="outline" size="sm" onClick={reset}>
          Re-Extract
        </Button>
        <Button onClick={handleCreateSelected} disabled={selectedCount === 0 || createIssues.isPending}>
          {createIssues.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Creating…
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Create {selectedCount} Issue{selectedCount !== 1 ? 's' : ''}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
