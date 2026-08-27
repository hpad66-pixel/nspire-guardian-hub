import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Trello as TrelloIcon } from 'lucide-react';
import {
  useSetTrelloProjectList,
  useTrelloLists,
  useTrelloProjectList,
  useTrelloStatus,
  type TrelloList,
} from '@/hooks/useTrello';

/** Compact Action Items header control for the Trello list used by one project. */
export function TrelloProjectList({ projectId }: { projectId: string }) {
  const { data: status } = useTrelloStatus();
  const { data: mapping } = useTrelloProjectList(projectId);
  const loadLists = useTrelloLists();
  const setList = useSetTrelloProjectList(projectId);
  const [open, setOpen] = useState(false);
  const [lists, setLists] = useState<TrelloList[] | null>(null);
  const [choice, setChoice] = useState('');

  if (!status?.connected) return null;
  const currentName = mapping?.list_name || status.listName || 'default list';

  const openDialog = async () => {
    setOpen(true);
    if (lists !== null) return;
    try {
      const result = await loadLists.mutateAsync(undefined);
      setLists(result.lists ?? []);
    } catch { setLists([]); }
  };

  const save = async () => {
    const selected = (lists ?? []).find((list) => list.id === choice);
    if (!selected) return;
    await setList.mutateAsync(selected);
    setOpen(false);
  };

  return (
    <>
      <button type="button" onClick={openDialog} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground border rounded-full px-2.5 py-1 hover:bg-muted/50 transition-colors" title="Choose the Trello list for this project">
        <TrelloIcon className="h-3.5 w-3.5 text-[#0C66E4]" />
        Trello: <span className="font-medium text-foreground max-w-[160px] truncate">{currentName}</span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle>Trello list for this project</DialogTitle>
            <DialogDescription>Instructions from this project will become cards in this list. If no override is selected, the workspace default is used.</DialogDescription>
          </DialogHeader>
          {loadLists.isPending && lists === null ? (
            <div className="py-6 text-center text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin inline mr-1.5" />Loading Trello boards…</div>
          ) : (
            <Select value={choice} onValueChange={setChoice}>
              <SelectTrigger><SelectValue placeholder="Choose a board and list" /></SelectTrigger>
              <SelectContent>{(lists ?? []).map((list) => <SelectItem key={list.id} value={list.id}>{list.path}</SelectItem>)}</SelectContent>
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
