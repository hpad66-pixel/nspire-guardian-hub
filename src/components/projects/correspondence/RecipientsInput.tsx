/**
 * RecipientsInput — multi-email chip field with autocomplete from the full
 * CRM (all contacts) plus previously-used addresses. When a projectId is set,
 * project-directory people are listed first, but the rest of the workspace
 * CRM stays searchable — Doc Studio / email send must never hide contacts.
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
  type ContactEmailScope,
} from "@/lib/crm/contactAssignments";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function RecipientsInput({
  value,
  onChange,
  placeholder,
  projectId,
  /** Default ContactPicker tab. Doc Studio / send flows use "workspace" so every CRM contact is visible. */
  defaultScope = "workspace",
}: {
  value: string[];
  onChange: (emails: string[]) => void;
  placeholder?: string;
  projectId?: string;
  defaultScope?: ContactEmailScope;
}) {
  const { data: saved = [] } = useSavedRecipients();
  const { data: contacts = [] } = useCRMContacts();
  const { data: projectContactIds = [] } = useProjectContactIds(projectId ?? null);
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);

  const projectIdSet = useMemo(() => new Set(projectContactIds), [projectContactIds]);

  const { projectMatches, allMatches } = useMemo(() => {
    const emailable = filterContactsForEmail(contacts, {
      scope: "workspace",
      search: text,
    }).filter((contact) => contact.email && !value.includes(contact.email));

    const onProject = emailable.filter((c) => projectIdSet.has(c.id));
    const rest = emailable.filter((c) => !projectIdSet.has(c.id));
    return {
      projectMatches: onProject.slice(0, 8),
      allMatches: rest.slice(0, 12),
    };
  }, [contacts, projectIdSet, text, value]);

  const suggestions = useMemo(() => {
    const q = text.trim().toLowerCase();
    const alreadyShown = new Set(
      [...projectMatches, ...allMatches].map((c) => c.email).filter(Boolean),
    );
    return saved
      .filter((s) => !value.includes(s.email))
      .filter((s) => !q || s.email.includes(q) || (s.label ?? "").toLowerCase().includes(q))
      .filter((s) => !alreadyShown.has(s.email))
      .slice(0, 6);
  }, [saved, text, value, projectMatches, allMatches]);

  const add = (raw: string) => {
    const email = raw.trim().replace(/[,;]$/, "").toLowerCase();
    if (!email) return;
    if (!EMAIL_RE.test(email)) return;
    if (!value.includes(email)) onChange([...value, email]);
    setText("");
  };

  const remove = (email: string) => onChange(value.filter((e) => e !== email));
  const hasSuggestions =
    projectMatches.length > 0 || allMatches.length > 0 || suggestions.length > 0;

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
              {projectMatches.length > 0 && (
                <CommandGroup heading="On this project">
                  {projectMatches.map((contact) => (
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
              {allMatches.length > 0 && (
                <CommandGroup heading={projectMatches.length > 0 ? "All contacts" : "Contacts"}>
                  {allMatches.map((contact) => (
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
        defaultScope={defaultScope}
        trigger={
          <Button type="button" variant="ghost" size="sm" className="h-7 gap-1 text-xs px-0">
            <Users className="h-3 w-3" />
            Browse all contacts
          </Button>
        }
      />
    </div>
  );
}
