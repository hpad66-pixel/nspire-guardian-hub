/**
 * B1 · PersonPicker — unified combobox over platform users + CRM contacts.
 *
 * Callers get both the id and the discriminator so they can write the
 * correct FK onto their parent record (e.g. `user_id` vs `contact_id`).
 *
 *   const [ref, setRef] = useState<PersonRef | null>(null);
 *   <PersonPicker value={ref} onChange={setRef} />
 */
import { useState } from "react";
import { usePersonSearch, usePersonByReference } from "@/hooks/useDirectory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Check, ChevronsUpDown, X, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PersonRef {
  kind: "user" | "contact";
  id: string;
  name?: string;
}

export interface PersonPickerProps {
  value: PersonRef | null;
  onChange: (next: PersonRef | null) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  /** Limit to one source — e.g. "user" when the slot is a login account. */
  restrictTo?: "user" | "contact";
}

export function PersonPicker({
  value, onChange, placeholder = "Pick a person…",
  disabled, className, restrictTo,
}: PersonPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const { data: matches = [], isFetching } = usePersonSearch(query);

  // When a value is set but we only have the id, fetch its row to render the name.
  const { data: resolved } = usePersonByReference(
    value?.kind === "user" ? value.id : null,
    value?.kind === "contact" ? value.id : null,
  );

  const filtered = restrictTo
    ? matches.filter((m) => m.kind === restrictTo)
    : matches;

  const displayName = value?.name ?? resolved?.name ?? (value ? "(loading…)" : "");

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button" variant="outline" disabled={disabled}
          className={cn("w-full justify-between font-normal", className)}
        >
          {value ? (
            <span className="flex items-center gap-2 truncate">
              <UserRound className="h-3.5 w-3.5 text-muted-foreground" />
              {displayName}
              <Badge variant="outline" className="text-[10px]">{value.kind}</Badge>
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
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, email, or company…"
          />
        </div>
        <div className="max-h-72 overflow-y-auto">
          {query.trim().length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground">
              Start typing to search the directory.
            </div>
          ) : isFetching ? (
            <div className="p-4 text-sm text-muted-foreground">Searching…</div>
          ) : filtered.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground">No matches.</div>
          ) : (
            <ul className="py-1">
              {filtered.map((p) => {
                const isSel = value?.id === p.id && value.kind === p.kind;
                return (
                  <li key={`${p.kind}:${p.id}`}>
                    <button
                      type="button"
                      onClick={() => {
                        onChange({ kind: p.kind, id: p.id, name: p.name });
                        setOpen(false);
                      }}
                      className={cn(
                        "w-full flex items-start gap-2 px-3 py-2 text-sm hover:bg-muted text-left",
                        isSel && "bg-muted",
                      )}
                    >
                      <Check className={cn("h-3.5 w-3.5 mt-1", isSel ? "opacity-100" : "opacity-0")} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate flex items-center gap-2">
                          {p.name}
                          <Badge variant="outline" className="text-[10px]">{p.kind}</Badge>
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {[p.email, p.phone, p.companyName].filter(Boolean).join(" · ") || "—"}
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        {value && (
          <div className="border-t p-2">
            <Button
              type="button" variant="ghost" size="sm" className="w-full"
              onClick={() => { onChange(null); setOpen(false); }}
            >
              <X className="h-3.5 w-3.5 mr-1" /> Clear selection
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
