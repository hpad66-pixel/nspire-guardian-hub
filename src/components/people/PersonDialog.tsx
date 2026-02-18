import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { UserPlus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
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
import { useProperties } from '@/hooks/useProperties';
import { useRoleDefinitions } from '@/hooks/useRoleDefinitions';
import { useProfiles } from '@/hooks/useProfiles';
import { useAddPropertyAssignment } from '@/hooks/usePeople';
import { useUserPermissions, getAssignableRoles } from '@/hooks/usePermissions';
import { useActiveClients, useAssignClientToProfile } from '@/hooks/useClients';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

const formSchema = z.object({
  user_id: z.string().min(1, 'Please select a user'),
  property_id: z.string().min(1, 'Please select a property'),
  role: z.string().min(1, 'Please select a role'),
  title: z.string().optional(),
  department: z.string().optional(),
  client_id: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface PersonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PersonDialog({ open, onOpenChange }: PersonDialogProps) {
  const { data: properties } = useProperties();
  const { data: roles } = useRoleDefinitions();
  const { data: profiles } = useProfiles();
  const { data: clients } = useActiveClients();
  const { currentRole } = useUserPermissions();
  const assignableRoles = currentRole ? getAssignableRoles(currentRole) : [];
  const addAssignment = useAddPropertyAssignment();
  const assignClient = useAssignClientToProfile();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      user_id: '',
      property_id: '',
      role: 'user',
      title: '',
      department: '',
      client_id: 'none',
    },
  });

  const onSubmit = async (data: FormValues) => {
    await addAssignment.mutateAsync({
      property_id: data.property_id,
      user_id: data.user_id,
      role: data.role as AppRole,
      title: data.title || undefined,
      department: data.department || undefined,
    });
    // Assign to org if selected
    if (data.client_id && data.client_id !== 'none') {
      await assignClient.mutateAsync({ userId: data.user_id, clientId: data.client_id });
    }
    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Add Person to Property
          </DialogTitle>
          <DialogDescription>
            Assign an existing user to a property with a specific role.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="user_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>User</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a user" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {profiles?.map(profile => (
                        <SelectItem key={profile.user_id} value={profile.user_id}>
                          {profile.full_name || profile.email || 'Unknown User'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Select from existing users in the system
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="property_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Property</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a property" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {properties?.map(property => (
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

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {roles
                        ?.filter(role => assignableRoles.includes(role.role_key as AppRole))
                        .map(role => (
                        <SelectItem key={role.role_key} value={role.role_key}>
                          <div className="flex flex-col">
                            <span>{role.display_name}</span>
                            {role.description && (
                              <span className="text-xs text-muted-foreground">
                                {role.description}
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Job Title (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Site Manager" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="department"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Department (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Operations" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="client_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Organization (Optional)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="No organization" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">No organization</SelectItem>
                      {clients?.map(client => (
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

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={addAssignment.isPending}>
                {addAssignment.isPending ? 'Adding...' : 'Add to Property'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
