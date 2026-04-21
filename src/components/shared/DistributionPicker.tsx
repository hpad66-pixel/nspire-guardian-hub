/**
 * A3 · DistributionPicker
 *
 * Canonical multi-select control used by every workflow form that sends
 * notifications. Returns selected list IDs, individual user IDs, and free-form emails.
 */
import { useState } from "react";
import { useDistributionLists } from "@/hooks/useDistributionLists";
import { Check, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export interface DistributionSelection {
  listIds: string[];
  userIds: string[];
  extraEmails: string[];
}

export function DistributionPicker({
  projectId,
  value,
  onChange,
  label = "Distribution",
}: {
  projectId?: string | null;
  value: DistributionSelection;
  onChange: (v: DistributionSelection) => void;
  label?: string;
}) {
  const { data: lists = [], isLoading } = useDistributionLists({ projectId });
  const [emailDraft, setEmailDraft] = useState("");

  function toggleList(id: string) {
    const on = value.listIds.includes(id);
    onChange({
      ...value,
      listIds: on ? value.listIds.filter((x) => x !== id) : [...value.listIds, id],
    });
  }

  function addEmail() {
    const e = emailDraft.trim();
    if (!e || value.extraEmails.includes(e)) return;
    onChange({ ...value, extraEmails: [...value.extraEmails, e] });
    setEmailDraft("");
  }

  function removeEmail(e: string) {
    onChange({ ...value, extraEmails: value.extraEmails.filter((x) => x !== e) });
  }

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">{label}</Label>

      <div className="rounded-md border p-3 space-y-2">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">Lists</div>
        {isLoading ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : lists.length === 0 ? (
          <div className="text-sm text-muted-foreground">No lists yet.</div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {lists.map((l) => {
              const on = value.listIds.includes(l.id);
              return (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => toggleList(l.id)}
                  className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs ${
                    on ? "bg-primary text-primary-foreground border-primary" : "bg-background"
                  }`}
                >
                  {on && <Check className="h-3 w-3" />}
                  {l.name}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="rounded-md border p-3 space-y-2">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">Additional emails</div>
        <div className="flex gap-2">
          <Input
            type="email"
            placeholder="person@company.com"
            value={emailDraft}
            onChange={(e) => setEmailDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addEmail())}
          />
          <Button type="button" onClick={addEmail} disabled={!emailDraft.trim()}>
            Add
          </Button>
        </div>
        {value.extraEmails.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {value.extraEmails.map((e) => (
              <Badge key={e} variant="secondary" className="gap-1">
                {e}
                <button type="button" onClick={() => removeEmail(e)} className="hover:text-destructive">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
