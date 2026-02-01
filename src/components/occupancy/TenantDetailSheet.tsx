import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { type Tenant, useDeleteTenant } from '@/hooks/useTenants';
import { 
  User,
  Mail,
  Phone,
  Home,
  Building,
  Calendar,
  DollarSign,
  Pencil,
  Trash2,
  FileText,
} from 'lucide-react';
import { format, parseISO, differenceInDays } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useState } from 'react';

interface TenantDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenant: Tenant | null;
  onEdit: (tenant: Tenant) => void;
}

export function TenantDetailSheet({ open, onOpenChange, tenant, onEdit }: TenantDetailSheetProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const deleteTenant = useDeleteTenant();

  if (!tenant) return null;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/30">Active</Badge>;
      case 'notice_given':
        return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30">Notice Given</Badge>;
      case 'moved_out':
        return <Badge variant="secondary">Moved Out</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleDelete = async () => {
    await deleteTenant.mutateAsync(tenant.id);
    setDeleteDialogOpen(false);
    onOpenChange(false);
  };

  const leaseDuration = tenant.lease_end 
    ? differenceInDays(parseISO(tenant.lease_end), parseISO(tenant.lease_start))
    : null;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-lg font-medium text-primary">
                    {tenant.first_name.charAt(0)}{tenant.last_name.charAt(0)}
                  </span>
                </div>
                <div>
                  <SheetTitle>{tenant.first_name} {tenant.last_name}</SheetTitle>
                  <SheetDescription className="flex items-center gap-2">
                    {getStatusBadge(tenant.status)}
                  </SheetDescription>
                </div>
              </div>
            </div>
          </SheetHeader>

          <div className="space-y-6 mt-6">
            {/* Contact Information */}
            <div>
              <h3 className="text-sm font-medium mb-3">Contact Information</h3>
              <div className="space-y-3">
                {tenant.email && (
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <a href={`mailto:${tenant.email}`} className="text-sm hover:underline">
                      {tenant.email}
                    </a>
                  </div>
                )}
                {tenant.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <a href={`tel:${tenant.phone}`} className="text-sm hover:underline">
                      {tenant.phone}
                    </a>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Property & Unit */}
            <div>
              <h3 className="text-sm font-medium mb-3">Location</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Building className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{tenant.unit?.property?.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Home className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Unit {tenant.unit?.unit_number}</span>
                </div>
              </div>
            </div>

            <Separator />

            {/* Lease Information */}
            <div>
              <h3 className="text-sm font-medium mb-3">Lease Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Lease Start</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">
                      {format(parseISO(tenant.lease_start), 'MMM d, yyyy')}
                    </span>
                  </div>
                </div>
                {tenant.lease_end && (
                  <div>
                    <p className="text-xs text-muted-foreground">Lease End</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        {format(parseISO(tenant.lease_end), 'MMM d, yyyy')}
                      </span>
                    </div>
                  </div>
                )}
                {tenant.move_in_date && (
                  <div>
                    <p className="text-xs text-muted-foreground">Move-in Date</p>
                    <span className="text-sm font-medium">
                      {format(parseISO(tenant.move_in_date), 'MMM d, yyyy')}
                    </span>
                  </div>
                )}
                {leaseDuration && (
                  <div>
                    <p className="text-xs text-muted-foreground">Lease Duration</p>
                    <span className="text-sm font-medium">
                      {Math.round(leaseDuration / 30)} months
                    </span>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Financial Information */}
            <div>
              <h3 className="text-sm font-medium mb-3">Financial</h3>
              <div className="grid grid-cols-2 gap-4">
                {tenant.rent_amount && (
                  <div>
                    <p className="text-xs text-muted-foreground">Monthly Rent</p>
                    <div className="flex items-center gap-2 mt-1">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        ${tenant.rent_amount.toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}
                {tenant.deposit_amount && (
                  <div>
                    <p className="text-xs text-muted-foreground">Security Deposit</p>
                    <div className="flex items-center gap-2 mt-1">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        ${tenant.deposit_amount.toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Notes */}
            {tenant.notes && (
              <>
                <Separator />
                <div>
                  <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Notes
                  </h3>
                  <p className="text-sm whitespace-pre-wrap bg-muted/50 rounded-lg p-3">
                    {tenant.notes}
                  </p>
                </div>
              </>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-4">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => {
                  onOpenChange(false);
                  onEdit(tenant);
                }}
              >
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <Button 
                variant="destructive" 
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Tenant</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {tenant.first_name} {tenant.last_name}? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
