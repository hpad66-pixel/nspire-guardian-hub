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
import { 
  useCreateDeliverable, 
  useUpdateDeliverable, 
  type PermitDeliverable 
} from '@/hooks/usePermitDeliverables';

const statuses = [
  { value: 'pending', label: 'Pending' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'overdue', label: 'Overdue' },
];

const formSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  due_date: z.string().min(1, 'Due date is required'),
  status: z.string().default('pending'),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface DeliverableDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requirementId: string;
  deliverable?: PermitDeliverable | null;
}

export function DeliverableDialog({ 
  open, 
  onOpenChange, 
  requirementId,
  deliverable 
}: DeliverableDialogProps) {
  const createDeliverable = useCreateDeliverable();
  const updateDeliverable = useUpdateDeliverable();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
      due_date: '',
      status: 'pending',
      notes: '',
    },
  });

  useEffect(() => {
    if (deliverable) {
      form.reset({
        title: deliverable.title,
        description: deliverable.description || '',
        due_date: deliverable.due_date,
        status: deliverable.status,
        notes: deliverable.notes || '',
      });
    } else {
      form.reset({
        title: '',
        description: '',
        due_date: '',
        status: 'pending',
        notes: '',
      });
    }
  }, [deliverable, form]);

  const onSubmit = async (values: FormValues) => {
    try {
      const data = {
        requirement_id: requirementId,
        title: values.title,
        description: values.description || null,
        due_date: values.due_date,
        status: values.status as any,
        notes: values.notes || null,
      };

      if (deliverable) {
        await updateDeliverable.mutateAsync({ id: deliverable.id, ...data });
      } else {
        await createDeliverable.mutateAsync(data);
      }
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to save deliverable:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {deliverable ? 'Edit Deliverable' : 'Add New Deliverable'}
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
                    <Input placeholder="e.g., Inspection Report" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="due_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due Date *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Description of the deliverable..."
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
                disabled={createDeliverable.isPending || updateDeliverable.isPending}
              >
                {deliverable ? 'Update Deliverable' : 'Create Deliverable'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
