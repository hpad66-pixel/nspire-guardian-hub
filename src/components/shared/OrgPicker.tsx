/**
 * B1 · OrgPicker — combobox over the organizations table.
 *
 * When `allowCreate` is true, an "Add new organization" action at the bottom
 * of the list creates a vendor-kind row on the fly and selects it.
 */
import { useState } from "react";
import { useOrganization, useOrganizations } from "@/hooks/useDirectory";
import type { Organization } from "@/hooks/useDirectory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { Building2, Check, ChevronsUpDown, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export interface OrgPickerProps {
  value: string | null;
  onValueChange: (id: string | null) => void;
  /** Filter to a single org kind (e.g. "sub" for subcontract flows). */
  kind?: Organization["kind"];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  allowCreate?: boolean;
}

export function OrgPicker({
  value, onValueChange, kind, placeholder = "Pick an organization…",
  disabled, className, allowCreate = true,
}: OrgPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const { data: orgs = [], isLoading, create } = useOrganizations({ search, kind });
  const { data: selected } = useOrganization(value ?? null);

  async function handleCreate() {
    const name = search.trim();
    if (!name) return;
    try {
      const row = await create.mutateAsync({ name, kind });
      onValueChange(row.id);
      toast.success(`Created "${row.name}"`);
      setOpen(false);
      setSearch("");
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button" variant="outline" disabled={disabled}
          className={cn("w-full justify-between font-normal", className)}
        >
          {selected ? (
            <span className="flex items-center gap-2 truncate">
              <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
              {selected.name}
              <Badge variant="outline" className="text-[10px] capitalize">{selected.kind}</Badge>
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="h-4 w-4 opacity-50 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[--radix-popover-trigger-width]" align="start">
        <div className="p-2 border-b">
          <Input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search organizations…"
          />
        </div>
        <div className="max-h-72 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-sm text-muted-foreground">Loading…</div>
          ) : orgs.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground">
              {search.trim() ? "No matches." : "No organizations yet."}
            </div>
          ) : (
            <ul className="py-1">
              {orgs.map((o) => {
                const isSel = o.id === value;
                return (
                  <li key={o.id}>
                    <button
                      type="button"
                      onClick={() => { onValueChange(o.id); setOpen(false); }}
                      className={cn(
                        "w-full flex items-start gap-2 px-3 py-2 text-sm hover:bg-muted text-left",
                        isSel && "bg-muted",
                      )}
                    >
                      <Check className={cn("h-3.5 w-3.5 mt-1", isSel ? "opacity-100" : "opacity-0")} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate flex items-center gap-2">
                          {o.name}
                          <Badge variant="outline" className="text-[10px] capitalize">{o.kind}</Badge>
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {[o.email, o.phone, o.city].filter(Boolean).join(" · ") || "—"}
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <div className="border-t p-2 space-y-1">
          {allowCreate && search.trim() && !orgs.some((o) => o.name.toLowerCase() === search.trim().toLowerCase()) && (
            <Button
              variant="ghost" size="sm" className="w-full"
              onClick={handleCreate}
              disabled={create.isPending}
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              {create.isPending ? "Creating…" : `Create "${search.trim()}"`}
            </Button>
          )}
          {value && (
            <Button
              variant="ghost" size="sm" className="w-full"
              onClick={() => { onValueChange(null); setOpen(false); }}
            >
              <X className="h-3.5 w-3.5 mr-1" /> Clear selection
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
