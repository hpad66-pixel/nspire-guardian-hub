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
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateRFI, useUpdateRFI, type RFI } from '@/hooks/useRFIs';
import { useProfiles } from '@/hooks/useProfiles';
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
  const { data: profiles } = useProfiles();
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
            <Textarea
              id="question"
              value={formData.question}
              onChange={(e) => setFormData({ ...formData, question: e.target.value })}
              placeholder="Describe your question in detail..."
              rows={5}
              required
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Assign To</Label>
              <Select
                value={formData.assigned_to}
                onValueChange={(value) => setFormData({ ...formData, assigned_to: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select person" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Unassigned</SelectItem>
                  {profiles?.map((profile) => (
                    <SelectItem key={profile.user_id} value={profile.user_id}>
                      {profile.full_name || profile.email || 'Unknown'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
