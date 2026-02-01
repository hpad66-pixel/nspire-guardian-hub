import { useState } from 'react';
import { Archive, AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useArchiveTeamMember } from '@/hooks/usePeople';
import type { PropertyTeamMember } from '@/hooks/usePeople';

interface ArchivePersonDialogProps {
  assignment: PropertyTeamMember | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DEPARTURE_REASONS = [
  { value: 'resignation', label: 'Resignation' },
  { value: 'termination', label: 'Termination' },
  { value: 'transfer', label: 'Transfer to another property' },
  { value: 'contract_end', label: 'Contract ended' },
  { value: 'other', label: 'Other' },
] as const;

type DepartureReason = typeof DEPARTURE_REASONS[number]['value'];

export function ArchivePersonDialog({ assignment, open, onOpenChange }: ArchivePersonDialogProps) {
  const [departureReason, setDepartureReason] = useState<DepartureReason | ''>('');
  const [departureNotes, setDepartureNotes] = useState('');
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  const archiveTeamMember = useArchiveTeamMember();

  if (!assignment) return null;

  const handleArchive = async () => {
    if (!departureReason) return;

    await archiveTeamMember.mutateAsync({
      id: assignment.id,
      departure_reason: departureReason,
      departure_notes: departureNotes || undefined,
      end_date: endDate,
    });

    setDepartureReason('');
    setDepartureNotes('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Archive className="h-5 w-5" />
            Archive Team Member
          </DialogTitle>
          <DialogDescription>
            Archive this team member from {assignment.property?.name || 'the property'}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>This will:</strong>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Revoke active access to the property</li>
                <li>Preserve all historical data for audit purposes</li>
                <li>Allow reactivation in the future if needed</li>
              </ul>
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="end-date">Departure Date</Label>
            <Input
              id="end-date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Departure</Label>
            <Select value={departureReason} onValueChange={(v) => setDepartureReason(v as DepartureReason)}>
              <SelectTrigger>
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                {DEPARTURE_REASONS.map(reason => (
                  <SelectItem key={reason.value} value={reason.value}>
                    {reason.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add any relevant details for records..."
              value={departureNotes}
              onChange={(e) => setDepartureNotes(e.target.value)}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              These notes are for internal records and audit purposes.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleArchive} 
            disabled={!departureReason || archiveTeamMember.isPending}
            variant="destructive"
          >
            {archiveTeamMember.isPending ? 'Archiving...' : 'Archive Team Member'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
