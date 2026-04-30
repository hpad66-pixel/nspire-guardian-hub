/**
 * C2 · WorkflowEditor — configure the ordered list of approvers on a submittal.
 *
 * Users pick profiles from the tenant directory, reorder them with ↑/↓, and
 * commit the list. `setApprovers()` wipes and re-inserts the
 * submittal_workflow_steps rows, preserving the sequence.
 */
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSubmittalSteps } from "@/hooks/useProcoreSubmittals";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  ChevronUp, ChevronDown, Trash2, UserPlus,
} from "lucide-react";
import { toast } from "sonner";

interface ProfileOption {
  id: string;
  display_name: string;
  email: string | null;
}

export function WorkflowEditor({
  open, onOpenChange, submittalId,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  submittalId: string | null;
}) {
  const { data: steps = [], setApprovers } = useSubmittalSteps(submittalId);
  const [approverIds, setApproverIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");

  // Sync internal draft with the saved step list when the dialog opens.
  useEffect(() => {
    if (!open) return;
    setApproverIds(steps.map((s) => s.approver_id));
  }, [open, steps]);

  const { data: profiles = [] } = useQuery<ProfileOption[]>({
    queryKey: ["profiles-directory", search],
    queryFn: async () => {
      let q = supabase
        .from("profiles" as any)
        .select("id, display_name, email")
        .order("display_name")
        .limit(50);
      if (search.trim()) {
        q = q.or(
          `display_name.ilike.%${search.trim()}%,email.ilike.%${search.trim()}%`,
        );
      }
      const { data, error } = await q;
      if (error) throw error;
      return ((data ?? []) as any[]).map((p) => ({
        id: p.id, display_name: p.display_name ?? "(unnamed)", email: p.email ?? null,
      }));
    },
    enabled: open,
  });

  const orderedApprovers = useMemo(() => {
    return approverIds
      .map((id) => profiles.find((p) => p.id === id) ?? { id, display_name: "(loading)", email: null });
  }, [approverIds, profiles]);

  function addApprover(id: string) {
    if (approverIds.includes(id)) return;
    setApproverIds((xs) => [...xs, id]);
  }
  function removeApprover(id: string) {
    setApproverIds((xs) => xs.filter((x) => x !== id));
  }
  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= approverIds.length) return;
    const next = approverIds.slice();
    [next[i], next[j]] = [next[j], next[i]];
    setApproverIds(next);
  }

  async function handleSave() {
    if (!submittalId) return;
    try {
      await setApprovers.mutateAsync(approverIds);
      toast.success(`Saved ${approverIds.length} approver${approverIds.length === 1 ? "" : "s"}`);
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !setApprovers.isPending && onOpenChange(o)}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Edit submittal workflow</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
              Available
            </div>
            <Input
              placeholder="Search users…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="mb-2"
            />
            <div className="border rounded-md max-h-64 overflow-y-auto">
              {profiles.length === 0 ? (
                <div className="p-3 text-xs text-muted-foreground">
                  No users match.
                </div>
              ) : (
                <ul className="divide-y text-sm">
                  {profiles
                    .filter((p) => !approverIds.includes(p.id))
                    .map((p) => (
                      <li key={p.id}>
                        <button
                          type="button"
                          onClick={() => addApprover(p.id)}
                          className="w-full flex items-center justify-between p-2 hover:bg-muted text-left"
                        >
                          <div className="min-w-0">
                            <div className="truncate">{p.display_name}</div>
                            <div className="text-xs text-muted-foreground truncate">
                              {p.email ?? "—"}
                            </div>
                          </div>
                          <UserPlus className="h-3.5 w-3.5 text-muted-foreground" />
                        </button>
                      </li>
                    ))}
                </ul>
              )}
            </div>
          </div>

          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
              Approvers · {approverIds.length}
            </div>
            <div className="border rounded-md max-h-64 overflow-y-auto">
              {approverIds.length === 0 ? (
                <div className="p-3 text-xs text-muted-foreground">
                  Pick one or more approvers from the left.
                </div>
              ) : (
                <ol className="divide-y text-sm">
                  {orderedApprovers.map((p, i) => (
                    <li key={p.id} className="flex items-center gap-2 p-2">
                      <span className="w-5 text-xs font-mono text-muted-foreground">
                        #{i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="truncate">{p.display_name}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {p.email ?? "—"}
                        </div>
                      </div>
                      <div className="flex items-center gap-0.5">
                        <Button size="icon" variant="ghost" className="h-6 w-6"
                                onClick={() => move(i, -1)} disabled={i === 0}>
                          <ChevronUp className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-6 w-6"
                                onClick={() => move(i, 1)} disabled={i === approverIds.length - 1}>
                          <ChevronDown className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-6 w-6"
                                onClick={() => removeApprover(p.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}
                  disabled={setApprovers.isPending}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={setApprovers.isPending}>
            {setApprovers.isPending ? "Saving…" : `Save · ${approverIds.length} step${approverIds.length === 1 ? "" : "s"}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
