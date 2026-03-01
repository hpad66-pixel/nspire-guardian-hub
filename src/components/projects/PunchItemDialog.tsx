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
import { useCreatePunchItem, useUpdatePunchItem, type PunchItem } from '@/hooks/usePunchItems';
import { ProjectTeamAssignSelect } from './ProjectTeamAssignSelect';
import { useAuth } from '@/hooks/useAuth';

interface PunchItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  punchItem?: PunchItem | null;
}

const priorityOptions = [
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

export function PunchItemDialog({ open, onOpenChange, projectId, punchItem }: PunchItemDialogProps) {
  const isEditing = !!punchItem;
  const { user } = useAuth();
  const createPunchItem = useCreatePunchItem();
  const updatePunchItem = useUpdatePunchItem();
  
  const [formData, setFormData] = useState({
    location: punchItem?.location || '',
    description: punchItem?.description || '',
    priority: punchItem?.priority || 'medium',
    assigned_to: punchItem?.assigned_to || '',
  });
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (isEditing && punchItem) {
        await updatePunchItem.mutateAsync({
          id: punchItem.id,
          location: formData.location,
          description: formData.description,
          priority: formData.priority,
          assigned_to: formData.assigned_to || null,
        });
      } else {
        await createPunchItem.mutateAsync({
          project_id: projectId,
          location: formData.location,
          description: formData.description,
          priority: formData.priority,
          assigned_to: formData.assigned_to || null,
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
      location: '',
      description: '',
      priority: 'medium',
      assigned_to: '',
    });
  };
  
  const isPending = createPunchItem.isPending || updatePunchItem.isPending;
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Punch Item' : 'Add Punch Item'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the punch item details.'
              : 'Add a new item to the punch list for this project.'}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="location">Location *</Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="e.g., Kitchen, Unit 101, Building A Lobby"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <VoiceDictationTextarea
              id="description"
              value={formData.description}
              onValueChange={(value) => setFormData({ ...formData, description: value })}
              placeholder="Describe the issue or work to be completed..."
              className="min-h-[100px]"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) => setFormData({ ...formData, priority: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {priorityOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Assign To</Label>
              <ProjectTeamAssignSelect
                projectId={projectId}
                value={formData.assigned_to || null}
                onValueChange={(val) => setFormData({ ...formData, assigned_to: val || '' })}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || !formData.location || !formData.description}>
              {isPending ? 'Saving...' : isEditing ? 'Update' : 'Add Punch Item'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
