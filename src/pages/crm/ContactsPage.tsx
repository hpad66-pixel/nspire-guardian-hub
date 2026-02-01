import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Plus,
  Search,
  Star,
  Building2,
  User,
  Users,
  LayoutGrid,
  List,
  X,
  Filter,
} from "lucide-react";
import {
  useCRMContacts,
  useDeleteCRMContact,
  useToggleFavorite,
  CRMContact,
  ContactType,
  CONTACT_TYPE_LABELS,
  CONTACT_TYPE_COLORS,
} from "@/hooks/useCRMContacts";
import { ContactDialog } from "@/components/crm/ContactDialog";
import { ContactCard } from "@/components/crm/ContactCard";
import { ContactDetailSheet } from "@/components/crm/ContactDetailSheet";
import { AlphabetNav } from "@/components/crm/AlphabetNav";
import { ContactsEmptyState } from "@/components/crm/ContactsEmptyState";
import { useProperties } from "@/hooks/useProperties";
import { cn } from "@/lib/utils";

type ViewMode = "grid" | "list";
type OwnershipTab = "all" | "personal" | "property";

export default function ContactsPage() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<ContactType | "all">("all");
  const [propertyFilter, setPropertyFilter] = useState<string>("all");
  const [ownershipTab, setOwnershipTab] = useState<OwnershipTab>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [activeLetter, setActiveLetter] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<CRMContact | null>(null);
  const [selectedContact, setSelectedContact] = useState<CRMContact | null>(null);
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);

  const { data: contacts = [], isLoading } = useCRMContacts({
    search,
    contactType: typeFilter,
    propertyId: propertyFilter !== "all" ? propertyFilter : undefined,
    showPersonal: ownershipTab === "all" || ownershipTab === "personal",
    showProperty: ownershipTab === "all" || ownershipTab === "property",
  });

  const { data: properties } = useProperties();
  const deleteContact = useDeleteCRMContact();
  const toggleFavorite = useToggleFavorite();

  // Filter by letter
  const filteredContacts = useMemo(() => {
    if (!activeLetter) return contacts;
    return contacts.filter((c) =>
      c.first_name.toUpperCase().startsWith(activeLetter)
    );
  }, [contacts, activeLetter]);

  // Get available letters for alphabet nav
  const availableLetters = useMemo(() => {
    const letters = new Set<string>();
    contacts.forEach((c) => {
      if (c.first_name) {
        letters.add(c.first_name.charAt(0).toUpperCase());
      }
    });
    return Array.from(letters).sort();
  }, [contacts]);

  // Group contacts by first letter
  const groupedContacts = useMemo(() => {
    const groups: Record<string, CRMContact[]> = {};
    filteredContacts.forEach((contact) => {
      const letter = contact.first_name.charAt(0).toUpperCase();
      if (!groups[letter]) groups[letter] = [];
      groups[letter].push(contact);
    });
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredContacts]);

  const handleEdit = (contact: CRMContact) => {
    setEditingContact(contact);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this contact?")) {
      await deleteContact.mutateAsync(id);
    }
  };

  const handleToggleFavorite = async (contact: CRMContact) => {
    await toggleFavorite.mutateAsync({
      id: contact.id,
      is_favorite: !contact.is_favorite,
    });
  };

  const handleSelectContact = (contact: CRMContact) => {
    setSelectedContact(contact);
    setDetailSheetOpen(true);
  };

  const clearFilters = () => {
    setSearch("");
    setTypeFilter("all");
    setPropertyFilter("all");
    setOwnershipTab("all");
    setActiveLetter(null);
  };

  const hasActiveFilters =
    !!search ||
    typeFilter !== "all" ||
    propertyFilter !== "all" ||
    ownershipTab !== "all" ||
    activeLetter !== null;

  // Stats
  const totalContacts = contacts.length;
  const personalContacts = contacts.filter((c) => c.user_id).length;
  const propertyContacts = contacts.filter((c) => c.property_id).length;
  const favoriteContacts = contacts.filter((c) => c.is_favorite).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Contacts</h1>
          <p className="text-muted-foreground">
            Manage your network of vendors, regulators, and partners
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingContact(null);
            setDialogOpen(true);
          }}
          className="shrink-0"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Contact
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-background to-muted/30">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Contacts
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalContacts}</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-background to-muted/30">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Personal
            </CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{personalContacts}</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-background to-muted/30">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Property-Level
            </CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{propertyContacts}</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-background to-muted/30">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Favorites
            </CardTitle>
            <Star className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{favoriteContacts}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4">
            {/* Top row: Search + View Toggle */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, company, or email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
                {search && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                    onClick={() => setSearch("")}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <ToggleGroup
                  type="single"
                  value={viewMode}
                  onValueChange={(v) => v && setViewMode(v as ViewMode)}
                >
                  <ToggleGroupItem value="grid" aria-label="Grid view">
                    <LayoutGrid className="h-4 w-4" />
                  </ToggleGroupItem>
                  <ToggleGroupItem value="list" aria-label="List view">
                    <List className="h-4 w-4" />
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>
            </div>

            {/* Filter row */}
            <div className="flex flex-wrap items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />

              <Select
                value={typeFilter}
                onValueChange={(v) => setTypeFilter(v as ContactType | "all")}
              >
                <SelectTrigger className="w-[150px] h-9">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {Object.entries(CONTACT_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={propertyFilter} onValueChange={setPropertyFilter}>
                <SelectTrigger className="w-[180px] h-9">
                  <SelectValue placeholder="Property" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Properties</SelectItem>
                  {properties?.map((property) => (
                    <SelectItem key={property.id} value={property.id}>
                      {property.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 text-muted-foreground"
                  onClick={clearFilters}
                >
                  <X className="h-3.5 w-3.5 mr-1" />
                  Clear filters
                </Button>
              )}
            </div>

            {/* Alphabet Nav */}
            {contacts.length > 10 && (
              <div className="pt-2 border-t">
                <AlphabetNav
                  availableLetters={availableLetters}
                  activeLetter={activeLetter}
                  onLetterClick={setActiveLetter}
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Ownership Tabs */}
      <Tabs
        value={ownershipTab}
        onValueChange={(v) => setOwnershipTab(v as OwnershipTab)}
      >
        <TabsList>
          <TabsTrigger value="all">All Contacts</TabsTrigger>
          <TabsTrigger value="personal">
            <User className="h-4 w-4 mr-1" />
            Personal
          </TabsTrigger>
          <TabsTrigger value="property">
            <Building2 className="h-4 w-4 mr-1" />
            Property
          </TabsTrigger>
        </TabsList>

        <TabsContent value={ownershipTab} className="mt-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : filteredContacts.length === 0 ? (
            <ContactsEmptyState
              hasFilters={hasActiveFilters}
              onAddContact={() => {
                setEditingContact(null);
                setDialogOpen(true);
              }}
              onClearFilters={clearFilters}
            />
          ) : viewMode === "grid" ? (
            // Grid View
            <div className="space-y-8">
              {groupedContacts.map(([letter, letterContacts]) => (
                <div key={letter}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-bold text-primary">
                        {letter}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {letterContacts.length} contact
                      {letterContacts.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {letterContacts.map((contact) => (
                      <ContactCard
                        key={contact.id}
                        contact={contact}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        onToggleFavorite={handleToggleFavorite}
                        onSelect={handleSelectContact}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // List View
            <Card>
              <div className="divide-y">
                {filteredContacts.map((contact) => (
                  <div
                    key={contact.id}
                    className="flex items-center gap-4 p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => handleSelectContact(contact)}
                  >
                    {/* Avatar */}
                    <div
                      className={cn(
                        "h-10 w-10 rounded-full flex items-center justify-center text-white font-semibold shrink-0",
                        [
                          "bg-blue-500",
                          "bg-green-500",
                          "bg-purple-500",
                          "bg-orange-500",
                          "bg-pink-500",
                          "bg-cyan-500",
                          "bg-indigo-500",
                          "bg-teal-500",
                        ][contact.first_name.charCodeAt(0) % 8]
                      )}
                    >
                      {contact.first_name.charAt(0)}
                      {contact.last_name?.charAt(0) || ""}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">
                          {[contact.first_name, contact.last_name]
                            .filter(Boolean)
                            .join(" ")}
                        </span>
                        {contact.is_favorite && (
                          <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500 shrink-0" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {contact.company_name || contact.job_title || contact.email || "-"}
                      </p>
                    </div>

                    {/* Type Badge */}
                    <Badge
                      variant="secondary"
                      className={cn(
                        "shrink-0 hidden sm:flex",
                        CONTACT_TYPE_COLORS[contact.contact_type]
                      )}
                    >
                      {CONTACT_TYPE_LABELS[contact.contact_type]}
                    </Badge>

                    {/* Ownership */}
                    <Badge variant="outline" className="shrink-0 hidden md:flex">
                      {contact.property_id ? (
                        <>
                          <Building2 className="h-3 w-3 mr-1" />
                          Property
                        </>
                      ) : (
                        <>
                          <User className="h-3 w-3 mr-1" />
                          Personal
                        </>
                      )}
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Results summary */}
          {filteredContacts.length > 0 && (
            <div className="text-center text-sm text-muted-foreground pt-4">
              Showing {filteredContacts.length} of {totalContacts} contacts
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <ContactDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        contact={editingContact}
      />

      <ContactDetailSheet
        contact={selectedContact}
        open={detailSheetOpen}
        onOpenChange={setDetailSheetOpen}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onToggleFavorite={handleToggleFavorite}
      />
    </div>
  );
}
