import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Building, ArrowRight, ArrowLeft, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import type { OnboardingData } from './OnboardingWizard';

const propertySchema = z.object({
  name: z.string().min(2, 'Property name is required'),
  address: z.string().min(5, 'Address is required'),
  city: z.string().min(2, 'City is required'),
  state: z.string().length(2, 'Use 2-letter state code'),
  zip: z.string().min(5, 'ZIP code is required'),
  total_units: z.coerce.number().min(1, 'At least 1 unit required'),
  daily_grounds: z.boolean(),
  nspire: z.boolean(),
  projects: z.boolean(),
});

type PropertyFormData = z.infer<typeof propertySchema>;

interface PropertyStepProps {
  onNext: (data: Partial<OnboardingData>) => void;
  onBack: () => void;
  initialData?: OnboardingData['property'];
  workspaceId?: string;
}

export function PropertyStep({ onNext, onBack, initialData, workspaceId }: PropertyStepProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<PropertyFormData>({
    resolver: zodResolver(propertySchema),
    defaultValues: {
      name: initialData?.name || '',
      address: initialData?.address || '',
      city: initialData?.city || '',
      state: initialData?.state || '',
      zip: initialData?.zip || '',
      total_units: initialData?.total_units || 1,
      daily_grounds: initialData?.modules?.daily_grounds ?? true,
      nspire: initialData?.modules?.nspire ?? true,
      projects: initialData?.modules?.projects ?? false,
    },
  });

  const onSubmit = (data: PropertyFormData) => {
    setIsSubmitting(true);
    setTimeout(() => {
      onNext({
        property: {
          name: data.name,
          address: data.address,
          city: data.city,
          state: data.state,
          zip: data.zip,
          total_units: data.total_units,
          modules: {
            daily_grounds: data.daily_grounds,
            nspire: data.nspire,
            projects: data.projects,
          },
        },
      });
      setIsSubmitting(false);
    }, 300);
  };

  return (
    <Card className="border-0 shadow-2xl">
      <CardHeader className="text-center space-y-4">
        <div className="flex justify-center">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
            <Building className="h-8 w-8 text-primary-foreground" />
          </div>
        </div>
        <div className="space-y-1">
          <CardTitle className="text-2xl font-bold">Add Your First Property</CardTitle>
          <CardDescription>
            Enter the details for your property
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Property Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Oak Ridge Apartments" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Street Address</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="123 Main Street" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Austin" />
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
                      <Input {...field} placeholder="TX" maxLength={2} className="uppercase" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="zip"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ZIP Code</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="78701" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="total_units"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Total Units</FormLabel>
                  <FormControl>
                    <Input {...field} type="number" min={1} placeholder="50" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4 pt-4 border-t">
              <p className="text-sm font-medium">Which modules do you need?</p>
              
              <div className="space-y-3">
                <FormField
                  control={form.control}
                  name="daily_grounds"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="font-normal cursor-pointer">
                        Daily Grounds Inspections
                      </FormLabel>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="nspire"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="font-normal cursor-pointer">
                        NSPIRE Compliance
                      </FormLabel>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="projects"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="font-normal cursor-pointer">
                        Projects Management
                      </FormLabel>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="flex justify-between pt-6">
              <Button type="button" variant="ghost" onClick={onBack}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Continue
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
