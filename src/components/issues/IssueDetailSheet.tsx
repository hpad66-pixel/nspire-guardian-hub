import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SeverityBadge } from '@/components/ui/severity-badge';
import { AreaBadge } from '@/components/ui/area-badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { IssueConversation } from './IssueConversation';
import { useAuth } from '@/hooks/useAuth';
import { useUpdateIssue, Issue } from '@/hooks/useIssues';
import { useUsers } from '@/hooks/useUserManagement';
import { AlertTriangle, Calendar, MapPin, User, CheckCircle2 } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

interface IssueDetailSheetProps {
  issue: Issue | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function getInitials(name: string | null | undefined, email: string | null | undefined): string {
  if (name) {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }
  if (email) {
    return email[0].toUpperCase();
  }
  return '?';
}

export function IssueDetailSheet({ issue, open, onOpenChange }: IssueDetailSheetProps) {
  const { user } = useAuth();
  const updateIssue = useUpdateIssue();
  const { data: users } = useUsers();
  
  if (!issue) return null;
  
  const isAssignedToMe = issue.assigned_to === user?.id;
  const assignedUser = users?.find(u => u.user_id === issue.assigned_to);
  const creatorUser = users?.find(u => u.user_id === issue.created_by);
  
  const handleStatusChange = (status: string) => {
    const updates: { id: string; status: string; resolved_at?: string | null } = { 
      id: issue.id, 
      status 
    };
    if (status === 'resolved') {
      updates.resolved_at = new Date().toISOString();
    } else {
      updates.resolved_at = null;
    }
    updateIssue.mutate(updates);
  };
  
  const handleAssigneeChange = (userId: string) => {
    updateIssue.mutate({ 
      id: issue.id, 
      assigned_to: userId === 'unassigned' ? null : userId 
    });
  };
  
  const handleResolve = () => {
    updateIssue.mutate({ 
      id: issue.id, 
      status: 'resolved',
      resolved_at: new Date().toISOString()
    });
  };
  
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col h-full overflow-hidden">
        <SheetHeader className="shrink-0">
          <div className="flex items-center gap-2 mb-1">
            <SeverityBadge severity={issue.severity as 'low' | 'moderate' | 'severe'} />
            {issue.area && <AreaBadge area={issue.area as 'outside' | 'inside' | 'unit'} />}
          </div>
          <SheetTitle className="text-left">{issue.title}</SheetTitle>
        </SheetHeader>
        
        <div className="flex-1 overflow-y-auto space-y-4 mt-4">
          {/* Action Required Banner */}
          {isAssignedToMe && issue.status !== 'resolved' && (
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-primary">Your Action Required</span>
              </div>
              <Button size="sm" onClick={handleResolve}>
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Mark Resolved
              </Button>
            </div>
          )}
          
          {/* Details Section */}
          <div className="space-y-3">
            <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Details</h3>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>
                  {issue.property?.name || 'Unknown property'}
                  {issue.unit?.unit_number && ` • Unit ${issue.unit.unit_number}`}
                </span>
              </div>
              
              {issue.deadline && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>Deadline: {format(new Date(issue.deadline), 'MMM d, yyyy')}</span>
                </div>
              )}
              
              {creatorUser && (
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>
                    Created by {creatorUser.full_name || creatorUser.email} 
                    {' • '}
                    {formatDistanceToNow(new Date(issue.created_at), { addSuffix: true })}
                  </span>
                </div>
              )}
            </div>
            
            {issue.description && (
              <p className="text-sm text-muted-foreground">{issue.description}</p>
            )}
          </div>
          
          <Separator />
          
          {/* Status & Assignment */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase">Status</label>
              <Select value={issue.status || 'open'} onValueChange={handleStatusChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase">Assigned To</label>
              <Select 
                value={issue.assigned_to || 'unassigned'} 
                onValueChange={handleAssigneeChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {users?.map((u) => (
                    <SelectItem key={u.user_id} value={u.user_id}>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={u.avatar_url || undefined} />
                          <AvatarFallback className="text-xs">
                            {getInitials(u.full_name, u.email)}
                          </AvatarFallback>
                        </Avatar>
                        {u.full_name || u.email}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Current Assignee Display */}
          {assignedUser && (
            <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
              <Avatar className="h-6 w-6">
                <AvatarImage src={assignedUser.avatar_url || undefined} />
                <AvatarFallback className="text-xs">
                  {getInitials(assignedUser.full_name, assignedUser.email)}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm">
                Assigned to <strong>{assignedUser.full_name || assignedUser.email}</strong>
              </span>
            </div>
          )}
          
          <Separator />
          
          {/* Conversation */}
          <div className="flex-1 min-h-[200px]">
            <IssueConversation issueId={issue.id} />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
