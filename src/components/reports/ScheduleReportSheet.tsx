import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { X, Trash2 } from 'lucide-react';
import { useCreateReportSchedule, useReportSchedules, useToggleSchedule, type SavedReport } from '@/hooks/useSavedReports';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ScheduleReportSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  savedReport: SavedReport;
}

export function ScheduleReportSheet({ open, onOpenChange, savedReport }: ScheduleReportSheetProps) {
  const createSchedule = useCreateReportSchedule();
  const toggleSchedule = useToggleSchedule();
  const { data: schedules = [] } = useReportSchedules(savedReport.id);
  const { data: workspaceId } = useQuery({
    queryKey: ['my-workspace-id'],
    queryFn: async () => {
      const { data } = await supabase.rpc('get_my_workspace_id');
      return data as string;
    },
  });

  const [frequency, setFrequency] = useState<string>('weekly');
  const [dayOfWeek, setDayOfWeek] = useState<number>(1);
  const [dayOfMonth, setDayOfMonth] = useState<number>(1);
  const [emailInput, setEmailInput] = useState('');
  const [emails, setEmails] = useState<string[]>(['hardeep@apas.ai']);
  const [subject, setSubject] = useState(`${savedReport.name} — Report`);

  const addEmail = () => {
    const trimmed = emailInput.trim();
    if (trimmed && trimmed.includes('@') && !emails.includes(trimmed)) {
      setEmails([...emails, trimmed]);
      setEmailInput('');
    }
  };

  const handleSave = async () => {
    if (!workspaceId || emails.length === 0) return;
    await createSchedule.mutateAsync({
      workspace_id: workspaceId,
      saved_report_id: savedReport.id,
      frequency: frequency as any,
      day_of_week: ['weekly', 'biweekly'].includes(frequency) ? dayOfWeek : null,
      day_of_month: frequency === 'monthly' ? dayOfMonth : null,
      recipient_emails: emails,
      subject_template: subject || null,
      is_active: true,
    });
  };

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Schedule: {savedReport.name}</SheetTitle>
        </SheetHeader>

        <div className="space-y-4 mt-6">
          <div>
            <Label>Frequency</Label>
            <Select value={frequency} onValueChange={setFrequency}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="biweekly">Biweekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {['weekly', 'biweekly'].includes(frequency) && (
            <div>
              <Label>Day of Week</Label>
              <Select value={String(dayOfWeek)} onValueChange={v => setDayOfWeek(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {dayNames.map((d, i) => <SelectItem key={i} value={String(i)}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          {frequency === 'monthly' && (
            <div>
              <Label>Day of Month (1-28)</Label>
              <Input type="number" min={1} max={28} value={dayOfMonth} onChange={e => setDayOfMonth(Number(e.target.value))} />
            </div>
          )}

          <div>
            <Label>Recipients</Label>
            <div className="flex gap-2">
              <Input
                placeholder="email@example.com"
                value={emailInput}
                onChange={e => setEmailInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addEmail())}
              />
              <Button variant="outline" size="sm" onClick={addEmail}>Add</Button>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {emails.map(email => (
                <Badge key={email} variant="secondary" className="gap-1">
                  {email}
                  <button onClick={() => setEmails(emails.filter(e => e !== email))}><X className="h-3 w-3" /></button>
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <Label>Subject Line</Label>
            <Input value={subject} onChange={e => setSubject(e.target.value)} />
          </div>

          <Button className="w-full" onClick={handleSave} disabled={createSchedule.isPending || emails.length === 0}>
            Save Schedule
          </Button>

          {/* Existing schedules */}
          {schedules.length > 0 && (
            <div className="border-t pt-4 mt-4">
              <p className="text-xs font-medium text-muted-foreground mb-2">Active Schedules</p>
              <div className="space-y-2">
                {schedules.map(s => (
                  <div key={s.id} className="flex items-center justify-between rounded-lg border p-2">
                    <div className="text-xs">
                      <p className="font-medium capitalize">{s.frequency}</p>
                      <p className="text-muted-foreground">{s.recipient_emails.join(', ')}</p>
                    </div>
                    <Switch
                      checked={s.is_active}
                      onCheckedChange={checked => toggleSchedule.mutate({ id: s.id, is_active: checked })}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="text-[11px] text-muted-foreground italic">
            Scheduled reports are sent automatically. Contact hardeep@apas.ai for setup questions.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
