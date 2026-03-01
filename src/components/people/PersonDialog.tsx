import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { UserPlus, Building, FolderKanban, Briefcase } from 'lucide-react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useProperties } from '@/hooks/useProperties';
import { useProjects } from '@/hooks/useProjects';
import { useRoleDefinitions } from '@/hooks/useRoleDefinitions';
import { useProfiles } from '@/hooks/useProfiles';
import { useAddPropertyAssignment } from '@/hooks/usePeople';
import { useAddProjectTeamMember } from '@/hooks/useProjectTeam';
import { useUserPermissions, getAssignableRoles } from '@/hooks/usePermissions';
import { useActiveClients, useAssignClientToProfile } from '@/hooks/useClients';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

const PROJECT_ROLES = [
  { value: 'project_manager', label: 'Project Manager' },
  { value: 'superintendent', label: 'Superintendent' },
  { value: 'inspector', label: 'Inspector' },
  { value: 'subcontractor', label: 'Subcontractor' },
  { value: 'viewer', label: 'Viewer' },
] as const;

const formSchema = z.object({
  user_id: z.string().min(1, 'Please select a user'),
  // Property assignment
  assign_property: z.boolean().default(true),
  property_id: z.string().optional(),
  property_role: z.string().optional(),
  title: z.string().optional(),
  department: z.string().optional(),
  // Project assignment
  assign_project: z.boolean().default(false),
  project_id: z.string().optional(),
  project_role: z.string().optional(),
  // Organization
  client_id: z.string().optional(),
}).refine(
  (data) => data.assign_property || data.assign_project,
  { message: 'Select at least one assignment (property or project)', path: ['assign_property'] }
).refine(
  (data) => !data.assign_property || (data.property_id && data.property_id !== ''),
  { message: 'Please select a property', path: ['property_id'] }
).refine(
  (data) => !data.assign_property || (data.property_role && data.property_role !== ''),
  { message: 'Please select a role', path: ['property_role'] }
).refine(
  (data) => !data.assign_project || (data.project_id && data.project_id !== ''),
  { message: 'Please select a project', path: ['project_id'] }
).refine(
  (data) => !data.assign_project || (data.project_role && data.project_role !== ''),
  { message: 'Please select a project role', path: ['project_role'] }
);

type FormValues = z.infer<typeof formSchema>;

interface PersonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PersonDialog({ open, onOpenChange }: PersonDialogProps) {
  const { data: properties } = useProperties();
  const { data: projects } = useProjects();
  const { data: roles } = useRoleDefinitions();
  const { data: profiles } = useProfiles();
  const { data: clients } = useActiveClients();
  const { currentRole } = useUserPermissions();
  const assignableRoles = currentRole ? getAssignableRoles(currentRole) : [];
  const addAssignment = useAddPropertyAssignment();
  const addProjectMember = useAddProjectTeamMember();
  const assignClient = useAssignClientToProfile();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      user_id: '',
      assign_property: true,
      property_id: '',
      property_role: 'user',
      title: '',
      department: '',
      assign_project: false,
      project_id: '',
      project_role: 'viewer',
      client_id: 'none',
    },
  });

  const assignProperty = form.watch('assign_property');
  const assignProject = form.watch('assign_project');

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    try {
      // 1. Property assignment
      if (data.assign_property && data.property_id && data.property_role) {
        await addAssignment.mutateAsync({
          property_id: data.property_id,
          user_id: data.user_id,
          role: data.property_role as AppRole,
          title: data.title || undefined,
          department: data.department || undefined,
        });
      }

      // 2. Project assignment
      if (data.assign_project && data.project_id && data.project_role) {
        addProjectMember.mutate({
          projectId: data.project_id,
          userId: data.user_id,
          role: data.project_role as AppRole,
        });
      }

      // 3. Organization assignment
      if (data.client_id && data.client_id !== 'none') {
        await assignClient.mutateAsync({ userId: data.user_id, clientId: data.client_id });
      }

      toast.success('Person assigned successfully');
      form.reset();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to assign person');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Add Person
          </DialogTitle>
          <DialogDescription>
            Assign an existing user to a property, project, or organization.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            {/* User selection */}
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
                  <FormDescription>Select from existing users in the system</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* ─── Assignment Type Toggles ─── */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Assign To</Label>
              <div className="grid grid-cols-2 gap-3">
                {/* Property toggle */}
                <label
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    assignProperty ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground/30'
                  }`}
                >
                  <Checkbox
                    checked={assignProperty}
                    onCheckedChange={(v) => form.setValue('assign_property', !!v)}
                  />
                  <Building className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Property</span>
                </label>

                {/* Project toggle */}
                <label
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    assignProject ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground/30'
                  }`}
                >
                  <Checkbox
                    checked={assignProject}
                    onCheckedChange={(v) => form.setValue('assign_project', !!v)}
                  />
                  <FolderKanban className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Project</span>
                </label>
              </div>
              {form.formState.errors.assign_property && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.assign_property.message}
                </p>
              )}
            </div>

            {/* ─── Property Section ─── */}
            {assignProperty && (
              <div className="space-y-4 rounded-lg border border-border/60 p-4 bg-muted/30">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Building className="h-4 w-4" />
                  Property Assignment
                </div>

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
                  name="property_role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Property Role</FormLabel>
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

                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Job Title <span className="text-muted-foreground font-normal">(Optional)</span></FormLabel>
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
                        <FormLabel>Department <span className="text-muted-foreground font-normal">(Optional)</span></FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Operations" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            )}

            {/* ─── Project Section ─── */}
            {assignProject && (
              <div className="space-y-4 rounded-lg border border-border/60 p-4 bg-muted/30">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <FolderKanban className="h-4 w-4" />
                  Project Assignment
                </div>

                <FormField
                  control={form.control}
                  name="project_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a project" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {projects?.map(project => (
                            <SelectItem key={project.id} value={project.id}>
                              {project.name}
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
                  name="project_role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project Role</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a project role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {PROJECT_ROLES.map(role => (
                            <SelectItem key={role.value} value={role.value}>
                              {role.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* ─── Organization ─── */}
            <FormField
              control={form.control}
              name="client_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4" />
                    Organization <span className="text-muted-foreground font-normal">(Optional)</span>
                  </FormLabel>
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
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Adding...' : 'Add Person'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
