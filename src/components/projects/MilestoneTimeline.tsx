import { useState } from 'react';
import { format, isPast, isToday } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertTriangle,
  Calendar,
  Check,
  CheckCircle2,
  Circle,
  Clock,
  Loader2,
  MoreHorizontal,
  Plus,
  Trash2,
  Edit,
  UserCircle,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useCompleteMilestone, useUpdateMilestone, useDeleteMilestone } from '@/hooks/useMilestones';
import { useProjectTeamMembers } from '@/hooks/useProjectTeam';
import { MilestoneDialog } from './MilestoneDialog';
import type { Database } from '@/integrations/supabase/types';
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

type MilestoneRow = Database['public']['Tables']['project_milestones']['Row'];

interface MilestoneTimelineProps {
  projectId: string;
  milestones: MilestoneRow[];
}

const statusConfig = {
  pending: {
    icon: Circle,
    color: 'text-muted-foreground',
    bgColor: 'bg-muted',
    label: 'Pending',
  },
  in_progress: {
    icon: Loader2,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    label: 'In Progress',
  },
  completed: {
    icon: CheckCircle2,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    label: 'Completed',
  },
  overdue: {
    icon: AlertTriangle,
    color: 'text-destructive',
    bgColor: 'bg-destructive/10',
    label: 'Overdue',
  },
};

export function MilestoneTimeline({ projectId, milestones }: MilestoneTimelineProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<MilestoneRow | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [milestoneToDelete, setMilestoneToDelete] = useState<string | null>(null);

  const completeMutation = useCompleteMilestone();
  const updateMutation = useUpdateMilestone();
  const deleteMutation = useDeleteMilestone();
  const { data: teamMembers } = useProjectTeamMembers(projectId);

  const getAssigneeName = (userId: string | null) => {
    if (!userId || !teamMembers) return null;
    const member = teamMembers.find(m => m.user_id === userId);
    return member?.profile ?? null;
  };

  const getMilestoneStatus = (milestone: MilestoneRow) => {
    if (milestone.status === 'completed') return 'completed';
    if (milestone.status === 'in_progress') return 'in_progress';
    if (isPast(new Date(milestone.due_date)) && !isToday(new Date(milestone.due_date))) {
      return 'overdue';
    }
    return 'pending';
  };

  const handleComplete = (id: string) => {
    completeMutation.mutate(id);
  };

  const handleStartProgress = (id: string) => {
    updateMutation.mutate({ id, status: 'in_progress' });
  };

  const handleDelete = () => {
    if (milestoneToDelete) {
      deleteMutation.mutate(milestoneToDelete, {
        onSuccess: () => {
          setDeleteDialogOpen(false);
          setMilestoneToDelete(null);
        },
      });
    }
  };

  const handleEdit = (milestone: MilestoneRow) => {
    setEditingMilestone(milestone);
    setDialogOpen(true);
  };

  const sortedMilestones = [...milestones].sort(
    (a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Project Milestones</CardTitle>
            <CardDescription>Track project phases and deliverables</CardDescription>
          </div>
          <Button onClick={() => { setEditingMilestone(null); setDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Add Milestone
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {sortedMilestones.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No milestones defined yet</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => { setEditingMilestone(null); setDialogOpen(true); }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add First Milestone
            </Button>
          </div>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border" />

            <div className="space-y-6">
              {sortedMilestones.map((milestone, index) => {
                const status = getMilestoneStatus(milestone);
                const config = statusConfig[status];
                const Icon = config.icon;
                const isCompleting = completeMutation.isPending;

                return (
                  <div key={milestone.id} className="relative flex gap-4">
                    {/* Status icon */}
                    <div
                      className={`relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 ${config.bgColor} border-background`}
                    >
                      <Icon
                        className={`h-5 w-5 ${config.color} ${status === 'in_progress' ? 'animate-spin' : ''}`}
                      />
                    </div>

                    {/* Content */}
                    <div className="flex-1 pt-1.5">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold">{milestone.name}</h4>
                            <Badge variant="outline" className={`text-xs ${config.color}`}>
                              {config.label}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>
                              {status === 'completed' && milestone.completed_at
                                ? `Completed ${format(new Date(milestone.completed_at), 'MMM d, yyyy')}`
                                : `Due ${format(new Date(milestone.due_date), 'MMM d, yyyy')}`}
                            </span>
                          </div>
                          {milestone.notes && (
                            <p className="mt-2 text-sm text-muted-foreground">{milestone.notes}</p>
                          )}
                          {(() => {
                            const assignee = getAssigneeName(milestone.assigned_to);
                            const collabIds: string[] = (milestone as any).collaborator_ids || [];
                            const hasAssignee = !!assignee;
                            const hasCollabs = collabIds.length > 0;
                            if (!hasAssignee && !hasCollabs) return null;

                            return (
                              <div className="flex items-center gap-2 mt-2 flex-wrap">
                                {hasAssignee && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div className="flex items-center gap-1.5">
                                        <Avatar className="h-5 w-5 ring-2 ring-primary/30">
                                          <AvatarImage src={assignee.avatar_url || undefined} />
                                          <AvatarFallback className="text-[9px]">
                                            {(assignee.full_name || assignee.email || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                                          </AvatarFallback>
                                        </Avatar>
                                        <span className="text-xs font-medium">
                                          {assignee.full_name || assignee.email}
                                        </span>
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom" className="text-xs">
                                      Assignee: {assignee.full_name || assignee.email}
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                                {hasCollabs && (
                                  <div className="flex items-center -space-x-1.5">
                                    {collabIds.map(uid => {
                                      const cp = getAssigneeName(uid);
                                      const name = cp?.full_name || cp?.email || '?';
                                      const ci = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
                                      return (
                                        <Tooltip key={uid}>
                                          <TooltipTrigger asChild>
                                            <Avatar className="h-5 w-5 border-2 border-background">
                                              <AvatarImage src={cp?.avatar_url || undefined} />
                                              <AvatarFallback className="text-[8px]">{ci}</AvatarFallback>
                                            </Avatar>
                                          </TooltipTrigger>
                                          <TooltipContent side="bottom" className="text-xs">
                                            Collaborator: {name}
                                          </TooltipContent>
                                        </Tooltip>
                                      );
                                    })}
                                    {collabIds.length > 0 && (
                                      <span className="text-[10px] text-muted-foreground ml-2">
                                        +{collabIds.length} collaborator{collabIds.length > 1 ? 's' : ''}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </div>

                        <div className="flex items-center gap-2">
                          {status !== 'completed' && (
                            <>
                              {status === 'pending' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleStartProgress(milestone.id)}
                                  disabled={updateMutation.isPending}
                                >
                                  Start
                                </Button>
                              )}
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => handleComplete(milestone.id)}
                                disabled={isCompleting}
                              >
                                <Check className="h-4 w-4 mr-1" />
                                Complete
                              </Button>
                            </>
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEdit(milestone)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setMilestoneToDelete(milestone.id);
                                  setDeleteDialogOpen(true);
                                }}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>

      <MilestoneDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingMilestone(null);
        }}
        projectId={projectId}
        milestone={editingMilestone}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Milestone</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this milestone? This action cannot be undone.
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
    </Card>
  );
}
