import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, BookMarked } from 'lucide-react';
import { useProjectDictionary } from '@/hooks/useProjectDictionary';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectName?: string;
}

export function ProjectDictionaryDialog({ open, onOpenChange, projectId, projectName }: Props) {
  const { data: terms, create, remove } = useProjectDictionary(projectId);
  const [term, setTerm] = useState('');
  const [variants, setVariants] = useState('');

  const add = async () => {
    if (!term.trim()) return;
    await create.mutateAsync({
      term: term.trim(),
      variants: variants.split(/[,;]+/).map((v) => v.trim()).filter(Boolean),
    });
    setTerm(''); setVariants('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><BookMarked className="h-4 w-4 text-muted-foreground" />Vocabulary{projectName ? ` · ${projectName}` : ''}</DialogTitle>
          <DialogDescription>Teach the AI the right spellings for names and terms on this project. It will use these and fix common mishears when summarizing meetings and extracting action items.</DialogDescription>
        </DialogHeader>

        {/* Add */}
        <div className="rounded-lg border p-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div className="grid gap-1"><Label className="text-xs">Correct spelling</Label><Input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Dhruman" className="h-9" /></div>
            <div className="grid gap-1"><Label className="text-xs">Sounds like / mishears</Label><Input value={variants} onChange={(e) => setVariants(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') add(); }} placeholder="Roman, Druman, Dhruv" className="h-9" /></div>
          </div>
          <div className="flex justify-end">
            <Button size="sm" onClick={add} disabled={create.isPending || !term.trim()} className="gap-1.5"><Plus className="h-4 w-4" />Add term</Button>
          </div>
        </div>

        {/* List */}
        <div className="rounded-lg border divide-y">
          {(terms ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground px-3 py-6 text-center">No terms yet. Add names or jargon the AI keeps getting wrong.</p>
          ) : (terms ?? []).map((t) => (
            <div key={t.id} className="flex items-start gap-3 px-3 py-2.5">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium">{t.term}</div>
                {t.variants.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {t.variants.map((v) => <Badge key={v} variant="secondary" className="text-[11px] font-normal">{v}</Badge>)}
                  </div>
                )}
              </div>
              <button onClick={() => remove.mutate(t.id)} className="shrink-0 h-7 w-7 rounded flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10" title="Remove"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
