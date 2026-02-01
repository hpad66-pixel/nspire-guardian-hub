import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  CRMContact,
  CONTACT_TYPE_LABELS,
  CONTACT_TYPE_COLORS,
} from "@/hooks/useCRMContacts";
import {
  Star,
  StarOff,
  Edit,
  Trash2,
  Mail,
  Phone,
  Smartphone,
  Printer,
  Globe,
  Building2,
  User,
  MapPin,
  FileText,
  Shield,
  Calendar,
  Tag,
  ExternalLink,
  Copy,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format } from "date-fns";

interface ContactDetailSheetProps {
  contact: CRMContact | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (contact: CRMContact) => void;
  onDelete: (id: string) => void;
  onToggleFavorite: (contact: CRMContact) => void;
}

export function ContactDetailSheet({
  contact,
  open,
  onOpenChange,
  onEdit,
  onDelete,
  onToggleFavorite,
}: ContactDetailSheetProps) {
  if (!contact) return null;

  const getInitials = (contact: CRMContact) => {
    const first = contact.first_name?.charAt(0) || "";
    const last = contact.last_name?.charAt(0) || "";
    return (first + last).toUpperCase() || "?";
  };

  const getDisplayName = (contact: CRMContact) => {
    return [contact.first_name, contact.last_name].filter(Boolean).join(" ");
  };

  const getAvatarColor = (contact: CRMContact) => {
    const colors = [
      "bg-blue-500",
      "bg-green-500",
      "bg-purple-500",
      "bg-orange-500",
      "bg-pink-500",
      "bg-cyan-500",
      "bg-indigo-500",
      "bg-teal-500",
    ];
    const index = contact.first_name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const formatAddress = () => {
    const parts = [
      contact.address_line1,
      contact.address_line2,
      [contact.city, contact.state, contact.zip_code].filter(Boolean).join(", "),
      contact.country !== "USA" ? contact.country : null,
    ].filter(Boolean);
    return parts.join("\n");
  };

  const InfoItem = ({
    icon: Icon,
    label,
    value,
    href,
    copyable = false,
  }: {
    icon: React.ElementType;
    label: string;
    value: string | null | undefined;
    href?: string;
    copyable?: boolean;
  }) => {
    if (!value) return null;

    return (
      <div className="flex items-start gap-3 py-2">
        <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <div className="flex items-center gap-2">
            {href ? (
              <a
                href={href}
                className="text-sm text-primary hover:underline truncate"
                target={href.startsWith("http") ? "_blank" : undefined}
                rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
              >
                {value}
                {href.startsWith("http") && (
                  <ExternalLink className="h-3 w-3 inline ml-1" />
                )}
              </a>
            ) : (
              <p className="text-sm truncate">{value}</p>
            )}
            {copyable && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0"
                onClick={() => copyToClipboard(value, label)}
              >
                <Copy className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md p-0 flex flex-col">
        {/* Header */}
        <SheetHeader className="p-6 pb-4 border-b bg-muted/30">
          <div className="flex items-start gap-4">
            <Avatar className={cn("h-16 w-16", getAvatarColor(contact))}>
              <AvatarFallback className="text-white text-xl font-semibold">
                {getInitials(contact)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center gap-2">
                <SheetTitle className="text-xl truncate">
                  {getDisplayName(contact)}
                </SheetTitle>
                {contact.is_favorite && (
                  <Star className="h-4 w-4 text-yellow-500 fill-yellow-500 shrink-0" />
                )}
              </div>
              {contact.job_title && (
                <p className="text-sm text-muted-foreground truncate">
                  {contact.job_title}
                </p>
              )}
              {contact.company_name && (
                <p className="text-sm text-muted-foreground truncate flex items-center gap-1">
                  <Building2 className="h-3.5 w-3.5" />
                  {contact.company_name}
                </p>
              )}
              <div className="flex items-center gap-2 pt-1">
                <Badge
                  variant="secondary"
                  className={cn("text-xs", CONTACT_TYPE_COLORS[contact.contact_type])}
                >
                  {CONTACT_TYPE_LABELS[contact.contact_type]}
                </Badge>
                {contact.property_id ? (
                  <Badge variant="outline" className="text-xs">
                    <Building2 className="h-3 w-3 mr-1" />
                    Property
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs">
                    <User className="h-3 w-3 mr-1" />
                    Personal
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 pt-4">
            {contact.email && (
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => (window.location.href = `mailto:${contact.email}`)}
              >
                <Mail className="h-4 w-4 mr-2" />
                Email
              </Button>
            )}
            {contact.phone && (
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => (window.location.href = `tel:${contact.phone}`)}
              >
                <Phone className="h-4 w-4 mr-2" />
                Call
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onToggleFavorite(contact)}
            >
              {contact.is_favorite ? (
                <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
              ) : (
                <StarOff className="h-4 w-4" />
              )}
            </Button>
          </div>
        </SheetHeader>

        {/* Content */}
        <ScrollArea className="flex-1">
          <div className="p-6 space-y-6">
            {/* Contact Information */}
            <section>
              <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Contact Information
              </h3>
              <div className="bg-muted/30 rounded-lg px-3 divide-y">
                <InfoItem
                  icon={Mail}
                  label="Email"
                  value={contact.email}
                  href={contact.email ? `mailto:${contact.email}` : undefined}
                  copyable
                />
                <InfoItem
                  icon={Phone}
                  label="Phone"
                  value={contact.phone}
                  href={contact.phone ? `tel:${contact.phone}` : undefined}
                  copyable
                />
                <InfoItem
                  icon={Smartphone}
                  label="Mobile"
                  value={contact.mobile}
                  href={contact.mobile ? `tel:${contact.mobile}` : undefined}
                  copyable
                />
                <InfoItem
                  icon={Printer}
                  label="Fax"
                  value={contact.fax}
                  copyable
                />
                <InfoItem
                  icon={Globe}
                  label="Website"
                  value={contact.website}
                  href={contact.website || undefined}
                />
              </div>
            </section>

            {/* Address */}
            {formatAddress() && (
              <section>
                <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Address
                </h3>
                <div className="bg-muted/30 rounded-lg p-3">
                  <p className="text-sm whitespace-pre-line">{formatAddress()}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 h-7 text-xs"
                    onClick={() => copyToClipboard(formatAddress().replace(/\n/g, ", "), "Address")}
                  >
                    <Copy className="h-3 w-3 mr-1" />
                    Copy Address
                  </Button>
                </div>
              </section>
            )}

            {/* Professional Details */}
            {(contact.license_number || contact.insurance_expiry) && (
              <section>
                <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Professional Details
                </h3>
                <div className="bg-muted/30 rounded-lg px-3 divide-y">
                  <InfoItem
                    icon={FileText}
                    label="License Number"
                    value={contact.license_number}
                    copyable
                  />
                  {contact.insurance_expiry && (
                    <InfoItem
                      icon={Calendar}
                      label="Insurance Expiry"
                      value={format(new Date(contact.insurance_expiry), "MMM d, yyyy")}
                    />
                  )}
                </div>
              </section>
            )}

            {/* Tags */}
            {contact.tags && contact.tags.length > 0 && (
              <section>
                <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  Tags
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {contact.tags.map((tag, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </section>
            )}

            {/* Notes */}
            {contact.notes && (
              <section>
                <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Notes
                </h3>
                <div className="bg-muted/30 rounded-lg p-3">
                  <p className="text-sm whitespace-pre-wrap">{contact.notes}</p>
                </div>
              </section>
            )}

            {/* Metadata */}
            <section className="pt-4 border-t">
              <p className="text-xs text-muted-foreground">
                Added {format(new Date(contact.created_at), "MMM d, yyyy 'at' h:mm a")}
              </p>
              {contact.updated_at !== contact.created_at && (
                <p className="text-xs text-muted-foreground">
                  Updated {format(new Date(contact.updated_at), "MMM d, yyyy 'at' h:mm a")}
                </p>
              )}
            </section>
          </div>
        </ScrollArea>

        {/* Footer Actions */}
        <div className="p-4 border-t flex items-center gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => {
              onOpenChange(false);
              onEdit(contact);
            }}
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button
            variant="outline"
            className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
            onClick={() => {
              if (confirm("Are you sure you want to delete this contact?")) {
                onDelete(contact.id);
                onOpenChange(false);
              }
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
