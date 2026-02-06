import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { VoiceDictationTextarea } from '@/components/ui/voice-dictation-textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { useProperties } from '@/hooks/useProperties';
import { useUnitsByProperty } from '@/hooks/useUnits';
import { useCreateIssue, useUpdateIssue } from '@/hooks/useIssues';
import type { Database } from '@/integrations/supabase/types';

type IssueRow = Database['public']['Tables']['issues']['Row'];
type SeverityLevel = Database['public']['Enums']['severity_level'];
type InspectionArea = Database['public']['Enums']['inspection_area'];

interface IssueDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  issue?: IssueRow | null;
}

export function IssueDialog({ open, onOpenChange, issue }: IssueDialogProps) {
  const isEditing = !!issue;
  const { data: properties } = useProperties();
  
  const [formData, setFormData] = useState({
    property_id: issue?.property_id || '',
    unit_id: issue?.unit_id || '',
    title: issue?.title || '',
    description: issue?.description || '',
    severity: (issue?.severity || 'low') as SeverityLevel,
    area: issue?.area || null as InspectionArea | null,
    deadline: issue?.deadline || '',
    proof_required: issue?.proof_required || false,
  });

  const { data: units } = useUnitsByProperty(formData.property_id);
  const createIssue = useCreateIssue();
  const updateIssue = useUpdateIssue();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (isEditing && issue) {
        await updateIssue.mutateAsync({
          id: issue.id,
          ...formData,
          unit_id: formData.unit_id || null,
          area: formData.area,
        });
      } else {
        await createIssue.mutateAsync({
          ...formData,
          unit_id: formData.unit_id || null,
          area: formData.area,
          source_module: 'core',
        });
      }
      onOpenChange(false);
      resetForm();
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  const resetForm = () => {
    setFormData({
      property_id: '',
      unit_id: '',
      title: '',
      description: '',
      severity: 'low',
      area: null,
      deadline: '',
      proof_required: false,
    });
  };

  const isPending = createIssue.isPending || updateIssue.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Issue' : 'Create New Issue'}</DialogTitle>
          <DialogDescription>
            {isEditing 
              ? 'Update the issue details below.'
              : 'Enter the details for the new issue.'}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Brief description of the issue"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <VoiceDictationTextarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                onValueChange={(value) => setFormData({ ...formData, description: value })}
                placeholder="Detailed description of the issue..."
                className="min-h-[80px]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Property *</Label>
                <Select
                  value={formData.property_id}
                  onValueChange={(value) => setFormData({ ...formData, property_id: value, unit_id: '' })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select property" />
                  </SelectTrigger>
                  <SelectContent>
                    {properties?.map((property) => (
                      <SelectItem key={property.id} value={property.id}>
                        {property.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Unit (Optional)</Label>
                <Select
                  value={formData.unit_id || '__none__'}
                  onValueChange={(value) =>
                    setFormData({ ...formData, unit_id: value === '__none__' ? '' : value })
                  }
                  disabled={!formData.property_id}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select unit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {units?.map((unit) => (
                      <SelectItem key={unit.id} value={unit.id}>
                        Unit {unit.unit_number}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Severity *</Label>
                <Select
                  value={formData.severity}
                  onValueChange={(value) => setFormData({ ...formData, severity: value as SeverityLevel })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="severe">Severe (24h deadline)</SelectItem>
                    <SelectItem value="moderate">Moderate (30d deadline)</SelectItem>
                    <SelectItem value="low">Low (60d deadline)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Area</Label>
                <Select
                  value={formData.area || '__none__'}
                  onValueChange={(value) =>
                    setFormData({ ...formData, area: value === '__none__' ? null : (value as InspectionArea) })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select area" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    <SelectItem value="outside">Outside</SelectItem>
                    <SelectItem value="inside">Inside (Common)</SelectItem>
                    <SelectItem value="unit">Unit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Deadline</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !formData.deadline && 'text-muted-foreground'
                    )}
                  >
                    {formData.deadline
                      ? format(new Date(formData.deadline), 'PPP')
                      : 'Pick a date'}
                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.deadline ? new Date(formData.deadline) : undefined}
                    onSelect={(date) =>
                      setFormData({
                        ...formData,
                        deadline: date ? format(date, 'yyyy-MM-dd') : '',
                      })
                    }
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || !formData.property_id || !formData.title}>
              {isPending ? 'Saving...' : isEditing ? 'Update Issue' : 'Create Issue'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
