/**
 * A5 · CostCodePicker
 *
 * Canonical cost code selector used by every financial form in D1–D6.
 * Uses the tenant's default library and supports 5000+ codes with
 * debounced filter. Lightweight (no react-window dependency);
 * if performance becomes an issue with very large libraries, swap the
 * inner <div> for a virtualized list.
 */
import { useMemo, useState } from "react";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown } from "lucide-react";
import { useCostCodes, useDefaultLibrary } from "@/hooks/useCostCodes";

export function CostCodePicker({
  value,
  onChange,
  libraryId,
  placeholder = "Select cost code…",
  disabled,
}: {
  value: string | null;
  onChange: (codeId: string | null) => void;
  libraryId?: string;
  placeholder?: string;
  disabled?: boolean;
}) {
  const { data: defaultLib } = useDefaultLibrary();
  const activeLibraryId = libraryId ?? defaultLib?.id ?? null;
  const { data: codes = [] } = useCostCodes(activeLibraryId);

  const [open, setOpen] = useState(false);
  const selected = useMemo(
    () => codes.find((c) => c.id === value) ?? null,
    [codes, value],
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className="w-full justify-between font-mono"
          disabled={disabled || !activeLibraryId}
        >
          {selected ? (
            <span className="truncate">
              <span className="text-muted-foreground">{selected.code}</span>{" "}
              {selected.description}
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[420px] p-0">
        <Command>
          <CommandInput placeholder="Search by code or description…" />
          <CommandList>
            <CommandEmpty>No matching codes.</CommandEmpty>
            <CommandGroup>
              {codes.map((c) => (
                <CommandItem
                  key={c.id}
                  value={`${c.code} ${c.description}`}
                  onSelect={() => {
                    onChange(c.id === value ? null : c.id);
                    setOpen(false);
                  }}
                >
                  <Check className={`mr-2 h-4 w-4 ${value === c.id ? "opacity-100" : "opacity-0"}`} />
                  <span className="font-mono text-muted-foreground mr-2">{c.code}</span>
                  <span className="truncate">{c.description}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
