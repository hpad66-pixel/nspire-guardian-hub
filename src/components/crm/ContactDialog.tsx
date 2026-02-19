import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { TagInput } from "@/components/ui/tag-input";
import { Loader2, User, Building2, MapPin, FileText, Star } from "lucide-react";
import {
  CRMContact,
  CRMContactFormData,
  ContactType,
  CONTACT_TYPE_LABELS,
  useCreateCRMContact,
  useUpdateCRMContact,
} from "@/hooks/useCRMContacts";
import { useProperties } from "@/hooks/useProperties";

interface ContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact?: CRMContact | null;
  defaultPropertyId?: string;
}

export function ContactDialog({
  open,
  onOpenChange,
  contact,
  defaultPropertyId,
}: ContactDialogProps) {
  const isEdit = !!contact;
  const createContact = useCreateCRMContact();
  const updateContact = useUpdateCRMContact();
  const { data: properties } = useProperties();

  const [formData, setFormData] = useState<CRMContactFormData>({
    first_name: "",
    last_name: "",
    company_name: "",
    job_title: "",
    contact_type: "vendor",
    email: "",
    phone: "",
    mobile: "",
    fax: "",
    address_line1: "",
    address_line2: "",
    city: "",
    state: "",
    zip_code: "",
    country: "USA",
    website: "",
    license_number: "",
    insurance_expiry: "",
    tags: [],
    notes: "",
    is_favorite: false,
    property_id: defaultPropertyId,
  });

  const [isPersonal, setIsPersonal] = useState(!defaultPropertyId);

  useEffect(() => {
    if (contact) {
      setFormData({
        first_name: contact.first_name,
        last_name: contact.last_name || "",
        company_name: contact.company_name || "",
        job_title: contact.job_title || "",
        contact_type: contact.contact_type,
        email: contact.email || "",
        phone: contact.phone || "",
        mobile: contact.mobile || "",
        fax: contact.fax || "",
        address_line1: contact.address_line1 || "",
        address_line2: contact.address_line2 || "",
        city: contact.city || "",
        state: contact.state || "",
        zip_code: contact.zip_code || "",
        country: contact.country || "USA",
        website: contact.website || "",
        license_number: contact.license_number || "",
        insurance_expiry: contact.insurance_expiry || "",
        tags: contact.tags || [],
        notes: contact.notes || "",
        is_favorite: contact.is_favorite,
        property_id: contact.property_id || undefined,
      });
      setIsPersonal(!contact.property_id);
    } else {
      setFormData({
        first_name: "",
        last_name: "",
        company_name: "",
        job_title: "",
        contact_type: "vendor",
        email: "",
        phone: "",
        mobile: "",
        fax: "",
        address_line1: "",
        address_line2: "",
        city: "",
        state: "",
        zip_code: "",
        country: "USA",
        website: "",
        license_number: "",
        insurance_expiry: "",
        tags: [],
        notes: "",
        is_favorite: false,
        property_id: defaultPropertyId,
      });
      setIsPersonal(!defaultPropertyId);
    }
  }, [contact, defaultPropertyId, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Convert empty strings to null for nullable DB fields (dates, optional text)
    const nullify = (v: string | undefined) => (v === "" ? null : v) as string | undefined;

    const submitData = {
      ...formData,
      property_id: isPersonal ? undefined : formData.property_id,
      last_name: nullify(formData.last_name),
      company_name: nullify(formData.company_name),
      job_title: nullify(formData.job_title),
      email: nullify(formData.email),
      phone: nullify(formData.phone),
      mobile: nullify(formData.mobile),
      fax: nullify(formData.fax),
      address_line1: nullify(formData.address_line1),
      address_line2: nullify(formData.address_line2),
      city: nullify(formData.city),
      state: nullify(formData.state),
      zip_code: nullify(formData.zip_code),
      website: nullify(formData.website),
      license_number: nullify(formData.license_number),
      insurance_expiry: nullify(formData.insurance_expiry) ?? undefined,
      notes: nullify(formData.notes),
    };

    try {
      if (isEdit && contact) {
        await updateContact.mutateAsync({ id: contact.id, ...submitData });
      } else {
        await createContact.mutateAsync(submitData);
      }
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to save contact:", error);
    }
  };

  const isLoading = createContact.isPending || updateContact.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {isEdit ? "Edit Contact" : "Add Contact"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update contact information"
              : "Add a new contact to your CRM"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="basic">Basic</TabsTrigger>
              <TabsTrigger value="contact">Contact</TabsTrigger>
              <TabsTrigger value="address">Address</TabsTrigger>
              <TabsTrigger value="details">Details</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4 mt-4">
              {/* Contact Type & Ownership */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Contact Type *</Label>
                  <Select
                    value={formData.contact_type}
                    onValueChange={(v) =>
                      setFormData({ ...formData, contact_type: v as ContactType })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(CONTACT_TYPE_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Ownership</Label>
                  <div className="flex items-center gap-4 h-10">
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={isPersonal}
                        onCheckedChange={(checked) => {
                          setIsPersonal(checked);
                          if (checked) {
                            setFormData({ ...formData, property_id: undefined });
                          }
                        }}
                      />
                      <Label className="text-sm">Personal Contact</Label>
                    </div>
                  </div>
                </div>
              </div>

              {!isPersonal && (
                <div className="space-y-2">
                  <Label>Property</Label>
                  <Select
                    value={formData.property_id || ""}
                    onValueChange={(v) =>
                      setFormData({ ...formData, property_id: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select property" />
                    </SelectTrigger>
                    <SelectContent>
                      {properties?.map((property) => (
                        <SelectItem key={property.id} value={property.id}>
                          {property.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Name */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name">First Name *</Label>
                  <Input
                    id="first_name"
                    value={formData.first_name}
                    onChange={(e) =>
                      setFormData({ ...formData, first_name: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">Last Name</Label>
                  <Input
                    id="last_name"
                    value={formData.last_name}
                    onChange={(e) =>
                      setFormData({ ...formData, last_name: e.target.value })
                    }
                  />
                </div>
              </div>

              {/* Company */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="company_name">Company</Label>
                  <Input
                    id="company_name"
                    value={formData.company_name}
                    onChange={(e) =>
                      setFormData({ ...formData, company_name: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="job_title">Job Title</Label>
                  <Input
                    id="job_title"
                    value={formData.job_title}
                    onChange={(e) =>
                      setFormData({ ...formData, job_title: e.target.value })
                    }
                  />
                </div>
              </div>

              {/* Favorite */}
              <div className="flex items-center space-x-2">
                <Switch
                  checked={formData.is_favorite}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, is_favorite: checked })
                  }
                />
                <Label className="flex items-center gap-1">
                  <Star className="h-4 w-4" />
                  Mark as Favorite
                </Label>
              </div>
            </TabsContent>

            <TabsContent value="contact" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mobile">Mobile</Label>
                  <Input
                    id="mobile"
                    type="tel"
                    value={formData.mobile}
                    onChange={(e) =>
                      setFormData({ ...formData, mobile: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fax">Fax</Label>
                  <Input
                    id="fax"
                    type="tel"
                    value={formData.fax}
                    onChange={(e) =>
                      setFormData({ ...formData, fax: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    type="url"
                    value={formData.website}
                    onChange={(e) =>
                      setFormData({ ...formData, website: e.target.value })
                    }
                    placeholder="https://"
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="address" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="address_line1">Address Line 1</Label>
                <Input
                  id="address_line1"
                  value={formData.address_line1}
                  onChange={(e) =>
                    setFormData({ ...formData, address_line1: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address_line2">Address Line 2</Label>
                <Input
                  id="address_line2"
                  value={formData.address_line2}
                  onChange={(e) =>
                    setFormData({ ...formData, address_line2: e.target.value })
                  }
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) =>
                      setFormData({ ...formData, city: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) =>
                      setFormData({ ...formData, state: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zip_code">ZIP Code</Label>
                  <Input
                    id="zip_code"
                    value={formData.zip_code}
                    onChange={(e) =>
                      setFormData({ ...formData, zip_code: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  value={formData.country}
                  onChange={(e) =>
                    setFormData({ ...formData, country: e.target.value })
                  }
                />
              </div>
            </TabsContent>

            <TabsContent value="details" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="license_number">License Number</Label>
                  <Input
                    id="license_number"
                    value={formData.license_number}
                    onChange={(e) =>
                      setFormData({ ...formData, license_number: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="insurance_expiry">Insurance Expiry</Label>
                  <Input
                    id="insurance_expiry"
                    type="date"
                    value={formData.insurance_expiry}
                    onChange={(e) =>
                      setFormData({ ...formData, insurance_expiry: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Tags</Label>
                <TagInput
                  value={formData.tags || []}
                  onChange={(tags) => setFormData({ ...formData, tags })}
                  placeholder="Add tags..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  rows={4}
                />
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !formData.first_name}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : isEdit ? (
                "Update Contact"
              ) : (
                "Add Contact"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
