/**
 * G4 · CreateApiClientDialog
 *
 * Form for minting a new API client. On submit, calls the
 * api-key-mint edge function (which generates the plaintext
 * secret server-side and returns it once). The parent renders
 * RevealSecretOnceDialog with the returned secret.
 */
import { useState } from "react";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const AVAILABLE_SCOPES = [
  "read:projects",
  "read:commitments", "write:commitments",
  "read:change-orders", "write:change-orders",
  "read:rfis", "write:rfis",
  "read:budget",
  "read:pay-apps", "write:pay-apps",
  "write:direct-costs",
];

export interface MintedApiClient {
  client_id: string;
  client_secret: string;
  api_client: { id: string; name: string; scopes: string[] };
}

interface CreateApiClientDialogProps {
  open: boolean;
  onClose: () => void;
  onMinted: (m: MintedApiClient) => void;
}

export function CreateApiClientDialog({
  open, onClose, onMinted,
}: CreateApiClientDialogProps) {
  const [name, setName] = useState("");
  const [scopes, setScopes] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  function toggleScope(s: string) {
    setScopes((prev) => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { toast.error("Name is required"); return; }
    if (scopes.length === 0) { toast.error("Choose at least one scope"); return; }

    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("api-key-mint", {
        body: { name: name.trim(), scopes },
      });
      if (error) throw error;
      const minted = data as MintedApiClient;
      if (!minted?.client_secret) throw new Error("mint did not return a secret");
      onMinted(minted);
      setName("");
      setScopes([]);
    } catch (err: any) {
      toast.error(err.message ?? "Mint failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Create API client</DialogTitle>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="api-client-name">Name</Label>
            <Input
              id="api-client-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. CI deploy bot"
              autoFocus
            />
          </div>

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
            <Button type="submit" disabled={submitting}>
              {submitting ? "Creating…" : "Create client"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default CreateApiClientDialog;
