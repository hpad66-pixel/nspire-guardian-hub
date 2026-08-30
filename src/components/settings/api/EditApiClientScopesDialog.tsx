import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import type { ApiClient } from "@/hooks/useApiClients";
import { AVAILABLE_SCOPES } from "./CreateApiClientDialog";

interface EditApiClientScopesDialogProps {
  client: ApiClient | null;
  open: boolean;
  saving?: boolean;
  onClose: () => void;
  onSave: (scopes: string[]) => Promise<void>;
}

export function EditApiClientScopesDialog({
  client, open, saving, onClose, onSave,
}: EditApiClientScopesDialogProps) {
  const [scopes, setScopes] = useState<string[]>([]);

  useEffect(() => {
    if (open) setScopes(client?.scopes ?? []);
  }, [open, client]);

  function toggleScope(s: string) {
    setScopes((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (scopes.length === 0) { toast.error("Choose at least one scope"); return; }
    try {
      await onSave(scopes);
      toast.success("Scopes updated. New OAuth tokens pick up the change within about an hour.");
      onClose();
    } catch (err: any) {
      toast.error(err.message ?? "Could not update scopes");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Edit scopes{client ? ` · ${client.name}` : ""}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Existing access tokens keep their old scopes until they expire (about 1 hour).
            Redeploying Pages or waiting for the next token refresh applies the new set.
          </p>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Scopes</legend>
            <div className="grid grid-cols-2 gap-2">
              {AVAILABLE_SCOPES.map((s) => (
                <label key={s} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={scopes.includes(s)}
                    onCheckedChange={() => toggleScope(s)}
                  />
                  <span className="font-mono text-xs">{s}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save scopes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default EditApiClientScopesDialog;
