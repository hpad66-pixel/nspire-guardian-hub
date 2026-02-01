import { Button } from "@/components/ui/button";
import { Users, UserPlus, Search } from "lucide-react";

interface ContactsEmptyStateProps {
  hasFilters: boolean;
  onAddContact: () => void;
  onClearFilters: () => void;
}

export function ContactsEmptyState({
  hasFilters,
  onAddContact,
  onClearFilters,
}: ContactsEmptyStateProps) {
  if (hasFilters) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <Search className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-1">No contacts found</h3>
        <p className="text-sm text-muted-foreground mb-4 max-w-sm">
          Try adjusting your search or filters to find what you're looking for.
        </p>
        <Button variant="outline" onClick={onClearFilters}>
          Clear all filters
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="h-20 w-20 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-4">
        <Users className="h-10 w-10 text-primary" />
      </div>
      <h3 className="text-lg font-semibold mb-1">Start building your network</h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-sm">
        Add contacts to keep track of vendors, regulators, contractors, and more.
        Your contacts will be available when sending emails and managing properties.
      </p>
      <Button onClick={onAddContact}>
        <UserPlus className="h-4 w-4 mr-2" />
        Add Your First Contact
      </Button>
    </div>
  );
}
