import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useProperties } from '@/hooks/useProperties';
import { useCreateProject, useUpdateProject } from '@/hooks/useProjects';
import type { Database } from '@/integrations/supabase/types';

type ProjectRow = Database['public']['Tables']['projects']['Row'];

interface ProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project?: ProjectRow | null;
}

export function ProjectDialog({ open, onOpenChange, project }: ProjectDialogProps) {
  const isEditing = !!project;
  const { data: properties } = useProperties();
  
  const [formData, setFormData] = useState({
    property_id: project?.property_id || '',
    name: project?.name || '',
    description: project?.description || '',
    scope: project?.scope || '',
    budget: project?.budget ? Number(project.budget) : undefined as number | undefined,
    start_date: project?.start_date || '',
    target_end_date: project?.target_end_date || '',
  });

  const createProject = useCreateProject();
  const updateProject = useUpdateProject();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (isEditing && project) {
        await updateProject.mutateAsync({
          id: project.id,
          ...formData,
          budget: formData.budget || null,
          start_date: formData.start_date || null,
          target_end_date: formData.target_end_date || null,
        });
      } else {
        await createProject.mutateAsync({
          ...formData,
          budget: formData.budget || null,
          start_date: formData.start_date || null,
          target_end_date: formData.target_end_date || null,
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
      name: '',
      description: '',
      scope: '',
      budget: undefined,
      start_date: '',
      target_end_date: '',
    });
  };

  const isPending = createProject.isPending || updateProject.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Project' : 'Create New Project'}</DialogTitle>
          <DialogDescription>
            {isEditing 
              ? 'Update the project details below.'
              : 'Enter the details for the new project.'}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Project Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Roof Replacement Phase 2"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label>Property *</Label>
              <Select
                value={formData.property_id}
                onValueChange={(value) => setFormData({ ...formData, property_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select property" />
                </SelectTrigger>
                <SelectContent>
                  {properties?.filter(p => p.projects_enabled).map((property) => (
                    <SelectItem key={property.id} value={property.id}>
                      {property.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of the project..."
                rows={2}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="scope">Scope</Label>
              <Textarea
                id="scope"
                value={formData.scope}
                onChange={(e) => setFormData({ ...formData, scope: e.target.value })}
                placeholder="Detailed scope of work..."
                rows={3}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="budget">Budget</Label>
              <Input
                id="budget"
                type="number"
                min="0"
                step="0.01"
                value={formData.budget || ''}
                onChange={(e) => setFormData({ ...formData, budget: parseFloat(e.target.value) || undefined })}
                placeholder="e.g. 450000"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label>Target End Date</Label>
                <Input
                  type="date"
                  value={formData.target_end_date}
                  onChange={(e) => setFormData({ ...formData, target_end_date: e.target.value })}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || !formData.property_id || !formData.name}>
              {isPending ? 'Saving...' : isEditing ? 'Update Project' : 'Create Project'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
