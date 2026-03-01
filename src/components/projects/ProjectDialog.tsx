import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { VoiceDictationTextareaWithAI } from '@/components/ui/voice-dictation-textarea-ai';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building2, Briefcase, Home, Shield, Globe, Plus, Loader2 } from 'lucide-react';
import { useProperties } from '@/hooks/useProperties';
import { useCreateProject, useUpdateProject } from '@/hooks/useProjects';
import { useActiveClients, useCreateClient } from '@/hooks/useClients';
import type { Database } from '@/integrations/supabase/types';

type ProjectRow = Database['public']['Tables']['projects']['Row'];

interface ProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project?: ProjectRow | null;
}

type ProjectType = 'property' | 'client';

export function ProjectDialog({ open, onOpenChange, project }: ProjectDialogProps) {
  const isEditing = !!project;

  // Determine initial type from existing project
  const initialType: ProjectType =
    project && (project as any).project_type === 'client' ? 'client' : 'property';

  const { data: properties } = useProperties();
  const { data: clients } = useActiveClients();

  const [projectType, setProjectType] = useState<ProjectType>(initialType);
  const [showAddClient, setShowAddClient] = useState(false);
  const [newClientName, setNewClientName] = useState('');

  const [formData, setFormData] = useState({
    property_id: project?.property_id || '',
    client_id: (project as any)?.client_id || '',
    name: project?.name || '',
    description: project?.description || '',
    budget: project?.budget ? Number(project.budget) : undefined as number | undefined,
    start_date: project?.start_date || '',
    target_end_date: project?.target_end_date || '',
  });

  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const createClient = useCreateClient();

  const handleAddClient = async () => {
    if (!newClientName.trim()) return;
    try {
      const created = await createClient.mutateAsync({ name: newClientName.trim(), client_type: 'business_client', contact_name: null, contact_email: null, contact_phone: null, website: null, address: null, city: null, state: null, industry: null, notes: null, is_active: true });
      setFormData(prev => ({ ...prev, client_id: created.id }));
      setNewClientName('');
      setShowAddClient(false);
    } catch {
      // error handled by mutation
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload: any = {
      name: formData.name,
      description: formData.description,
      budget: formData.budget || null,
      start_date: formData.start_date || null,
      target_end_date: formData.target_end_date || null,
      project_type: projectType,
      // Clear whichever is not in use
      property_id: projectType === 'property' ? formData.property_id || null : null,
      client_id: projectType === 'client' ? formData.client_id || null : null,
    };

    try {
      if (isEditing && project) {
        await updateProject.mutateAsync({ id: project.id, ...payload });
      } else {
        await createProject.mutateAsync(payload);
      }
      onOpenChange(false);
      resetForm();
    } catch {
      // Error handled by mutation
    }
  };

  const resetForm = () => {
    setFormData({ property_id: '', client_id: '', name: '', description: '', budget: undefined, start_date: '', target_end_date: '' });
    setProjectType('property');
    setShowAddClient(false);
    setNewClientName('');
  };

  const isPropertyValid = projectType === 'property' ? !!formData.property_id : true;
  const isClientValid = projectType === 'client' ? !!formData.client_id : true;
  const canSubmit = !!formData.name && isPropertyValid && isClientValid;
  const isPending = createProject.isPending || updateProject.isPending;

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) resetForm(); }}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Project' : 'Create New Project'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Update the project details below.' : 'Enter the details for the new project.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Project Type Toggle */}
          <div className="grid gap-2">
            <Label>Project Type</Label>
            <Tabs value={projectType} onValueChange={(v) => setProjectType(v as ProjectType)}>
              <TabsList className="w-full">
                <TabsTrigger value="property" className="flex-1 gap-1.5">
                  <Building2 className="h-3.5 w-3.5" />
                  Property Project
                </TabsTrigger>
                <TabsTrigger value="client" className="flex-1 gap-1.5">
                  <Briefcase className="h-3.5 w-3.5" />
                  Client / Standalone
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Project Name */}
          <div className="grid gap-2">
            <Label htmlFor="name">Project Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder={projectType === 'property' ? 'e.g. Roof Replacement Phase 2' : 'e.g. ERC Tax Credit 2024'}
              required
            />
          </div>

          {/* Property or Client selector */}
          {projectType === 'property' ? (
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
                  {properties?.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="grid gap-2">
              <Label>Client *</Label>
              {showAddClient ? (
                <div className="flex gap-2">
                  <Input
                    placeholder="Client / company name"
                    value={newClientName}
                    onChange={(e) => setNewClientName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddClient(); } }}
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleAddClient}
                    disabled={createClient.isPending || !newClientName.trim()}
                  >
                    {createClient.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add'}
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setShowAddClient(false)}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Select
                    value={formData.client_id}
                    onValueChange={(value) => setFormData({ ...formData, client_id: value })}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select client (required)" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients?.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          <span className="flex items-center gap-2">
                            {c.client_type === 'internal_org' && <Building2 className="h-3 w-3 text-muted-foreground" />}
                            {c.client_type === 'business_client' && <Briefcase className="h-3 w-3 text-muted-foreground" />}
                            {c.client_type === 'property_management' && <Home className="h-3 w-3 text-muted-foreground" />}
                            {c.client_type === 'government' && <Shield className="h-3 w-3 text-muted-foreground" />}
                            {c.client_type === 'other' && <Globe className="h-3 w-3 text-muted-foreground" />}
                            {c.name}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button type="button" size="sm" variant="outline" onClick={() => setShowAddClient(true)}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Leave blank to create an internal / standalone project with no client dependency.
              </p>
            </div>
          )}

          {/* Description */}
          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <VoiceDictationTextareaWithAI
              id="description"
              value={formData.description}
              onValueChange={(val) => setFormData({ ...formData, description: val })}
              placeholder="Brief description of the project..."
              rows={2}
              context="description"
            />
          </div>

          {/* Budget */}
          <div className="grid gap-2">
            <Label htmlFor="budget">Budget</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
              <Input
                id="budget"
                type="text"
                inputMode="decimal"
                className="pl-7"
                value={formData.budget ? new Intl.NumberFormat('en-US').format(formData.budget) : ''}
                onChange={(e) => {
                  const raw = e.target.value.replace(/[^0-9.]/g, '');
                  setFormData({ ...formData, budget: raw ? parseFloat(raw) : undefined });
                }}
                placeholder="e.g. 450,000"
              />
            </div>
          </div>

          {/* Dates */}
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

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || !canSubmit}>
              {isPending ? 'Saving...' : isEditing ? 'Update Project' : 'Create Project'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
