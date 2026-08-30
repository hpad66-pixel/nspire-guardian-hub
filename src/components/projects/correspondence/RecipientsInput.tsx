/**
 * RecipientsInput — multi-email chip field with autocomplete from CRM
 * contacts (workspace or project-scoped) plus previously-used addresses.
 */
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverAnchor } from "@/components/ui/popover";
import { Command, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Users, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSavedRecipients } from "@/hooks/useSavedRecipients";
import { useCRMContacts } from "@/hooks/useCRMContacts";
import { useProjectContactIds } from "@/hooks/useContactAssignments";
import { ContactPicker } from "@/components/crm/ContactPicker";
import {
  contactDisplayName,
  filterContactsForEmail,
} from "@/lib/crm/contactAssignments";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function RecipientsInput({
  value, onChange, placeholder, projectId,
}: {
  value: string[];
  onChange: (emails: string[]) => void;
  placeholder?: string;
  projectId?: string;
}) {
  const { data: saved = [] } = useSavedRecipients();
  const { data: contacts = [] } = useCRMContacts();
  const { data: projectContactIds = [] } = useProjectContactIds(projectId ?? null);
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);

  const crmMatches = useMemo(() => {
    const scoped = filterContactsForEmail(contacts, {
      scope: projectId ? "project" : "workspace",
      projectContactIds,
      search: text,
    });
    return scoped.filter((contact) => contact.email && !value.includes(contact.email)).slice(0, 6);
  }, [contacts, projectId, projectContactIds, text, value]);

  const suggestions = useMemo(() => {
    const q = text.trim().toLowerCase();
    return saved
      .filter((s) => !value.includes(s.email))
      .filter((s) => !q || s.email.includes(q) || (s.label ?? "").toLowerCase().includes(q))
      .filter((s) => !crmMatches.some((c) => c.email === s.email))
      .slice(0, 6);
  }, [saved, text, value, crmMatches]);

  const add = (raw: string) => {
    const email = raw.trim().replace(/[,;]$/, "").toLowerCase();
    if (!email) return;
    if (!EMAIL_RE.test(email)) return;
    if (!value.includes(email)) onChange([...value, email]);
    setText("");
  };

  const remove = (email: string) => onChange(value.filter((e) => e !== email));
  const hasSuggestions = crmMatches.length > 0 || suggestions.length > 0;

  return (
    <div className="space-y-1.5">
      <Popover open={open && hasSuggestions} onOpenChange={setOpen}>
        <PopoverAnchor asChild>
          <div className={cn(
            "flex flex-wrap items-center gap-1.5 rounded-md border border-input bg-background px-2 py-1.5 min-h-9 focus-within:ring-1 focus-within:ring-ring",
          )}>
            {value.map((email) => {
              const known = saved.find((s) => s.email === email);
              const contact = contacts.find((c) => c.email === email);
              return (
                <Badge key={email} variant="secondary" className="gap-1 pl-2 pr-1 h-6 text-xs font-normal">
                  {contact
                    ? `${contactDisplayName(contact)}`
                    : known?.label
                      ? `${known.label} <${email}>`
                      : email}
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
        <PopoverContent align="start" className="w-80 p-0" onOpenAutoFocus={(e) => e.preventDefault()}>
          <Command>
            <CommandList>
              {crmMatches.length > 0 && (
                <CommandGroup heading={projectId ? "Project contacts" : "All contacts"}>
                  {crmMatches.map((contact) => (
                    <CommandItem
                      key={contact.id}
                      onSelect={() => { add(contact.email!); setOpen(false); }}
                      className="text-xs"
                    >
                      <span className="truncate">{contactDisplayName(contact)} — {contact.email}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              {suggestions.length > 0 && (
                <CommandGroup heading="Saved addresses">
                  {suggestions.map((s) => (
                    <CommandItem key={s.id} onSelect={() => { add(s.email); setOpen(false); }} className="text-xs">
                      <span className="truncate">{s.label ? `${s.label} — ${s.email}` : s.email}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <ContactPicker
        selectedEmails={value}
        onSelect={onChange}
        projectId={projectId}
        defaultScope={projectId ? "project" : "workspace"}
        trigger={
          <Button type="button" variant="ghost" size="sm" className="h-7 gap-1 text-xs px-0">
            <Users className="h-3 w-3" />
            {projectId ? "Filter project contacts" : "Filter all contacts"}
          </Button>
        }
      />
    </div>
  );
}
