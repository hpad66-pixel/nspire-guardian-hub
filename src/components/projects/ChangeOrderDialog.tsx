import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import { VoiceDictationTextareaWithAI } from '@/components/ui/voice-dictation-textarea-ai';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateChangeOrder, useUpdateChangeOrder } from '@/hooks/useChangeOrders';
import type { Database } from '@/integrations/supabase/types';

type ChangeOrderRow = Database['public']['Tables']['change_orders']['Row'];

const formSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  amount: z.coerce.number().min(0, 'Amount must be positive'),
  description: z.string().optional(),
  status: z.enum(['draft', 'pending']),
});

type FormData = z.infer<typeof formSchema>;

interface ChangeOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  changeOrder?: ChangeOrderRow | null;
}

export function ChangeOrderDialog({
  open,
  onOpenChange,
  projectId,
  changeOrder,
}: ChangeOrderDialogProps) {
  const createMutation = useCreateChangeOrder();
  const updateMutation = useUpdateChangeOrder();
  const isEditing = !!changeOrder;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      amount: 0,
      description: '',
      status: 'draft',
    },
  });

  useEffect(() => {
    if (changeOrder) {
      form.reset({
        title: changeOrder.title,
        amount: Number(changeOrder.amount),
        description: changeOrder.description || '',
        status: changeOrder.status as 'draft' | 'pending',
      });
    } else {
      form.reset({
        title: '',
        amount: 0,
        description: '',
        status: 'draft',
      });
    }
  }, [changeOrder, form]);

  const onSubmit = (data: FormData) => {
    const payload = {
      title: data.title,
      amount: data.amount,
      description: data.description || null,
      status: data.status,
      project_id: projectId,
    };

    if (isEditing) {
      updateMutation.mutate(
        { id: changeOrder.id, ...payload },
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
          <DialogTitle>{isEditing ? 'Edit Change Order' : 'New Change Order'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update change order details'
              : 'Request a budget adjustment or scope change'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Additional electrical work" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount ($)</FormLabel>
                  <FormControl>
                    <Input type="number" min={0} step={100} placeholder="0" {...field} />
                  </FormControl>
                  <FormDescription>The cost impact of this change order</FormDescription>
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
                    <VoiceDictationTextareaWithAI
                      placeholder="Describe the scope change and justification..."
                      className="resize-none min-h-[100px]"
                      value={field.value || ''}
                      onValueChange={field.onChange}
                      context="description"
                    />
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
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="draft">Draft (save for later)</SelectItem>
                      <SelectItem value="pending">Submit for Approval</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Draft orders can be edited. Pending orders await approval.
                  </FormDescription>
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
                  : 'Create Change Order'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
