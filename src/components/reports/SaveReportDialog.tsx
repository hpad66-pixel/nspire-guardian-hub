import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Trash2 } from 'lucide-react';
import { useCreateSavedReport, useDeleteSavedReport, useSavedReports } from '@/hooks/useSavedReports';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface SaveReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportType: string;
  config: Record<string, any>;
}

export function SaveReportDialog({ open, onOpenChange, reportType, config }: SaveReportDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const createReport = useCreateSavedReport();
  const deleteReport = useDeleteSavedReport();
  const { data: savedReports = [] } = useSavedReports();
  const { data: workspaceId } = useQuery({
    queryKey: ['my-workspace-id'],
    queryFn: async () => {
      const { data } = await supabase.rpc('get_my_workspace_id');
      return data as string;
    },
  });

  const typeReports = savedReports.filter(r => r.report_type === reportType);

  const handleSave = async () => {
    if (!name.trim() || !workspaceId) return;
    await createReport.mutateAsync({
      name,
      description: description || null,
      report_type: reportType,
      config,
      workspace_id: workspaceId,
      created_by: null,
      is_template: false,
    });
    setName('');
    setDescription('');
    onOpenChange(false);
  };

  const typeLabel: Record<string, string> = {
    pay_app_status: 'Pay App Status',
    contractor_accountability: 'Contractor Accountability',
    project_financial: 'Project Financial',
    owner_monthly: 'Owner Monthly Summary',
    custom: 'Custom',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Save Report</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Report Name *</Label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Glorieta Gardens Monthly — Chris Sullivan"
            />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea
              rows={2}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Optional description..."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={!name.trim() || createReport.isPending}>
            Save Report
          </Button>
        </DialogFooter>

        {typeReports.length > 0 && (
          <div className="border-t pt-4 mt-2">
            <p className="text-xs text-muted-foreground mb-2">
              You have {typeReports.length} saved {typeLabel[reportType] || reportType} reports
            </p>
            <div className="space-y-1.5">
              {typeReports.map(r => (
                <div key={r.id} className="flex items-center justify-between rounded border px-2.5 py-1.5">
                  <div>
                    <p className="text-sm font-medium">{r.name}</p>
                    <p className="text-[10px] text-muted-foreground">{format(new Date(r.created_at), 'MMM d, yyyy')}</p>
                  </div>
                  <Button
                    variant="ghost" size="icon" className="h-7 w-7"
                    onClick={() => deleteReport.mutate(r.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
