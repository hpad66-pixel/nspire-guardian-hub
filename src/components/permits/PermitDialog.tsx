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
import { VoiceDictationTextareaWithAI } from '@/components/ui/voice-dictation-textarea-ai';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useProperties } from '@/hooks/useProperties';
import { useCreatePermit, useUpdatePermit, type Permit } from '@/hooks/usePermits';

const permitTypes = [
  { value: 'building_permit', label: 'Building Permit' },
  { value: 'occupancy_certificate', label: 'Certificate of Occupancy' },
  { value: 'fire_safety', label: 'Fire Safety' },
  { value: 'elevator', label: 'Elevator' },
  { value: 'pool', label: 'Pool/Spa' },
  { value: 'boiler', label: 'Boiler' },
  { value: 'environmental', label: 'Environmental' },
  { value: 'hud_compliance', label: 'HUD Compliance' },
  { value: 'ada', label: 'ADA Compliance' },
  { value: 'other', label: 'Other' },
];

const permitStatuses = [
  { value: 'draft', label: 'Draft' },
  { value: 'active', label: 'Active' },
  { value: 'expired', label: 'Expired' },
  { value: 'renewed', label: 'Renewed' },
  { value: 'revoked', label: 'Revoked' },
];

const formSchema = z.object({
  property_id: z.string().min(1, 'Property is required'),
  permit_type: z.string().min(1, 'Permit type is required'),
  name: z.string().min(1, 'Name is required'),
  permit_number: z.string().optional(),
  description: z.string().optional(),
  issuing_authority: z.string().optional(),
  issue_date: z.string().optional(),
  expiry_date: z.string().optional(),
  status: z.string().default('draft'),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface PermitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  permit?: Permit | null;
  defaultPropertyId?: string;
}

export function PermitDialog({ 
  open, 
  onOpenChange, 
  permit, 
  defaultPropertyId 
}: PermitDialogProps) {
  const { data: properties } = useProperties();
  const createPermit = useCreatePermit();
  const updatePermit = useUpdatePermit();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      property_id: defaultPropertyId || '',
      permit_type: '',
      name: '',
      permit_number: '',
      description: '',
      issuing_authority: '',
      issue_date: '',
      expiry_date: '',
      status: 'draft',
      notes: '',
    },
  });

  useEffect(() => {
    if (permit) {
      form.reset({
        property_id: permit.property_id,
        permit_type: permit.permit_type,
        name: permit.name,
        permit_number: permit.permit_number || '',
        description: permit.description || '',
        issuing_authority: permit.issuing_authority || '',
        issue_date: permit.issue_date || '',
        expiry_date: permit.expiry_date || '',
        status: permit.status,
        notes: permit.notes || '',
      });
    } else {
      form.reset({
        property_id: defaultPropertyId || '',
        permit_type: '',
        name: '',
        permit_number: '',
        description: '',
        issuing_authority: '',
        issue_date: '',
        expiry_date: '',
        status: 'draft',
        notes: '',
      });
    }
  }, [permit, defaultPropertyId, form]);

  const onSubmit = async (values: FormValues) => {
    try {
      const data = {
        property_id: values.property_id,
        permit_type: values.permit_type as any,
        name: values.name,
        permit_number: values.permit_number || null,
        description: values.description || null,
        issuing_authority: values.issuing_authority || null,
        issue_date: values.issue_date || null,
        expiry_date: values.expiry_date || null,
        status: values.status as any,
        notes: values.notes || null,
      };

      if (permit) {
        await updatePermit.mutateAsync({ id: permit.id, ...data });
      } else {
        await createPermit.mutateAsync(data);
      }
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to save permit:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {permit ? 'Edit Permit' : 'Add New Permit'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="property_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Property *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select property" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {properties?.map((property) => (
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
                name="permit_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Permit Type *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {permitTypes.map((type) => (
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
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Permit Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Fire Safety Certificate" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="permit_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Permit Number</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., FDNY-2024-12345" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="issuing_authority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Issuing Authority</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., NYC Fire Department" {...field} />
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
                        {permitStatuses.map((status) => (
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

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="issue_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Issue Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="expiry_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expiry Date</FormLabel>
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
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <VoiceDictationTextareaWithAI
                      placeholder="Brief description of the permit..."
                      className="min-h-[80px]"
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
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <VoiceDictationTextareaWithAI
                      placeholder="Additional notes..."
                      className="min-h-[60px]"
                      value={field.value || ''}
                      onValueChange={field.onChange}
                      context="notes"
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
                disabled={createPermit.isPending || updatePermit.isPending}
              >
                {permit ? 'Update Permit' : 'Create Permit'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
