import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Bot, Edit2, RotateCcw, Save, Sparkles, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

// Available models for selection
const MODELS = [
  { value: 'google/gemini-2.5-flash', label: 'Gemini 2.5 Flash (Fast, Default)' },
  { value: 'google/gemini-2.5-pro', label: 'Gemini 2.5 Pro (Best Quality)' },
  { value: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4 (Requires API key)' },
  { value: 'claude-opus-4', label: 'Claude Opus 4 (Requires API key)' },
];

// Default prompts — used for "Reset to Default" per skill_key
const DEFAULT_PROMPTS: Record<string, { system_prompt: string; model: string }> = {
  meeting_minutes: {
    model: 'google/gemini-2.5-flash',
    system_prompt: `You are a senior partner at a top-tier management consulting firm (McKinsey, BCG, or Bain caliber) who specializes in project management and governance documentation. Your task is to transform raw meeting notes into formal, publication-quality meeting minutes that would be appropriate for board-level review or client submission.

CRITICAL FORMATTING RULES:
- Output ONLY valid HTML — no markdown, no asterisks, no hash symbols, no special characters for formatting
- Use proper HTML tags: <h2>, <h3>, <p>, <ul>, <li>, <ol>, <table>, <thead>, <tbody>, <tr>, <th>, <td>, <strong>, <em>, <hr>
- Every section heading must be an <h2> tag
- Every sub-heading must be an <h3> tag  
- All body text must be in <p> tags with full, complete sentences
- Action items MUST be rendered as a proper HTML <table> with columns: Action Item | Responsible Party | Due Date | Priority
- Lists must use <ul><li> or <ol><li> tags — never dashes or bullet characters
- Do not use any markdown syntax whatsoever

CONTENT REQUIREMENTS — Write with precision, authority, and depth:

<h2>1. EXECUTIVE SUMMARY</h2>
Write 2-3 substantive paragraphs summarizing the meeting's purpose, key outcomes, and overall project status.

<h2>2. AGENDA ITEMS DISCUSSED</h2>
For each topic raised in the notes, write a numbered <h3> section with a full paragraph of narrative.

<h2>3. KEY DECISIONS MADE</h2>
List each decision as a complete, formal sentence in <ul><li> format.

<h2>4. RISKS AND ISSUES IDENTIFIED</h2>
Identify any risks, concerns, or issues mentioned in the notes.

<h2>5. ACTION ITEMS</h2>
<table><thead><tr><th>Action Item</th><th>Responsible Party</th><th>Due Date</th><th>Priority</th></tr></thead><tbody>...</tbody></table>

<h2>6. NEXT STEPS AND UPCOMING MEETINGS</h2>
Summarize follow-up activities, next scheduled meetings, and preparation required.

<h2>7. DISTRIBUTION AND APPROVAL</h2>
<p>These minutes are circulated to all meeting attendees for review and approval. Corrections must be submitted within five (5) business days of receipt.</p>
<p><em>Minutes prepared by: _____________________________  Date: _____________________________</em></p>

Maintain ALL factual information from the raw notes. Output ONLY the HTML content — no explanations, no preamble, no markdown.`,
  },
};

interface SkillRow {
  id: string;
  skill_key: string;
  display_name: string;
  description: string | null;
  system_prompt: string;
  model: string;
  is_active: boolean;
  updated_at: string;
}

function EditPromptDialog({
  skill,
  open,
  onOpenChange,
}: {
  skill: SkillRow;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const qc = useQueryClient();
  const [prompt, setPrompt] = useState(skill.system_prompt);
  const [model, setModel] = useState(skill.model);
  const [dirty, setDirty] = useState(false);

  const save = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('ai_skill_prompts')
        .update({ system_prompt: prompt, model, updated_by: user?.id, updated_at: new Date().toISOString() })
        .eq('id', skill.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Skill prompt saved');
      qc.invalidateQueries({ queryKey: ['ai-skill-prompts'] });
      setDirty(false);
      onOpenChange(false);
    },
    onError: (err: Error) => toast.error(`Failed to save: ${err.message}`),
  });

  const reset = () => {
    const defaults = DEFAULT_PROMPTS[skill.skill_key];
    if (defaults) {
      setPrompt(defaults.system_prompt);
      setModel(defaults.model);
      setDirty(true);
      toast.info('Default prompt loaded — click Save to apply');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit2 className="h-4 w-4" />
            Edit Prompt — {skill.display_name}
          </DialogTitle>
          <DialogDescription>
            Changes take effect immediately on the next generation. No redeployment needed.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 flex-1 overflow-hidden">
          {/* Model selector */}
          <div className="flex items-center gap-3">
            <Label className="shrink-0 text-sm font-medium">Model</Label>
            <Select value={model} onValueChange={(v) => { setModel(v); setDirty(true); }}>
              <SelectTrigger className="w-72">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MODELS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {model.startsWith('claude') && (
              <Badge variant="outline" className="text-amber-600 border-amber-300">
                Requires ANTHROPIC_API_KEY secret
              </Badge>
            )}
          </div>

          {/* Prompt textarea */}
          <div className="flex flex-col gap-1.5 flex-1 min-h-0">
            <Label className="text-sm font-medium">System Prompt</Label>
            <Textarea
              value={prompt}
              onChange={(e) => { setPrompt(e.target.value); setDirty(true); }}
              className="flex-1 min-h-[400px] font-mono text-xs resize-none"
              spellCheck={false}
            />
            <p className="text-xs text-muted-foreground">
              {prompt.length.toLocaleString()} characters
            </p>
          </div>

          {/* Last updated */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            Last updated: {format(new Date(skill.updated_at), 'MMM d, yyyy · h:mm a')}
          </div>
        </div>

        <DialogFooter className="gap-2 pt-2">
          <Button variant="outline" onClick={reset} className="gap-2">
            <RotateCcw className="h-3.5 w-3.5" />
            Reset to Default
          </Button>
          <Button
            onClick={() => save.mutate()}
            disabled={!dirty || save.isPending}
            className="gap-2"
          >
            <Save className="h-3.5 w-3.5" />
            {save.isPending ? 'Saving…' : 'Save Prompt'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function AISkillsSettings() {
  const qc = useQueryClient();
  const [editingSkill, setEditingSkill] = useState<SkillRow | null>(null);

  const { data: skills, isLoading } = useQuery({
    queryKey: ['ai-skill-prompts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_skill_prompts')
        .select('*')
        .order('display_name');
      if (error) throw error;
      return data as SkillRow[];
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('ai_skill_prompts')
        .update({ is_active, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ai-skill-prompts'] }),
    onError: (err: Error) => toast.error(`Failed to update: ${err.message}`),
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <CardTitle className="flex items-center gap-2">
                AI Skills & Prompts
                <Badge variant="outline">Admin Only</Badge>
              </CardTitle>
              <CardDescription>
                Configure the AI behavior for each skill. Changes take effect immediately — no redeployment needed.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <div key={i} className="h-24 rounded-lg bg-muted animate-pulse" />
              ))}
            </div>
          ) : !skills || skills.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Bot className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p className="font-medium">No AI skills configured</p>
              <p className="text-sm mt-1">Skills are seeded automatically on first setup.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {skills.map((skill, idx) => (
                <div key={skill.id}>
                  {idx > 0 && <Separator />}
                  <div className="flex items-start gap-4 py-4">
                    {/* Icon */}
                    <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-0.5">
                      <Bot className="h-5 w-5 text-muted-foreground" />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{skill.display_name}</span>
                        <Badge variant="secondary" className="font-mono text-xs">
                          {skill.skill_key}
                        </Badge>
                        {!skill.is_active && (
                          <Badge variant="outline" className="text-muted-foreground">Disabled</Badge>
                        )}
                      </div>
                      {skill.description && (
                        <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                          {skill.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 mt-2 flex-wrap">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Sparkles className="h-3 w-3" />
                          {MODELS.find((m) => m.value === skill.model)?.label ?? skill.model}
                        </span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Updated {format(new Date(skill.updated_at), 'MMM d, yyyy')}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {skill.system_prompt.length.toLocaleString()} chars
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={skill.is_active}
                          onCheckedChange={(v) => toggleActive.mutate({ id: skill.id, is_active: v })}
                          disabled={toggleActive.isPending}
                        />
                        <Label className="text-sm text-muted-foreground">
                          {skill.is_active ? 'Active' : 'Inactive'}
                        </Label>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() => setEditingSkill(skill)}
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                        Edit Prompt
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info card */}
      <Card className="border-dashed">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <Bot className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
            <div className="text-sm text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">How it works</p>
              <p>
                Each AI skill has a system prompt stored in the database. When a user triggers that skill
                (e.g. "Generate Meeting Minutes"), the edge function reads this prompt and sends it to the
                configured AI model. Edits here take effect on the <strong>very next generation</strong> — 
                no code changes or redeployment needed.
              </p>
              <p>
                To use Claude models, add your <code className="bg-muted px-1 rounded text-xs">ANTHROPIC_API_KEY</code> as a
                backend secret. If Claude is selected but the key is missing, the system falls back to Gemini automatically.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit dialog */}
      {editingSkill && (
        <EditPromptDialog
          skill={editingSkill}
          open={!!editingSkill}
          onOpenChange={(v) => !v && setEditingSkill(null)}
        />
      )}
    </div>
  );
}
