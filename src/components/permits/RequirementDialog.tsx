import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useProfiles } from '@/hooks/useProfiles';
import { 
  useCreateRequirement, 
  useUpdateRequirement, 
  type PermitRequirement 
} from '@/hooks/usePermitRequirements';

const requirementTypes = [
  { value: 'inspection', label: 'Inspection' },
  { value: 'report', label: 'Report' },
  { value: 'certification', label: 'Certification' },
  { value: 'filing', label: 'Filing' },
  { value: 'payment', label: 'Payment' },
  { value: 'training', label: 'Training' },
  { value: 'other', label: 'Other' },
];

const frequencies = [
  { value: 'one_time', label: 'One-time' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'semi_annual', label: 'Semi-Annual' },
  { value: 'annual', label: 'Annual' },
  { value: 'biennial', label: 'Biennial (Every 2 Years)' },
  { value: 'as_needed', label: 'As Needed' },
];

const statuses = [
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'compliant', label: 'Compliant' },
  { value: 'non_compliant', label: 'Non-Compliant' },
  { value: 'waived', label: 'Waived' },
];

const formSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  requirement_type: z.string().min(1, 'Type is required'),
  frequency: z.string().min(1, 'Frequency is required'),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  next_due_date: z.string().optional(),
  status: z.string().default('pending'),
  responsible_user_id: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface RequirementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  permitId: string;
  requirement?: PermitRequirement | null;
}

export function RequirementDialog({ 
  open, 
  onOpenChange, 
  permitId,
  requirement 
}: RequirementDialogProps) {
  const { data: profiles } = useProfiles();
  const createRequirement = useCreateRequirement();
  const updateRequirement = useUpdateRequirement();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
      requirement_type: '',
      frequency: 'annual',
      start_date: '',
      end_date: '',
      next_due_date: '',
      status: 'pending',
      responsible_user_id: '',
      notes: '',
    },
  });

  useEffect(() => {
    if (requirement) {
      form.reset({
        title: requirement.title,
        description: requirement.description || '',
        requirement_type: requirement.requirement_type,
        frequency: requirement.frequency,
        start_date: requirement.start_date || '',
        end_date: requirement.end_date || '',
        next_due_date: requirement.next_due_date || '',
        status: requirement.status,
        responsible_user_id: requirement.responsible_user_id || '',
        notes: requirement.notes || '',
      });
    } else {
      form.reset({
        title: '',
        description: '',
        requirement_type: '',
        frequency: 'annual',
        start_date: '',
        end_date: '',
        next_due_date: '',
        status: 'pending',
        responsible_user_id: '',
        notes: '',
      });
    }
  }, [requirement, form]);

  const onSubmit = async (values: FormValues) => {
    try {
      const data = {
        permit_id: permitId,
        title: values.title,
        description: values.description || null,
        requirement_type: values.requirement_type as any,
        frequency: values.frequency as any,
        start_date: values.start_date || null,
        end_date: values.end_date || null,
        next_due_date: values.next_due_date || null,
        status: values.status as any,
        responsible_user_id: values.responsible_user_id || null,
        notes: values.notes || null,
      };

      if (requirement) {
        await updateRequirement.mutateAsync({ id: requirement.id, ...data });
      } else {
        await createRequirement.mutateAsync(data);
      }
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to save requirement:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {requirement ? 'Edit Requirement' : 'Add New Requirement'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Annual Fire Inspection" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="requirement_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {requirementTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
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
                name="frequency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Frequency *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select frequency" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {frequencies.map((freq) => (
                          <SelectItem key={freq.value} value={freq.value}>
                            {freq.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {statuses.map((status) => (
                          <SelectItem key={status.value} value={status.value}>
                            {status.label}
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
                name="next_due_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Next Due Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="start_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="end_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="responsible_user_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Responsible Person</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ''}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Assign to..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {profiles?.map((profile) => (
                        <SelectItem key={profile.user_id} value={profile.user_id}>
                          {profile.full_name || profile.email}
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
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Description of the requirement..."
                      className="min-h-[80px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Additional notes..."
                      className="min-h-[60px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createRequirement.isPending || updateRequirement.isPending}
              >
                {requirement ? 'Update Requirement' : 'Create Requirement'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
