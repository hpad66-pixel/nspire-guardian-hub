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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateInvitation, useSendInvitation } from '@/hooks/useInvitations';
import { useProperties } from '@/hooks/useProperties';
import { useActiveClients } from '@/hooks/useClients';
import { useAssignableWorkspaceRoles } from '@/hooks/useUserManagement';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

const inviteSchema = z.object({
  full_name: z.string().trim().min(2, 'Please enter the team member’s name'),
  email: z.string().email('Please enter a valid email address'),
  role: z.enum(['owner', 'manager', 'inspector', 'administrator', 'superintendent', 'clerk', 'project_manager', 'subcontractor', 'viewer', 'user'] as const),
  property_id: z.string().uuid('Select the property this person may access'),
  client_id: z.string().optional(),
});

type InviteFormData = z.infer<typeof inviteSchema>;

interface InviteUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InviteUserDialog({ open, onOpenChange }: InviteUserDialogProps) {
  const [isSending, setIsSending] = useState(false);
  const { data: properties } = useProperties();
  const { data: clients } = useActiveClients();
  const { data: assignableRoles = [] } = useAssignableWorkspaceRoles();
  const createInvitation = useCreateInvitation();
  const sendInvitation = useSendInvitation();

  const form = useForm<InviteFormData>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      full_name: '',
      email: '',
      role: 'user',
      property_id: '',
      client_id: 'none',
    },
  });

  const onSubmit = async (data: InviteFormData) => {
    setIsSending(true);
    try {
      // Create the invitation
      const invitation = await createInvitation.mutateAsync({
        full_name: data.full_name,
        email: data.email,
        role: data.role,
        property_id: data.property_id,
        client_id: data.client_id === 'none' ? undefined : data.client_id || undefined,
      });

      // Send the email
      await sendInvitation.mutateAsync(invitation.id);

      toast.success(`Invitation sent to ${data.email}`);
      form.reset();
      onOpenChange(false);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to send invitation');
    } finally {
      setIsSending(false);
    }
  };

  const roleDescriptions: Record<string, string> = {
    owner: 'Full administrative access inside the assigned property only',
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
    admin: 'Workspace Administrator',
    owner: 'Property Owner',
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
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Invite Team Member
          </DialogTitle>
          <DialogDescription>
            Every invitation requires a property. The selected role and all permissions apply only inside that property.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Jordan Smith"
                      autoComplete="name"
                      disabled={isSending}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                        autoComplete="email"
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
                  <FormControl>
                    <RadioGroup
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={isSending}
                      className="grid gap-2 sm:grid-cols-2"
                    >
                      {assignableRoles.filter(role => role !== 'admin').map((role) => (
                        <label key={role} className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 hover:bg-muted/50">
                          <RadioGroupItem value={role} className="mt-0.5" />
                          <span>
                            <span className="block text-sm font-medium">{roleLabels[role]}</span>
                            <span className="block text-xs text-muted-foreground">{roleDescriptions[role]}</span>
                          </span>
                        </label>
                      ))}
                    </RadioGroup>
                  </FormControl>
                  <p className="text-xs text-muted-foreground mt-1">
                    {roleDescriptions[field.value as AppRole]}
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="property_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Property Access (Required)</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange} disabled={isSending || !properties?.length}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={properties?.length ? 'Select one property' : 'No properties available'} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {properties?.map((property) => (
                        <SelectItem key={property.id} value={property.id}>{property.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Additional properties can be added later from User Management.</p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="client_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assign to Organization (Optional)</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={isSending}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="No organization" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">No organization</SelectItem>
                      {clients?.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

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
