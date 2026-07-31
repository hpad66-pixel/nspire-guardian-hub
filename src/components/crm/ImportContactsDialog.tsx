import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Sparkles, Mail, Building2 } from "lucide-react";
import { toast } from "sonner";
import { useSuggestedContacts } from "@/hooks/useSuggestedContacts";
import { useCreateCRMContact, CONTACT_TYPE_LABELS } from "@/hooks/useCRMContacts";
import type { ContactCandidate } from "@/lib/crm/extractContacts";

interface ImportContactsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImportContactsDialog({ open, onOpenChange }: ImportContactsDialogProps) {
  const { data: candidates, isLoading, isFetching } = useSuggestedContacts(open);
  const createContact = useCreateCRMContact();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);

  // Default every fresh suggestion list to fully selected.
  useEffect(() => {
    if (candidates) setSelected(new Set(candidates.map((c) => c.key)));
  }, [candidates]);

  const allSelected = useMemo(
    () => !!candidates?.length && candidates.every((c) => selected.has(c.key)),
    [candidates, selected],
  );

  const toggle = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const toggleAll = () => {
    if (!candidates) return;
    setSelected(allSelected ? new Set() : new Set(candidates.map((c) => c.key)));
  };

  const handleImport = async () => {
    const toImport = (candidates ?? []).filter((c) => selected.has(c.key));
    if (toImport.length === 0) return;
    setImporting(true);
    let succeeded = 0;
    for (const c of toImport) {
      try {
        await createContact.mutateAsync({
          first_name: c.first_name,
          last_name: c.last_name || undefined,
          company_name: c.company_name || undefined,
          contact_type: c.contact_type,
          email: c.email || undefined,
          phone: c.phone || undefined,
          notes: `Imported from ${c.sources.join(', ')}.`,
        });
        succeeded += 1;
      } catch {
        // useCreateCRMContact already toasts the individual failure.
      }
    }
    setImporting(false);
    if (succeeded > 0) toast.success(`Imported ${succeeded} contact${succeeded === 1 ? '' : 's'}`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Import contacts from your activity
          </DialogTitle>
          <DialogDescription>
            Scanned correspondence, meetings, proposals, contracts, and purchase orders for named
            parties that aren't yet in your Contacts. Review and uncheck anything you don't want.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !candidates || candidates.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <Sparkles className="mx-auto mb-3 h-8 w-8 opacity-40" />
            <p className="text-sm">No new contacts found — everything we could extract is already in your Contacts.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between border-b pb-2">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
                {selected.size} of {candidates.length} selected
              </label>
              {isFetching && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
            </div>
            <ScrollArea className="h-[360px] pr-3">
              <div className="space-y-1.5">
                {candidates.map((c) => (
                  <CandidateRow key={c.key} candidate={c} checked={selected.has(c.key)} onToggle={() => toggle(c.key)} />
                ))}
              </div>
            </ScrollArea>
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleImport} disabled={importing || selected.size === 0}>
            {importing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Import {selected.size > 0 ? selected.size : ''} contact{selected.size === 1 ? '' : 's'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CandidateRow({ candidate, checked, onToggle }: { candidate: ContactCandidate; checked: boolean; onToggle: () => void }) {
  const fullName = [candidate.first_name, candidate.last_name].filter(Boolean).join(' ');
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 hover:bg-muted/50">
      <Checkbox checked={checked} onCheckedChange={onToggle} className="mt-0.5" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{fullName}</span>
          <Badge variant="outline" className="text-[10px]">{CONTACT_TYPE_LABELS[candidate.contact_type]}</Badge>
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
          {candidate.company_name && (
            <span className="flex items-center gap-1"><Building2 className="h-3 w-3" />{candidate.company_name}</span>
          )}
          {candidate.email && (
            <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{candidate.email}</span>
          )}
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Found in: {candidate.sources.join(', ')}
          {candidate.mentionCount > 1 && ` · ${candidate.mentionCount} mentions`}
        </p>
      </div>
    </label>
  );
}
