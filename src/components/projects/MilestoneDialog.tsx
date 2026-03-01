import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useCreateMilestone, useUpdateMilestone } from '@/hooks/useMilestones';
import { ProjectTeamAssignSelect } from './ProjectTeamAssignSelect';
import type { Database } from '@/integrations/supabase/types';

type MilestoneRow = Database['public']['Tables']['project_milestones']['Row'];

const formSchema = z.object({
  name: z.string().min(1, 'Milestone name is required'),
  due_date: z.date({ required_error: 'Due date is required' }),
  status: z.string().default('pending'),
  assigned_to: z.string().nullable().optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface MilestoneDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  milestone?: MilestoneRow | null;
}

export function MilestoneDialog({ open, onOpenChange, projectId, milestone }: MilestoneDialogProps) {
  const createMutation = useCreateMilestone();
  const updateMutation = useUpdateMilestone();
  const isEditing = !!milestone;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      status: 'pending',
      assigned_to: null,
      notes: '',
    },
  });

  useEffect(() => {
    if (milestone) {
      form.reset({
        name: milestone.name,
        due_date: new Date(milestone.due_date),
        status: milestone.status,
        assigned_to: milestone.assigned_to || null,
        notes: milestone.notes || '',
      });
    } else {
      form.reset({
        name: '',
        status: 'pending',
        assigned_to: null,
        notes: '',
      });
    }
  }, [milestone, form]);

  const onSubmit = (data: FormData) => {
    const payload = {
      name: data.name,
      due_date: format(data.due_date, 'yyyy-MM-dd'),
      status: data.status,
      assigned_to: data.assigned_to || null,
      notes: data.notes || null,
      project_id: projectId,
    };

    if (isEditing) {
      updateMutation.mutate(
        { id: milestone.id, ...payload },
        { onSuccess: () => onOpenChange(false) }
      );
    } else {
      createMutation.mutate(payload, { onSuccess: () => onOpenChange(false) });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Milestone' : 'Add Milestone'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Update milestone details' : 'Create a new project milestone'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Milestone Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Foundation Complete" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="due_date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Due Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            'w-full pl-3 text-left font-normal',
                            !field.value && 'text-muted-foreground'
                          )}
                        >
                          {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="assigned_to"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assign To</FormLabel>
                  <FormControl>
                    <ProjectTeamAssignSelect
                      projectId={projectId}
                      value={field.value}
                      onValueChange={(val) => field.onChange(val)}
                      useSentinel
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {isEditing && (
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Additional details about this milestone..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending
                  ? 'Saving...'
                  : isEditing
                  ? 'Save Changes'
                  : 'Add Milestone'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
