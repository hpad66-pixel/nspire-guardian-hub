import { useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { CalendarIcon, ChevronDown, ChevronUp } from 'lucide-react';
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { VoiceDictation } from '@/components/ui/voice-dictation';
import { EnhancedPhotoUpload } from '@/components/ui/enhanced-photo-upload';
import { useCreateDailyReport } from '@/hooks/useDailyReports';

const formSchema = z.object({
  report_date: z.date({ required_error: 'Report date is required' }),
  weather: z.string().optional(),
  workers_count: z.coerce.number().min(0).optional(),
  work_performed: z.string().min(1, 'Work performed is required'),
  work_performed_html: z.string().optional(),
  safety_notes: z.string().optional(),
  equipment_used: z.string().optional(),
  materials_received: z.string().optional(),
  delays: z.string().optional(),
  issues_encountered: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface PhotoData {
  id: string;
  url: string;
  caption?: string;
  timestamp: Date;
}

interface EnhancedDailyReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
}

export function EnhancedDailyReportDialog({ open, onOpenChange, projectId }: EnhancedDailyReportDialogProps) {
  const createMutation = useCreateDailyReport();
  const [photos, setPhotos] = useState<PhotoData[]>([]);
  const [workPerformedHtml, setWorkPerformedHtml] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      report_date: new Date(),
      weather: '',
      workers_count: 0,
      work_performed: '',
      work_performed_html: '',
      safety_notes: '',
      equipment_used: '',
      materials_received: '',
      delays: '',
      issues_encountered: '',
    },
  });

  const handleVoiceTranscript = useCallback((transcript: string) => {
    const currentContent = workPerformedHtml;
    const newContent = currentContent 
      ? `${currentContent}<p>${transcript}</p>` 
      : `<p>${transcript}</p>`;
    setWorkPerformedHtml(newContent);
    
    // Also update the plain text version
    const plainText = form.getValues('work_performed');
    form.setValue('work_performed', plainText ? `${plainText}\n\n${transcript}` : transcript);
  }, [workPerformedHtml, form]);

  const onSubmit = (data: FormData) => {
    // Extract photo URLs for storage
    const photoUrls = photos.map(p => p.url);
    
    // Parse equipment used into array
    const equipmentArray = data.equipment_used 
      ? data.equipment_used.split(',').map(e => e.trim()).filter(Boolean)
      : [];

    createMutation.mutate(
      {
        project_id: projectId,
        report_date: format(data.report_date, 'yyyy-MM-dd'),
        weather: data.weather || null,
        workers_count: data.workers_count || 0,
        work_performed: data.work_performed,
        work_performed_html: workPerformedHtml || null,
        safety_notes: data.safety_notes || null,
        equipment_used: equipmentArray.length > 0 ? equipmentArray : null,
        materials_received: data.materials_received || null,
        delays: data.delays || null,
        issues_encountered: data.issues_encountered || null,
        photos: photoUrls.length > 0 ? photoUrls : null,
      } as any,
      {
        onSuccess: () => {
          form.reset();
          setPhotos([]);
          setWorkPerformedHtml('');
          setShowAdvanced(false);
          onOpenChange(false);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Submit Daily Report</DialogTitle>
          <DialogDescription>
            Record construction progress with rich text, photos, and voice dictation
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Info Row */}
            <div className="grid grid-cols-3 gap-4">
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
                            {field.value ? format(field.value, 'MMM d') : 'Date'}
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
                      <Input placeholder="Sunny, 75°F" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="workers_count"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Workers</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} placeholder="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Work Performed - Rich Text with Voice */}
            <FormField
              control={form.control}
              name="work_performed"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>Work Performed</FormLabel>
                    <VoiceDictation onTranscript={handleVoiceTranscript} />
                  </div>
                  <FormControl>
                    <RichTextEditor
                      content={workPerformedHtml}
                      onChange={(html) => {
                        setWorkPerformedHtml(html);
                        // Extract plain text for the form field
                        const tempDiv = document.createElement('div');
                        tempDiv.innerHTML = html;
                        field.onChange(tempDiv.textContent || tempDiv.innerText || '');
                      }}
                      placeholder="Describe the work completed today... Use the microphone button to dictate."
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Photo Upload */}
            <div className="space-y-2">
              <FormLabel>Site Photos</FormLabel>
              <EnhancedPhotoUpload
                photos={photos}
                onPhotosChange={setPhotos}
                folderPath={`${projectId}/`}
              />
            </div>

            {/* Issues Encountered */}
            <FormField
              control={form.control}
              name="issues_encountered"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Issues Encountered (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Problems, delays, or safety concerns..."
                      className="resize-none min-h-[80px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Advanced Fields - Collapsible */}
            <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
              <CollapsibleTrigger asChild>
                <Button type="button" variant="ghost" className="w-full justify-between">
                  <span>Additional Details</span>
                  {showAdvanced ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 pt-4">
                <FormField
                  control={form.control}
                  name="safety_notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Safety Notes</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Safety observations, incidents, or toolbox talks..."
                          className="resize-none min-h-[60px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="equipment_used"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Equipment Used</FormLabel>
                        <FormControl>
                          <Input placeholder="Crane, forklift, scaffolding..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="materials_received"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Materials Received</FormLabel>
                        <FormControl>
                          <Input placeholder="Lumber, concrete, drywall..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="delays"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Delays</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Weather delays, material shortages, inspections..."
                          className="resize-none min-h-[60px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CollapsibleContent>
            </Collapsible>

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
