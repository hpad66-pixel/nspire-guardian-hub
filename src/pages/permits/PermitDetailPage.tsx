import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { 
  ArrowLeft, 
  Edit, 
  Trash2, 
  FileText, 
  Plus,
  Calendar,
  Building2,
  MapPin,
  Hash,
  ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { usePermit, useDeletePermit } from '@/hooks/usePermits';
import { useRequirementsByPermit } from '@/hooks/usePermitRequirements';
import { useProfiles } from '@/hooks/useProfiles';
import { PermitDialog } from '@/components/permits/PermitDialog';
import { RequirementCard } from '@/components/permits/RequirementCard';
import { RequirementDialog } from '@/components/permits/RequirementDialog';
import { DeliverableDialog } from '@/components/permits/DeliverableDialog';
import { cn } from '@/lib/utils';
import type { PermitDeliverable } from '@/hooks/usePermitDeliverables';

const statusColors: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  active: 'bg-success/10 text-success',
  expired: 'bg-destructive/10 text-destructive',
  renewed: 'bg-primary/10 text-primary',
  revoked: 'bg-destructive/10 text-destructive',
};

export default function PermitDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isRequirementDialogOpen, setIsRequirementDialogOpen] = useState(false);
  const [isDeliverableDialogOpen, setIsDeliverableDialogOpen] = useState(false);
  const [selectedRequirement, setSelectedRequirement] = useState<any>(null);
  const [selectedRequirementForDeliverable, setSelectedRequirementForDeliverable] = useState<string | null>(null);
  const [selectedDeliverable, setSelectedDeliverable] = useState<PermitDeliverable | null>(null);

  const { data: permit, isLoading } = usePermit(id || null);
  const { data: requirements } = useRequirementsByPermit(id || null);
  const { data: profiles } = useProfiles();
  const deletePermit = useDeletePermit();

  const handleDelete = async () => {
    if (!id) return;
    await deletePermit.mutateAsync(id);
    navigate('/permits');
  };

  const handleEditRequirement = (requirement: any) => {
    setSelectedRequirement(requirement);
    setIsRequirementDialogOpen(true);
  };

  const handleAddDeliverable = (requirementId: string) => {
    setSelectedRequirementForDeliverable(requirementId);
    setSelectedDeliverable(null);
    setIsDeliverableDialogOpen(true);
  };

  const handleDeliverableClick = (deliverable: PermitDeliverable) => {
    setSelectedDeliverable(deliverable);
    setSelectedRequirementForDeliverable(deliverable.requirement_id);
    setIsDeliverableDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="h-64 bg-muted animate-pulse rounded-lg" />
      </div>
    );
  }

  if (!permit) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold">Permit not found</h2>
        <Button className="mt-4" onClick={() => navigate('/permits')}>
          Back to Permits
        </Button>
      </div>
    );
  }

  const compliantRequirements = requirements?.filter(r => r.status === 'compliant').length || 0;
  const totalRequirements = requirements?.length || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate('/permits')}
            className="mb-2 -ml-2"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Permits
          </Button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{permit.name}</h1>
            <Badge 
              variant="secondary" 
              className={cn("capitalize", statusColors[permit.status])}
            >
              {permit.status}
            </Badge>
          </div>
          {permit.permit_number && (
            <p className="text-muted-foreground flex items-center gap-1">
              <Hash className="h-4 w-4" />
              {permit.permit_number}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setIsEditDialogOpen(true)}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button variant="destructive" onClick={() => setIsDeleteDialogOpen(true)}>
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      {/* Info Card */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Property</p>
              <p className="font-medium flex items-center gap-1">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                {(permit as any).properties?.name || 'N/A'}
              </p>
              {(permit as any).properties?.address && (
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <MapPin className="h-3 w-3" />
                  {(permit as any).properties.city}, {(permit as any).properties.state}
                </p>
              )}
            </div>

            <div>
              <p className="text-sm text-muted-foreground mb-1">Issuing Authority</p>
              <p className="font-medium">{permit.issuing_authority || 'N/A'}</p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground mb-1">Issue Date</p>
              <p className="font-medium flex items-center gap-1">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                {permit.issue_date 
                  ? format(new Date(permit.issue_date), 'MMM d, yyyy')
                  : 'N/A'}
              </p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground mb-1">Expiry Date</p>
              <p className="font-medium flex items-center gap-1">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                {permit.expiry_date 
                  ? format(new Date(permit.expiry_date), 'MMM d, yyyy')
                  : 'N/A'}
              </p>
            </div>
          </div>

          {permit.description && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm text-muted-foreground mb-1">Description</p>
              <p className="text-sm">{permit.description}</p>
            </div>
          )}

          {(permit as any).document && (
            <div className="mt-4 pt-4 border-t">
              <Button variant="outline" size="sm" asChild>
                <a 
                  href={(permit as any).document.file_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  View Permit Document
                  <ExternalLink className="h-3 w-3 ml-2" />
                </a>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="requirements">
        <TabsList>
          <TabsTrigger value="requirements">
            Requirements ({totalRequirements})
          </TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
        </TabsList>

        <TabsContent value="requirements" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                {compliantRequirements} of {totalRequirements} requirements compliant
              </p>
            </div>
            <Button onClick={() => {
              setSelectedRequirement(null);
              setIsRequirementDialogOpen(true);
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Requirement
            </Button>
          </div>

          {requirements?.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium">No requirements yet</h3>
                <p className="text-muted-foreground mt-1">
                  Add requirements to track compliance tasks for this permit
                </p>
                <Button className="mt-4" onClick={() => {
                  setSelectedRequirement(null);
                  setIsRequirementDialogOpen(true);
                }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Requirement
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {requirements?.map((requirement) => {
                const responsibleUser = profiles?.find(
                  p => p.user_id === requirement.responsible_user_id
                );
                
                return (
                  <RequirementCard
                    key={requirement.id}
                    requirement={requirement}
                    responsibleUser={responsibleUser}
                    onEdit={() => handleEditRequirement(requirement)}
                    onAddDeliverable={() => handleAddDeliverable(requirement.id)}
                    onDeliverableClick={handleDeliverableClick}
                  />
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="notes">
          <Card>
            <CardContent className="p-6">
              {permit.notes ? (
                <p className="whitespace-pre-wrap">{permit.notes}</p>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  No notes added yet
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <PermitDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        permit={permit}
      />

      {id && (
        <RequirementDialog
          open={isRequirementDialogOpen}
          onOpenChange={setIsRequirementDialogOpen}
          permitId={id}
          requirement={selectedRequirement}
        />
      )}

      {selectedRequirementForDeliverable && (
        <DeliverableDialog
          open={isDeliverableDialogOpen}
          onOpenChange={setIsDeliverableDialogOpen}
          requirementId={selectedRequirementForDeliverable}
          deliverable={selectedDeliverable}
        />
      )}

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Permit</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{permit.name}"? This will also delete all 
              associated requirements and deliverables. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
