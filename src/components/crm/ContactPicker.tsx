import { useMemo, useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Users,
  Search,
  Star,
  Building2,
  User,
  Mail,
  Plus,
  FolderKanban,
} from "lucide-react";
import {
  useCRMContacts,
  CRMContact,
  CONTACT_TYPE_LABELS,
  CONTACT_TYPE_COLORS,
} from "@/hooks/useCRMContacts";
import { ContactDialog } from "./ContactDialog";
import { useProjects } from "@/hooks/useProjects";
import { useProjectContactIds } from "@/hooks/useContactAssignments";
import {
  contactDisplayName,
  filterContactsForEmail,
  type ContactEmailScope,
} from "@/lib/crm/contactAssignments";

interface ContactPickerProps {
  selectedEmails: string[];
  onSelect: (emails: string[]) => void;
  propertyId?: string;
  projectId?: string;
  defaultScope?: ContactEmailScope;
  trigger?: React.ReactNode;
  placeholder?: string;
}

export function ContactPicker({
  selectedEmails,
  onSelect,
  propertyId,
  projectId,
  defaultScope,
  trigger,
  placeholder = "Select contacts...",
}: ContactPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [scope, setScope] = useState<ContactEmailScope>(
    defaultScope ?? (projectId ? "project" : "workspace"),
  );
  const [scopedProjectId, setScopedProjectId] = useState<string>(projectId ?? "");

  const { data: contacts = [], isLoading } = useCRMContacts({ search });
  const { data: projects = [] } = useProjects();
  const { data: projectContactIds = [] } = useProjectContactIds(
    scope === "project" ? (projectId || scopedProjectId || null) : null,
  );

  const emailableContacts = useMemo(
    () =>
      filterContactsForEmail(contacts, {
        scope,
        projectContactIds,
        search,
      }),
    [contacts, scope, projectContactIds, search],
  );

  const handleToggleContact = (email: string) => {
    if (selectedEmails.includes(email)) {
      onSelect(selectedEmails.filter((e) => e !== email));
    } else {
      onSelect([...selectedEmails, email]);
    }
  };

  const addAllVisible = () => {
    const emails = emailableContacts
      .map((contact) => contact.email)
      .filter((email): email is string => Boolean(email));
    onSelect(Array.from(new Set([...selectedEmails, ...emails])));
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          {trigger || (
            <Button variant="outline" className="gap-2">
              <Users className="h-4 w-4" />
              {selectedEmails.length > 0
                ? `${selectedEmails.length} selected`
                : placeholder}
            </Button>
          )}
        </PopoverTrigger>
        <PopoverContent className="w-96 p-0" align="start">
          <div className="p-3 border-b space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search contacts..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Tabs
              value={scope}
              onValueChange={(value) => setScope(value as ContactEmailScope)}
            >
              <TabsList className="w-full">
                <TabsTrigger value="workspace" className="flex-1">
                  All contacts
                </TabsTrigger>
                <TabsTrigger value="project" className="flex-1">
                  <FolderKanban className="mr-1 h-3 w-3" />
                  Project
                </TabsTrigger>
              </TabsList>
            </Tabs>
            {scope === "project" && !projectId && (
              <Select value={scopedProjectId} onValueChange={setScopedProjectId}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Choose a project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <ScrollArea className="h-64">
            {isLoading ? (
              <div className="p-4 text-center text-muted-foreground">
                Loading contacts...
              </div>
            ) : scope === "project" && !projectId && !scopedProjectId ? (
              <div className="p-4 text-center text-muted-foreground text-sm">
                Choose a project to load its attached contacts.
              </div>
            ) : emailableContacts.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No contacts found</p>
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => {
                    setOpen(false);
                    setShowAddDialog(true);
                  }}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add a contact
                </Button>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {emailableContacts.map((contact) => (
                  <div
                    key={contact.id}
                    className="flex items-start gap-3 p-2 rounded-md hover:bg-muted cursor-pointer"
                    onClick={() => handleToggleContact(contact.email!)}
                  >
                    <Checkbox
                      checked={selectedEmails.includes(contact.email!)}
                      onCheckedChange={() => handleToggleContact(contact.email!)}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {contact.is_favorite && (
                          <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                        )}
                        <span className="font-medium text-sm truncate">
                          {contactDisplayName(contact)}
                        </span>
                        {contact.property_id ? (
                          <Building2 className="h-3 w-3 text-muted-foreground" />
                        ) : (
                          <User className="h-3 w-3 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Mail className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground truncate">
                          {contact.email}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge
                          variant="secondary"
                          className={`text-xs ${CONTACT_TYPE_COLORS[contact.contact_type]}`}
                        >
                          {CONTACT_TYPE_LABELS[contact.contact_type]}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          <div className="p-2 border-t space-y-1">
            {emailableContacts.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start"
                onClick={addAllVisible}
              >
                <Users className="h-4 w-4 mr-2" />
                Add all {emailableContacts.length} visible
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              onClick={() => {
                setOpen(false);
                setShowAddDialog(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add New Contact
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      <ContactDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        defaultPropertyId={propertyId}
      />
    </>
  );
}

export type { CRMContact };
