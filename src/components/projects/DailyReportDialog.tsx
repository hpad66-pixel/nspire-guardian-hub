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
import { cn } from '@/lib/utils';
import { useCreateDailyReport } from '@/hooks/useDailyReports';

const formSchema = z.object({
  report_date: z.date({ required_error: 'Report date is required' }),
  weather: z.string().optional(),
  workers_count: z.coerce.number().min(0).optional(),
  work_performed: z.string().min(1, 'Work performed is required'),
  issues_encountered: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface DailyReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
}

export function DailyReportDialog({ open, onOpenChange, projectId }: DailyReportDialogProps) {
  const createMutation = useCreateDailyReport();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      report_date: new Date(),
      weather: '',
      workers_count: 0,
      work_performed: '',
      issues_encountered: '',
    },
  });

  const onSubmit = (data: FormData) => {
    createMutation.mutate(
      {
        project_id: projectId,
        report_date: format(data.report_date, 'yyyy-MM-dd'),
        weather: data.weather || null,
        workers_count: data.workers_count || 0,
        work_performed: data.work_performed,
        issues_encountered: data.issues_encountered || null,
      },
      {
        onSuccess: () => {
          form.reset();
          onOpenChange(false);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Submit Daily Report</DialogTitle>
          <DialogDescription>Record today's construction progress and activities</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="report_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Report Date</FormLabel>
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
                name="weather"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Weather</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Sunny, 75°F" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="workers_count"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Workers on Site</FormLabel>
                  <FormControl>
                    <Input type="number" min={0} placeholder="0" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="work_performed"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Work Performed</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe the work completed today..."
                      className="resize-none min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="issues_encountered"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Issues Encountered (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Any problems, delays, or safety concerns..."
                      className="resize-none min-h-[80px]"
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
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Submitting...' : 'Submit Report'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
