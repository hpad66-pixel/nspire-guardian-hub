import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { VoiceDictationTextareaWithAI } from '@/components/ui/voice-dictation-textarea-ai';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building2, Briefcase, Home, Shield, Globe, Plus, Loader2, Lightbulb, HardHat, LockKeyhole } from 'lucide-react';
import { useProperties } from '@/hooks/useProperties';
import { useCreateProject, useUpdateProject } from '@/hooks/useProjects';
import { useActiveClients, useCreateClient } from '@/hooks/useClients';
import type { Database } from '@/integrations/supabase/types';
import { z } from 'zod';

type ProjectRow = Database['public']['Tables']['projects']['Row'];

// #7: a bare <input type="date"> happily accepts a mistyped 2-digit year
// (e.g. "0025"), which Postgres stores as ISO year 0025. Refine the year
// to a sane 1900-2100 window. Empty string is allowed (date is optional).
const projectDateSchema = z
  .string()
  .refine(
    (s) => {
      if (!s) return true;
      const year = Number(s.slice(0, 4));
      return Number.isInteger(year) && year >= 1900 && year <= 2100;
    },
    { message: 'Dates must fall between the years 1900 and 2100.' },
  );

interface ProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project?: ProjectRow | null;
  // When set, the dialog creates a SUBPROJECT under this parent: it inherits the
  // parent's type + client/property and links parent_project_id on save.
  parentProject?: ProjectRow | null;
  // When opened from a client record, lock project ownership to that client.
  // The user can choose construction or consulting, but cannot move the new
  // project into another organization through this workflow.
  clientContext?: { id: string; name: string } | null;
  onCreated?: (project: ProjectRow) => void;
}

type ProjectType = 'property' | 'client' | 'construction' | 'consulting';

export function ProjectDialog({ open, onOpenChange, project, parentProject, clientContext, onCreated }: ProjectDialogProps) {
  const isEditing = !!project;
  const isSubproject = !isEditing && !!parentProject;
  const isClientScoped = !isEditing && !isSubproject && !!clientContext;

  // Determine initial type from existing project, or inherit the parent's.
  const existingType = project ? (project as any).project_type : (parentProject ? (parentProject as any).project_type : null);
  const initialType: ProjectType =
    isClientScoped
      ? 'construction'
      : existingType === 'client' || existingType === 'consulting' || existingType === 'construction'
        ? existingType
        : 'property';

  const { data: properties } = useProperties();
  const { data: clients } = useActiveClients();

  const [projectType, setProjectType] = useState<ProjectType>(initialType);
  const [showAddClient, setShowAddClient] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [dateError, setDateError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    property_id: project?.property_id || parentProject?.property_id || '',
    client_id: (project as any)?.client_id || (parentProject as any)?.client_id || clientContext?.id || '',
    name: project?.name || '',
    description: project?.description || '',
    scope: project?.scope || '',
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

    const startCheck = projectDateSchema.safeParse(formData.start_date);
    const endCheck = projectDateSchema.safeParse(formData.target_end_date);
    if (!startCheck.success || !endCheck.success) {
      setDateError(
        (startCheck.success ? endCheck : startCheck).error.issues[0].message,
      );
      return;
    }
    setDateError(null);

    const payload: any = {
      name: formData.name,
      description: formData.description,
      scope: formData.scope,
      budget: formData.budget || null,
      start_date: formData.start_date || null,
      target_end_date: formData.target_end_date || null,
      project_type: projectType,
      // Clear whichever is not in use. Consulting engagements are client-linked
      // (or standalone/internal) like the 'client' type — never property-linked.
      property_id: projectType === 'property' ? formData.property_id || null : null,
      client_id: projectType !== 'property' ? clientContext?.id || formData.client_id || null : null,
    };
    if (isSubproject && parentProject) payload.parent_project_id = parentProject.id;

    try {
      if (isEditing && project) {
        await updateProject.mutateAsync({ id: project.id, ...payload });
      } else {
        const created = await createProject.mutateAsync(payload);
        onCreated?.(created as ProjectRow);
      }
      onOpenChange(false);
      resetForm();
    } catch {
      // Error handled by mutation
    }
  };

  const resetForm = () => {
    setFormData({ property_id: '', client_id: clientContext?.id || '', name: '', description: '', scope: '', budget: undefined, start_date: '', target_end_date: '' });
    setProjectType(isClientScoped ? 'construction' : 'property');
    setShowAddClient(false);
    setNewClientName('');
    setDateError(null);
  };

  const isPropertyValid = projectType === 'property' ? !!formData.property_id : true;
  const requiresClient = isClientScoped || projectType === 'client' || projectType === 'construction';
  const isClientValid = requiresClient ? !!(clientContext?.id || formData.client_id) : true;
  const canSubmit = !!formData.name && isPropertyValid && isClientValid;
  const isPending = createProject.isPending || updateProject.isPending;

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) resetForm(); }}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Project' : isSubproject ? 'Add Subproject' : isClientScoped ? `Create a project for ${clientContext?.name}` : 'Create New Project'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the project details below.'
              : isSubproject
                ? `A subproject of ${parentProject?.name} — its own scope, schedule, and budget, rolled up to the parent.`
                : isClientScoped
                  ? 'This project will be securely contained within this client account and visible to its authorized team.'
                  : 'Enter the details for the new project.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Project Type Toggle */}
          <div className="grid gap-2">
            <Label>Project Type</Label>
            <Tabs value={projectType} onValueChange={(v) => setProjectType(v as ProjectType)}>
              <TabsList className="w-full">
                {isClientScoped ? (
                  <TabsTrigger value="construction" className="flex-1 gap-1.5">
                    <HardHat className="h-3.5 w-3.5" />
                    Construction
                  </TabsTrigger>
                ) : (
                  <>
                    <TabsTrigger value="property" className="flex-1 gap-1.5">
                      <Building2 className="h-3.5 w-3.5" />
                      Property
                    </TabsTrigger>
                    <TabsTrigger value="client" className="flex-1 gap-1.5">
                      <Briefcase className="h-3.5 w-3.5" />
                      Client
                    </TabsTrigger>
                  </>
                )}
                <TabsTrigger value="consulting" className="flex-1 gap-1.5">
                  <Lightbulb className="h-3.5 w-3.5" />
                  Consulting
                </TabsTrigger>
              </TabsList>
            </Tabs>
            {projectType === 'consulting' && (
              <p className="text-xs text-muted-foreground">
                A consulting engagement — scope, action items, meetings, and invoicing, without the construction modules. You can fine-tune what shows under Modules.
              </p>
            )}
          </div>

          {/* Project Name */}
          <div className="grid gap-2">
            <Label htmlFor="name">Project Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder={projectType === 'property' || projectType === 'construction' ? 'e.g. Roof Replacement Phase 2' : 'e.g. ERC Tax Credit 2024'}
              required
            />
          </div>

          {/* Property or Client selector */}
          {isClientScoped ? (
            <div className="grid gap-2">
              <Label>Client account</Label>
              <div className="flex items-center justify-between rounded-lg border bg-muted/40 px-3 py-2.5">
                <span className="flex min-w-0 items-center gap-2 text-sm font-medium">
                  <Briefcase className="h-4 w-4 shrink-0 text-primary" />
                  <span className="truncate">{clientContext?.name}</span>
                </span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <LockKeyhole className="h-3.5 w-3.5" />Locked
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Ownership is fixed to this client to prevent accidental cross-client records.
              </p>
            </div>
          ) : projectType === 'property' ? (
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

          {/* Scope */}
          <div className="grid gap-2">
            <Label htmlFor="scope">Scope</Label>
            <VoiceDictationTextareaWithAI
              id="scope"
              value={formData.scope}
              onValueChange={(val) => setFormData({ ...formData, scope: val })}
              placeholder="Detailed scope of work..."
              rows={3}
              context="scope"
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
                min="1900-01-01"
                max="2100-12-31"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Target End Date</Label>
              <Input
                type="date"
                min="1900-01-01"
                max="2100-12-31"
                value={formData.target_end_date}
                onChange={(e) => setFormData({ ...formData, target_end_date: e.target.value })}
              />
            </div>
          </div>
          {dateError && (
            <p className="text-sm text-[var(--apas-rose)]">{dateError}</p>
          )}

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
