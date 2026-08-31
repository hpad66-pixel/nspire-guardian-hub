/**
 * Searchable multi-select dialog to attach CRM contacts to a project directory.
 * Built for large contact lists (hundreds) — search-first, checkbox multi-add.
 */
import { useMemo, useState } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Search, Users, Star, Loader2, UserPlus } from "lucide-react";
import {
  useCRMContacts,
  CONTACT_TYPE_LABELS,
  type CRMContact,
} from "@/hooks/useCRMContacts";
import { useProjectDirectory } from "@/hooks/useProjectDirectory";
import { useProjectContactIds } from "@/hooks/useContactAssignments";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function displayName(c: Pick<CRMContact, "first_name" | "last_name" | "email" | "company_name">) {
  const name = [c.first_name, c.last_name].filter(Boolean).join(" ");
  return name || c.email || c.company_name || "Unnamed";
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectName?: string;
}

export function AddFromCrmDialog({ open, onOpenChange, projectId, projectName }: Props) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [roleLabel, setRoleLabel] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: contacts = [], isLoading } = useCRMContacts({
    search: search.trim() || undefined,
  });
  const { data: alreadyOnProject = [] } = useProjectContactIds(projectId);
  const directory = useProjectDirectory(projectId);
  const onProject = useMemo(() => new Set(alreadyOnProject), [alreadyOnProject]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = contacts.filter((c) => c.is_active !== false);
    if (q) {
      list = list.filter((c) => {
        const hay = [
          c.first_name, c.last_name, c.email, c.company_name, c.job_title, c.phone, c.mobile,
        ].filter(Boolean).join(" ").toLowerCase();
        return hay.includes(q);
      });
    }
    // Favorites first, then alphabetical; already-on-project sink to bottom.
    return [...list].sort((a, b) => {
      const aOn = onProject.has(a.id) ? 1 : 0;
      const bOn = onProject.has(b.id) ? 1 : 0;
      if (aOn !== bOn) return aOn - bOn;
      if (a.is_favorite !== b.is_favorite) return a.is_favorite ? -1 : 1;
      return displayName(a).localeCompare(displayName(b));
    });
  }, [contacts, search, onProject]);

  const toggle = (id: string) => {
    if (onProject.has(id)) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const reset = () => {
    setSearch("");
    setSelected(new Set());
    setRoleLabel("");
  };

  const handleAdd = async () => {
    if (selected.size === 0) {
      toast.error("Select at least one contact");
      return;
    }
    setBusy(true);
    try {
      let added = 0;
      for (const contactId of selected) {
        if (onProject.has(contactId)) continue;
        await directory.add.mutateAsync({
          contact_id: contactId,
          role_label: roleLabel.trim() || "Contact",
          is_key_contact: false,
        } as any);
        added += 1;
      }
      toast.success(
        added === 1
          ? "Contact added to project"
          : `${added} contacts added to project`,
      );
      reset();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Could not add contacts");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!busy) {
          if (!o) reset();
          onOpenChange(o);
        }
      }}
    >
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 p-0 sm:max-w-[560px]">
        <DialogHeader className="border-b px-6 py-5 text-left">
          <DialogTitle className="flex items-center gap-2 font-[Playfair_Display] text-xl">
            <Users className="h-5 w-5 text-[var(--apas-sapphire)]" />
            Add from CRM
          </DialogTitle>
          <DialogDescription>
            Search your master contacts and attach people to{" "}
            <span className="font-medium text-foreground">{projectName ?? "this project"}</span>.
            They become available for email, invoices, and all project communications.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 px-6 py-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, company…"
              className="h-11 pl-9"
            />
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs text-muted-foreground">Role on this project (optional)</Label>
            <Input
              value={roleLabel}
              onChange={(e) => setRoleLabel(e.target.value)}
              placeholder="e.g. Client, Architect, Owner rep"
              className="h-9"
            />
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {isLoading ? "Loading…" : `${visible.length} contact${visible.length === 1 ? "" : "s"}`}
              {selected.size > 0 && (
                <span className="ml-2 font-medium text-[var(--apas-sapphire)]">
                  · {selected.size} selected
                </span>
              )}
            </span>
            {selected.size > 0 && (
              <button
                type="button"
                className="text-[var(--apas-sapphire)] hover:underline"
                onClick={() => setSelected(new Set())}
              >
                Clear selection
              </button>
            )}
          </div>
        </div>

        <ScrollArea className="min-h-0 flex-1 border-y px-2">
          <div className="max-h-[42vh] space-y-0.5 py-2">
            {isLoading ? (
              <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading contacts…
              </div>
            ) : visible.length === 0 ? (
              <div className="py-16 text-center text-sm text-muted-foreground">
                No contacts match. Try a different search or add them in CRM first.
              </div>
            ) : (
              visible.map((c) => (
                <ContactRow
                  key={c.id}
                  contact={c}
                  checked={selected.has(c.id)}
                  alreadyOn={onProject.has(c.id)}
                  onToggle={() => toggle(c.id)}
                />
              ))
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2 px-6 py-4 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button
            onClick={handleAdd}
            disabled={busy || selected.size === 0}
            className="gap-1.5 bg-[var(--apas-sapphire)] hover:bg-[var(--apas-sapphire)]/90"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
            {selected.size === 0
              ? "Add to project"
              : `Add ${selected.size} to project`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ContactRow({
  contact,
  checked,
  alreadyOn,
  onToggle,
}: {
  contact: CRMContact;
  checked: boolean;
  alreadyOn: boolean;
  onToggle: () => void;
}) {
  const name = displayName(contact);
  const typeLabel = CONTACT_TYPE_LABELS[contact.contact_type] ?? contact.contact_type;

  return (
    <button
      type="button"
      disabled={alreadyOn}
      onClick={onToggle}
      className={cn(
        "flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
        alreadyOn
          ? "cursor-not-allowed opacity-50"
          : checked
            ? "bg-[var(--apas-sapphire)]/10"
            : "hover:bg-muted/60",
      )}
    >
      <Checkbox
        checked={alreadyOn || checked}
        disabled={alreadyOn}
        className="mt-0.5"
        onCheckedChange={() => onToggle()}
        onClick={(e) => e.stopPropagation()}
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="truncate text-sm font-medium">{name}</span>
          {contact.is_favorite && <Star className="h-3 w-3 fill-amber-400 text-amber-400" />}
          <Badge variant="outline" className="text-[10px]">{typeLabel}</Badge>
          {alreadyOn && (
            <Badge variant="secondary" className="text-[10px]">On project</Badge>
          )}
        </div>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {[contact.company_name, contact.job_title, contact.email, contact.mobile || contact.phone]
            .filter(Boolean)
            .join(" · ") || "No email or phone on file"}
        </p>
      </div>
    </button>
  );
}
