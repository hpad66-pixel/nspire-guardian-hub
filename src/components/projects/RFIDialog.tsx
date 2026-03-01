import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { VoiceDictationTextarea } from '@/components/ui/voice-dictation-textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateRFI, useUpdateRFI, type RFI } from '@/hooks/useRFIs';
import { ProjectTeamAssignSelect } from './ProjectTeamAssignSelect';
import { useAuth } from '@/hooks/useAuth';

interface RFIDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  rfi?: RFI | null;
}

export function RFIDialog({ open, onOpenChange, projectId, rfi }: RFIDialogProps) {
  const isEditing = !!rfi;
  const { user } = useAuth();
  const createRFI = useCreateRFI();
  const updateRFI = useUpdateRFI();
  
  const [formData, setFormData] = useState({
    subject: rfi?.subject || '',
    question: rfi?.question || '',
    assigned_to: rfi?.assigned_to || '',
    due_date: rfi?.due_date || '',
  });
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (isEditing && rfi) {
        await updateRFI.mutateAsync({
          id: rfi.id,
          subject: formData.subject,
          question: formData.question,
          assigned_to: formData.assigned_to || null,
          due_date: formData.due_date || null,
        });
      } else {
        await createRFI.mutateAsync({
          project_id: projectId,
          subject: formData.subject,
          question: formData.question,
          assigned_to: formData.assigned_to || null,
          due_date: formData.due_date || null,
          created_by: user?.id || null,
        });
      }
      
      onOpenChange(false);
      resetForm();
    } catch (error) {
      // Error handled by mutation
    }
  };
  
  const resetForm = () => {
    setFormData({
      subject: '',
      question: '',
      assigned_to: '',
      due_date: '',
    });
  };
  
  const isPending = createRFI.isPending || updateRFI.isPending;
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit RFI' : 'Create New RFI'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the Request for Information details.'
              : 'Submit a new Request for Information to the project team.'}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="subject">Subject *</Label>
            <Input
              id="subject"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              placeholder="Brief subject line"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="question">Question *</Label>
            <VoiceDictationTextarea
              id="question"
              value={formData.question}
              onValueChange={(value) => setFormData({ ...formData, question: value })}
              placeholder="Describe your question in detail..."
              className="min-h-[120px]"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Assign To</Label>
              <ProjectTeamAssignSelect
                projectId={projectId}
                value={formData.assigned_to || null}
                onValueChange={(val) => setFormData({ ...formData, assigned_to: val || '' })}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="due_date">Due Date</Label>
              <Input
                id="due_date"
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || !formData.subject || !formData.question}>
              {isPending ? 'Saving...' : isEditing ? 'Update RFI' : 'Create RFI'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
