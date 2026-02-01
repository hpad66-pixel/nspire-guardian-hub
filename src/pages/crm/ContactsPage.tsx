import { useState } from "react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Star,
  StarOff,
  Mail,
  Phone,
  Building2,
  User,
  Users,
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
import { useProperties } from "@/hooks/useProperties";

export default function ContactsPage() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<ContactType | "all">("all");
  const [propertyFilter, setPropertyFilter] = useState<string>("all");
  const [ownershipTab, setOwnershipTab] = useState<"all" | "personal" | "property">("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<CRMContact | null>(null);

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

  const getContactDisplayName = (contact: CRMContact) => {
    return [contact.first_name, contact.last_name].filter(Boolean).join(" ");
  };

  // Stats
  const totalContacts = contacts.length;
  const personalContacts = contacts.filter((c) => c.user_id).length;
  const propertyContacts = contacts.filter((c) => c.property_id).length;
  const favoriteContacts = contacts.filter((c) => c.is_favorite).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Contacts</h1>
          <p className="text-muted-foreground">
            Manage your personal and property-level contacts
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingContact(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Contact
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
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
        <Card>
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
        <Card>
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
        <Card>
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

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search contacts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as ContactType | "all")}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Contact Type" />
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
          <SelectTrigger className="w-[200px]">
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
      </div>

      {/* Tabs */}
      <Tabs value={ownershipTab} onValueChange={(v) => setOwnershipTab(v as typeof ownershipTab)}>
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
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead></TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Ownership</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      Loading contacts...
                    </TableCell>
                  </TableRow>
                ) : contacts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                      <p className="text-muted-foreground">No contacts found</p>
                      <Button
                        variant="link"
                        onClick={() => {
                          setEditingContact(null);
                          setDialogOpen(true);
                        }}
                      >
                        Add your first contact
                      </Button>
                    </TableCell>
                  </TableRow>
                ) : (
                  contacts.map((contact) => (
                    <TableRow key={contact.id}>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleToggleFavorite(contact)}
                        >
                          {contact.is_favorite ? (
                            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                          ) : (
                            <StarOff className="h-4 w-4 text-muted-foreground" />
                          )}
                        </Button>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {getContactDisplayName(contact)}
                        </div>
                        {contact.job_title && (
                          <div className="text-sm text-muted-foreground">
                            {contact.job_title}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{contact.company_name || "-"}</TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={CONTACT_TYPE_COLORS[contact.contact_type]}
                        >
                          {CONTACT_TYPE_LABELS[contact.contact_type]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {contact.email && (
                            <div className="flex items-center gap-1 text-sm">
                              <Mail className="h-3 w-3 text-muted-foreground" />
                              <a
                                href={`mailto:${contact.email}`}
                                className="text-primary hover:underline"
                              >
                                {contact.email}
                              </a>
                            </div>
                          )}
                          {contact.phone && (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Phone className="h-3 w-3" />
                              {contact.phone}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {contact.property_id ? (
                          <Badge variant="outline">
                            <Building2 className="h-3 w-3 mr-1" />
                            Property
                          </Badge>
                        ) : (
                          <Badge variant="outline">
                            <User className="h-3 w-3 mr-1" />
                            Personal
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(contact)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDelete(contact.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      <ContactDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        contact={editingContact}
      />
    </div>
  );
}
