import { CRMContact, CONTACT_TYPE_LABELS, CONTACT_TYPE_COLORS } from "@/hooks/useCRMContacts";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Star,
  StarOff,
  MoreHorizontal,
  Edit,
  Trash2,
  Mail,
  Phone,
  Building2,
  User,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ContactCardProps {
  contact: CRMContact;
  onEdit: (contact: CRMContact) => void;
  onDelete: (id: string) => void;
  onToggleFavorite: (contact: CRMContact) => void;
  onSelect: (contact: CRMContact) => void;
}

export function ContactCard({
  contact,
  onEdit,
  onDelete,
  onToggleFavorite,
  onSelect,
}: ContactCardProps) {
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

  return (
    <Card
      className={cn(
        "group cursor-pointer transition-all hover:shadow-md hover:border-primary/20",
        contact.is_favorite && "ring-1 ring-yellow-400/50"
      )}
      onClick={() => onSelect(contact)}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <Avatar className={cn("h-12 w-12 shrink-0", getAvatarColor(contact))}>
            <AvatarFallback className="text-white font-semibold">
              {getInitials(contact)}
            </AvatarFallback>
          </Avatar>

          {/* Info */}
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm truncate">
                {getDisplayName(contact)}
              </h3>
              {contact.is_favorite && (
                <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500 shrink-0" />
              )}
            </div>

            {contact.job_title && (
              <p className="text-xs text-muted-foreground truncate">
                {contact.job_title}
              </p>
            )}

            {contact.company_name && (
              <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                {contact.company_name}
              </p>
            )}

            <div className="flex items-center gap-2 pt-1">
              <Badge
                variant="secondary"
                className={cn("text-[10px] px-1.5 py-0", CONTACT_TYPE_COLORS[contact.contact_type])}
              >
                {CONTACT_TYPE_LABELS[contact.contact_type]}
              </Badge>
              {contact.property_id ? (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  <Building2 className="h-2.5 w-2.5 mr-0.5" />
                  Property
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  <User className="h-2.5 w-2.5 mr-0.5" />
                  Personal
                </Badge>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(contact);
              }}
            >
              {contact.is_favorite ? (
                <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
              ) : (
                <StarOff className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {contact.email && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      window.location.href = `mailto:${contact.email}`;
                    }}
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    Send Email
                  </DropdownMenuItem>
                )}
                {contact.phone && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      window.location.href = `tel:${contact.phone}`;
                    }}
                  >
                    <Phone className="h-4 w-4 mr-2" />
                    Call
                  </DropdownMenuItem>
                )}
                {(contact.email || contact.phone) && <DropdownMenuSeparator />}
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(contact);
                  }}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(contact.id);
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Quick contact info */}
        <div className="mt-3 pt-3 border-t flex items-center gap-4 text-xs text-muted-foreground">
          {contact.email && (
            <a
              href={`mailto:${contact.email}`}
              className="flex items-center gap-1 hover:text-primary truncate max-w-[45%]"
              onClick={(e) => e.stopPropagation()}
            >
              <Mail className="h-3 w-3 shrink-0" />
              <span className="truncate">{contact.email}</span>
            </a>
          )}
          {contact.phone && (
            <a
              href={`tel:${contact.phone}`}
              className="flex items-center gap-1 hover:text-primary"
              onClick={(e) => e.stopPropagation()}
            >
              <Phone className="h-3 w-3 shrink-0" />
              <span>{contact.phone}</span>
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
