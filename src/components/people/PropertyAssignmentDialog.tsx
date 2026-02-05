import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Building2 } from 'lucide-react';
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
import { useAddPropertyAssignment } from '@/hooks/usePeople';
import { useUserPermissions, getAssignableRoles } from '@/hooks/usePermissions';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

const formSchema = z.object({
  property_id: z.string().min(1, 'Please select a property'),
  role: z.string().min(1, 'Please select a role'),
  title: z.string().optional(),
  department: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface PropertyAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  existingPropertyIds: string[];
  defaultRole?: AppRole | null;
  lockRole?: boolean;
}

export function PropertyAssignmentDialog({ 
  open, 
  onOpenChange, 
  userId,
  existingPropertyIds,
  defaultRole = null,
  lockRole = false,
}: PropertyAssignmentDialogProps) {
  const { data: properties } = useProperties();
  const { data: roles } = useRoleDefinitions();
  const { currentRole } = useUserPermissions();
  const assignableRoles = currentRole ? getAssignableRoles(currentRole) : [];
  const addAssignment = useAddPropertyAssignment();

  // Filter out properties where user is already assigned
  const availableProperties = properties?.filter(
    p => !existingPropertyIds.includes(p.id)
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      property_id: '',
      role: defaultRole || 'user',
      title: '',
      department: '',
    },
  });

  useEffect(() => {
    if (!open) return;
    form.reset({
      property_id: '',
      role: defaultRole || 'user',
      title: '',
      department: '',
    });
  }, [open, defaultRole, form]);

  const onSubmit = async (data: FormValues) => {
    await addAssignment.mutateAsync({
      property_id: data.property_id,
      user_id: userId,
      role: data.role as AppRole,
      title: data.title || undefined,
      department: data.department || undefined,
    });
    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Add Property Assignment
          </DialogTitle>
          <DialogDescription>
            Assign this user to another property with a specific role.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                      {availableProperties?.length === 0 ? (
                        <div className="p-2 text-sm text-muted-foreground">
                          User is already assigned to all properties
                        </div>
                      ) : (
                        availableProperties?.map(property => (
                          <SelectItem key={property.id} value={property.id}>
                            {property.name}
                          </SelectItem>
                        ))
                      )}
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
                      <SelectTrigger disabled={lockRole}>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {roles
                        ?.filter(role => assignableRoles.includes(role.role_key as AppRole))
                        .map(role => (
                        <SelectItem key={role.role_key} value={role.role_key}>
                          {role.display_name}
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
                    <FormLabel>Job Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Optional" {...field} />
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
                    <FormLabel>Department</FormLabel>
                    <FormControl>
                      <Input placeholder="Optional" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={addAssignment.isPending || availableProperties?.length === 0}
              >
                {addAssignment.isPending ? 'Adding...' : 'Add Assignment'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
