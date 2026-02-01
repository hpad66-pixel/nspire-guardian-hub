import { useState, useMemo } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users,
  Search,
  Star,
  Building2,
  User,
  Mail,
  Phone,
  Plus,
} from "lucide-react";
import {
  useCRMContacts,
  CRMContact,
  CONTACT_TYPE_LABELS,
  CONTACT_TYPE_COLORS,
} from "@/hooks/useCRMContacts";
import { ContactDialog } from "./ContactDialog";

interface ContactPickerProps {
  selectedEmails: string[];
  onSelect: (emails: string[]) => void;
  propertyId?: string;
  trigger?: React.ReactNode;
  placeholder?: string;
}

export function ContactPicker({
  selectedEmails,
  onSelect,
  propertyId,
  trigger,
  placeholder = "Select contacts...",
}: ContactPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "personal" | "property">("all");

  const { data: contacts = [], isLoading } = useCRMContacts({
    search,
    showPersonal: activeTab === "all" || activeTab === "personal",
    showProperty: activeTab === "all" || activeTab === "property",
  });

  // Filter contacts with email only
  const emailableContacts = useMemo(() => {
    return contacts.filter((c) => c.email);
  }, [contacts]);

  const handleToggleContact = (email: string) => {
    if (selectedEmails.includes(email)) {
      onSelect(selectedEmails.filter((e) => e !== email));
    } else {
      onSelect([...selectedEmails, email]);
    }
  };

  const getContactDisplayName = (contact: CRMContact) => {
    const name = [contact.first_name, contact.last_name].filter(Boolean).join(" ");
    if (contact.company_name) {
      return `${name} (${contact.company_name})`;
    }
    return name;
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
          <div className="p-3 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search contacts..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
            <TabsList className="w-full rounded-none border-b">
              <TabsTrigger value="all" className="flex-1">All</TabsTrigger>
              <TabsTrigger value="personal" className="flex-1">
                <User className="h-3 w-3 mr-1" />
                Personal
              </TabsTrigger>
              <TabsTrigger value="property" className="flex-1">
                <Building2 className="h-3 w-3 mr-1" />
                Property
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="m-0">
              <ScrollArea className="h-64">
                {isLoading ? (
                  <div className="p-4 text-center text-muted-foreground">
                    Loading contacts...
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
                              {getContactDisplayName(contact)}
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
            </TabsContent>
          </Tabs>

          <div className="p-2 border-t">
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
