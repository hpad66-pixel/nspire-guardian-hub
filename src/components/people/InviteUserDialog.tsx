import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, Send, Loader2, UserPlus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateInvitation, useSendInvitation } from '@/hooks/useInvitations';
import { useProperties } from '@/hooks/useProperties';
import { getAssignableRoles } from '@/hooks/usePermissions';
import { useCurrentUserRole } from '@/hooks/useUserManagement';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

const inviteSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  role: z.enum(['admin', 'owner', 'manager', 'inspector', 'administrator', 'superintendent', 'clerk', 'project_manager', 'subcontractor', 'viewer', 'user'] as const),
  property_id: z.string().optional(),
});

type InviteFormData = z.infer<typeof inviteSchema>;

interface InviteUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InviteUserDialog({ open, onOpenChange }: InviteUserDialogProps) {
  const [isSending, setIsSending] = useState(false);
  const { data: properties } = useProperties();
  const { data: currentUserRole } = useCurrentUserRole();
  const createInvitation = useCreateInvitation();
  const sendInvitation = useSendInvitation();
  const assignableRoles = currentUserRole ? getAssignableRoles(currentUserRole) : [];

  const form = useForm<InviteFormData>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      email: '',
      role: 'user',
      property_id: 'all',
    },
  });

  const onSubmit = async (data: InviteFormData) => {
    setIsSending(true);
    try {
      // Create the invitation
      const invitation = await createInvitation.mutateAsync({
        email: data.email,
        role: data.role,
        property_id: data.property_id === 'all' ? undefined : data.property_id || undefined,
      });

      // Send the email
      await sendInvitation.mutateAsync(invitation.id);

      toast.success(`Invitation sent to ${data.email}`);
      form.reset();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to send invitation');
    } finally {
      setIsSending(false);
    }
  };

  const roleDescriptions: Record<string, string> = {
    admin: 'Full system access, can manage users and settings',
    owner: 'Owner-level oversight with elevated authority',
    manager: 'Property management, team oversight, approvals',
    inspector: 'Conduct inspections, create issues',
    administrator: 'Administrative staff access',
    superintendent: 'Field operations and onsite coordination',
    clerk: 'Clerical and support access',
    user: 'Basic access, view and limited actions',
    project_manager: 'Project management access',
    subcontractor: 'Subcontractor access',
    viewer: 'View-only access',
  };
  const roleLabels: Record<AppRole, string> = {
    admin: 'Admin',
    owner: 'Owner',
    manager: 'Property Manager',
    inspector: 'Inspector',
    administrator: 'Administrator',
    superintendent: 'Superintendent',
    clerk: 'Clerk',
    project_manager: 'Project Manager',
    subcontractor: 'Subcontractor',
    viewer: 'Viewer',
    user: 'User',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Invite Team Member
          </DialogTitle>
          <DialogDescription>
            Send an invitation email to add a new user to the platform.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        {...field}
                        type="email"
                        placeholder="colleague@company.com"
                        className="pl-10"
                        disabled={isSending}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={isSending}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {assignableRoles.map((role) => (
                        <SelectItem key={role} value={role}>
                          {roleLabels[role]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    {roleDescriptions[field.value as AppRole]}
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            {properties && properties.length > 0 && (
              <FormField
                control={form.control}
                name="property_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assign to Property (Optional)</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={isSending}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="All properties" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="all">All properties</SelectItem>
                        {properties.map((property) => (
                          <SelectItem key={property.id} value={property.id}>
                            {property.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSending}>
                {isSending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Send Invitation
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
