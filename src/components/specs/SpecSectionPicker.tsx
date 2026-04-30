/**
 * B3 · SpecSectionPicker — typeahead combobox to attach a CSI specification
 * section to an RFI, submittal, commitment, or punch item.
 *
 * Search matches against:
 *   - `section_number` prefix (e.g. "03 30" → all Concrete/Cast-in-Place sections)
 *   - `title` (case-insensitive substring)
 *
 * Props mirror shadcn/ui selects: value + onValueChange.
 */
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SpecSectionOption {
  id: string;
  section_number: string;
  title: string;
  division: string | null;
}

export interface SpecSectionPickerProps {
  projectId: string;
  value: string | null;
  onValueChange: (id: string | null) => void;
  /** Narrow to a single division (e.g. "03" — Concrete) */
  division?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function SpecSectionPicker({
  projectId, value, onValueChange, division,
  placeholder = "Pick a spec section…",
  disabled, className,
}: SpecSectionPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const { data: options = [], isLoading } = useQuery<SpecSectionOption[]>({
    queryKey: ["spec-section-options", projectId, division ?? "all"],
    enabled: Boolean(projectId),
    queryFn: async () => {
      // Pull all sections across the project's active sets.
      const { data: sets, error: setErr } = await supabase
        .from("specification_sets" as any).select("id")
        .eq("project_id", projectId).eq("status", "active");
      if (setErr) throw setErr;
      const setIds = (sets ?? []).map((s: any) => s.id);
      if (setIds.length === 0) return [];

      let q = supabase
        .from("specification_sections" as any)
        .select("id, section_number, title, division")
        .in("set_id", setIds)
        .order("section_number");
      if (division) q = q.eq("division", division);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as SpecSectionOption[];
    },
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options.slice(0, 100);
    return options.filter((o) => {
      const num = o.section_number.toLowerCase();
      const t = o.title.toLowerCase();
      return num.startsWith(q) || num.includes(q) || t.includes(q);
    }).slice(0, 100);
  }, [options, query]);

  const selected = options.find((o) => o.id === value) ?? null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn("w-full justify-between font-normal", className)}
          aria-expanded={open}
        >
          {selected ? (
            <span className="truncate">
              <span className="font-mono text-muted-foreground mr-2">
                {selected.section_number}
              </span>
              {selected.title}
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
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by number or title…"
            autoFocus
          />
        </div>
        <div className="max-h-72 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-sm text-muted-foreground">Loading sections…</div>
          ) : filtered.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground">
              {options.length === 0 ? "No active spec sets." : "No sections match."}
            </div>
          ) : (
            <ul className="py-1">
              {filtered.map((o) => {
                const isSel = o.id === value;
                return (
                  <li key={o.id}>
                    <button
                      type="button"
                      onClick={() => {
                        onValueChange(o.id);
                        setOpen(false);
                      }}
                      className={cn(
                        "w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted text-left",
                        isSel && "bg-muted",
                      )}
                    >
                      <Check className={cn("h-3.5 w-3.5", isSel ? "opacity-100" : "opacity-0")} />
                      <span className="font-mono text-xs text-muted-foreground w-24 shrink-0">
                        {o.section_number}
                      </span>
                      <span className="truncate">{o.title}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        {selected && (
          <div className="border-t p-2">
            <Button
              type="button" variant="ghost" size="sm" className="w-full"
              onClick={() => { onValueChange(null); setOpen(false); }}
            >
              <X className="h-3.5 w-3.5 mr-1" /> Clear selection
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
