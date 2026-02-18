import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Building2, Briefcase, Home, Shield, Globe } from 'lucide-react';
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
import { cn } from '@/lib/utils';
import { useCreateClient, useUpdateClient, type Client, type ClientType } from '@/hooks/useClients';

const CLIENT_TYPES: { value: ClientType; label: string; description: string; icon: React.ReactNode; colorClass: string }[] = [
  {
    value: 'internal_org',
    label: 'Internal Organization',
    description: 'Your own company or division',
    icon: <Building2 className="h-4 w-4" />,
    colorClass: 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300',
  },
  {
    value: 'business_client',
    label: 'Business Client',
    description: 'External company you serve',
    icon: <Briefcase className="h-4 w-4" />,
    colorClass: 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  },
  {
    value: 'property_management',
    label: 'Property Management',
    description: 'Housing or property management company',
    icon: <Home className="h-4 w-4" />,
    colorClass: 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  },
  {
    value: 'government',
    label: 'Government / Regulatory',
    description: 'Public agency or regulatory body',
    icon: <Shield className="h-4 w-4" />,
    colorClass: 'border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  },
  {
    value: 'other',
    label: 'Other',
    description: 'Other type of organization',
    icon: <Globe className="h-4 w-4" />,
    colorClass: 'border-muted-foreground/30 bg-muted text-muted-foreground',
  },
];

const orgSchema = z.object({
  name: z.string().min(1, 'Organization name is required'),
  client_type: z.enum(['internal_org', 'business_client', 'property_management', 'government', 'other'] as const),
  contact_name: z.string().optional(),
  contact_email: z.string().email('Invalid email').optional().or(z.literal('')),
  contact_phone: z.string().optional(),
  website: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  industry: z.string().optional(),
  notes: z.string().optional(),
});

type OrgFormValues = z.infer<typeof orgSchema>;

interface OrganizationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organization?: Client | null;
  onCreated?: (client: Client) => void;
}

export function OrganizationDialog({ open, onOpenChange, organization, onCreated }: OrganizationDialogProps) {
  const isEditing = !!organization;
  const createClient = useCreateClient();
  const updateClient = useUpdateClient();

  const form = useForm<OrgFormValues>({
    resolver: zodResolver(orgSchema),
    defaultValues: {
      name: '',
      client_type: 'business_client',
      contact_name: '',
      contact_email: '',
      contact_phone: '',
      website: '',
      address: '',
      city: '',
      state: '',
      industry: '',
      notes: '',
    },
  });

  useEffect(() => {
    if (organization) {
      form.reset({
        name: organization.name,
        client_type: organization.client_type,
        contact_name: organization.contact_name ?? '',
        contact_email: organization.contact_email ?? '',
        contact_phone: organization.contact_phone ?? '',
        website: organization.website ?? '',
        address: organization.address ?? '',
        city: organization.city ?? '',
        state: organization.state ?? '',
        industry: organization.industry ?? '',
        notes: organization.notes ?? '',
      });
    } else {
      form.reset({
        name: '',
        client_type: 'business_client',
        contact_name: '',
        contact_email: '',
        contact_phone: '',
        website: '',
        address: '',
        city: '',
        state: '',
        industry: '',
        notes: '',
      });
    }
  }, [organization, open]);

  const onSubmit = async (data: OrgFormValues) => {
    const payload = {
      name: data.name,
      client_type: data.client_type,
      contact_name: data.contact_name || null,
      contact_email: data.contact_email || null,
      contact_phone: data.contact_phone || null,
      website: data.website || null,
      address: data.address || null,
      city: data.city || null,
      state: data.state || null,
      industry: data.industry || null,
      notes: data.notes || null,
      is_active: true,
    };

    try {
      if (isEditing && organization) {
        await updateClient.mutateAsync({ id: organization.id, ...payload });
        onOpenChange(false);
      } else {
        const created = await createClient.mutateAsync(payload);
        onCreated?.(created);
        onOpenChange(false);
      }
    } catch {
      // handled by mutation
    }
  };

  const isPending = createClient.isPending || updateClient.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Organization' : 'New Organization / Client'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the organization details.'
              : 'Add a company, client, or organization to the platform.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            {/* Organization Type */}
            <FormField
              control={form.control}
              name="client_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Organization Type *</FormLabel>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {CLIENT_TYPES.map((type) => (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => field.onChange(type.value)}
                        className={cn(
                          'flex items-start gap-2.5 rounded-lg border-2 p-3 text-left transition-all',
                          field.value === type.value
                            ? type.colorClass + ' border-current'
                            : 'border-border bg-background hover:bg-muted/50'
                        )}
                      >
                        <div className="mt-0.5 shrink-0">{type.icon}</div>
                        <div>
                          <p className="text-sm font-medium leading-none">{type.label}</p>
                          <p className="mt-1 text-xs opacity-70">{type.description}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Organization Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Organization Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. R4 Capital Partners" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Contact Info */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="contact_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Primary Contact Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John Smith" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="contact_email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="contact@company.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="contact_phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Phone</FormLabel>
                    <FormControl>
                      <Input placeholder="(305) 555-0100" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="website"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Website</FormLabel>
                    <FormControl>
                      <Input placeholder="https://company.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Address */}
            <div className="grid grid-cols-1 gap-4">
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Street Address</FormLabel>
                    <FormControl>
                      <Input placeholder="123 Main Street" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input placeholder="Miami" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>State</FormLabel>
                      <FormControl>
                        <Input placeholder="FL" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Industry & Notes */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="industry"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Industry</FormLabel>
                    <FormControl>
                      <Input placeholder="Real Estate, Environmental…" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Additional context about this organization…"
                      rows={3}
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
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Saving…' : isEditing ? 'Update Organization' : 'Create Organization'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
