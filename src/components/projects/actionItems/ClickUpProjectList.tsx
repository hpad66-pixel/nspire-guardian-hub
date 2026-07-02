import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Link2, Loader2 } from 'lucide-react';
import {
  useClickUpStatus, useClickUpProjectList, useSetClickUpProjectList, useClickUpLists, type ClickUpList,
} from '@/hooks/useClickUp';

/** Compact control (Action Items header) to choose which ClickUp list this project pushes to. */
export function ClickUpProjectList({ projectId }: { projectId: string }) {
  const { data: status } = useClickUpStatus();
  const { data: mapping } = useClickUpProjectList(projectId);
  const setList = useSetClickUpProjectList(projectId);
  const loadLists = useClickUpLists();

  const [open, setOpen] = useState(false);
  const [lists, setLists] = useState<ClickUpList[] | null>(null);
  const [choice, setChoice] = useState('');

  if (!status?.connected) return null;

  const currentName = mapping?.list_name || (mapping ? mapping.list_id : status.listName) || 'default list';

  const openDialog = async () => {
    setOpen(true);
    if (lists === null) {
      try { const res = await loadLists.mutateAsync(''); setLists(res.lists ?? []); } catch { setLists([]); }
    }
  };

  const save = async () => {
    const l = (lists ?? []).find((x) => x.id === choice);
    if (!l) return;
    await setList.mutateAsync({ list_id: l.id, list_name: l.name });
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground border rounded-full px-2.5 py-1 hover:bg-muted/50 transition-colors"
        title="Choose the ClickUp list this project pushes to"
      >
        <Link2 className="h-3.5 w-3.5" />
        ClickUp: <span className="font-medium text-foreground max-w-[160px] truncate">{currentName}</span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>ClickUp list for this project</DialogTitle>
            <DialogDescription>Action items pushed from this project go to this list. Leave unset to use the workspace default.</DialogDescription>
          </DialogHeader>
          {loadLists.isPending && lists === null ? (
            <div className="py-6 text-center text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin inline mr-1.5" />Loading lists…</div>
          ) : (
            <Select value={choice} onValueChange={setChoice}>
              <SelectTrigger><SelectValue placeholder="Choose a list" /></SelectTrigger>
              <SelectContent>
                {(lists ?? []).map((l) => <SelectItem key={l.id} value={l.id}>{l.path}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={!choice || setList.isPending}>{setList.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
