/**
 * RecipientsInput — multi-email chip field with autocomplete from previously-
 * used addresses. Deliberately email-only: no name is ever required to add a
 * recipient. Whatever gets sent to is remembered automatically (see
 * useSavedRecipients.rememberAll, called after a successful send) — there's
 * no separate "save to contacts" step to remember to click.
 */
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverAnchor } from "@/components/ui/popover";
import { Command, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSavedRecipients } from "@/hooks/useSavedRecipients";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function RecipientsInput({
  value, onChange, placeholder,
}: {
  value: string[];
  onChange: (emails: string[]) => void;
  placeholder?: string;
}) {
  const { data: saved = [] } = useSavedRecipients();
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);

  const suggestions = useMemo(() => {
    const q = text.trim().toLowerCase();
    return saved
      .filter((s) => !value.includes(s.email))
      .filter((s) => !q || s.email.includes(q) || (s.label ?? "").toLowerCase().includes(q))
      .slice(0, 6);
  }, [saved, text, value]);

  const add = (raw: string) => {
    const email = raw.trim().replace(/[,;]$/, "").toLowerCase();
    if (!email) return;
    if (!EMAIL_RE.test(email)) return;
    if (!value.includes(email)) onChange([...value, email]);
    setText("");
  };

  const remove = (email: string) => onChange(value.filter((e) => e !== email));

  return (
    <Popover open={open && suggestions.length > 0} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-input bg-background px-2 py-1.5 min-h-9 focus-within:ring-1 focus-within:ring-ring">
          {value.map((email) => {
            const known = saved.find((s) => s.email === email);
            return (
              <Badge key={email} variant="secondary" className="gap-1 pl-2 pr-1 h-6 text-xs font-normal">
                {known?.label ? `${known.label} <${email}>` : email}
                <button type="button" onClick={() => remove(email)} className="rounded-full hover:bg-muted-foreground/20 p-0.5">
                  <X className="h-2.5 w-2.5" />
                </button>
              </Badge>
            );
          })}
          <input
            value={text}
            onChange={(e) => { setText(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onKeyDown={(e) => {
              if ((e.key === "Enter" || e.key === "," || e.key === " ") && text.trim()) { e.preventDefault(); add(text); }
              if (e.key === "Backspace" && !text && value.length) remove(value[value.length - 1]);
            }}
            onBlur={() => { if (text.trim()) add(text); }}
            placeholder={value.length ? "" : placeholder ?? "email@example.com"}
            className="flex-1 min-w-[140px] bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
      </PopoverAnchor>
      <PopoverContent align="start" className="w-72 p-0" onOpenAutoFocus={(e) => e.preventDefault()}>
        <Command>
          <CommandList>
            <CommandGroup heading="Saved addresses">
              {suggestions.map((s) => (
                <CommandItem key={s.id} onSelect={() => { add(s.email); setOpen(false); }} className="text-xs">
                  <span className="truncate">{s.label ? `${s.label} — ${s.email}` : s.email}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
