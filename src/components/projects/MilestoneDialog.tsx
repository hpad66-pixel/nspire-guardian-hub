import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { CalendarIcon, X, UserPlus, Search } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useCreateMilestone, useUpdateMilestone } from '@/hooks/useMilestones';
import { useProjectTeamMembers } from '@/hooks/useProjectTeam';
import { ProjectTeamAssignSelect } from './ProjectTeamAssignSelect';
import type { Database } from '@/integrations/supabase/types';
import { toast } from 'sonner';

type MilestoneRow = Database['public']['Tables']['project_milestones']['Row'];

const formSchema = z.object({
  name: z.string().min(1, 'Milestone name is required'),
  due_date: z.date({ required_error: 'Due date is required' }),
  status: z.string().default('pending'),
  assigned_to: z.string().nullable().optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface MilestoneDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  milestone?: MilestoneRow | null;
}

export function MilestoneDialog({ open, onOpenChange, projectId, milestone }: MilestoneDialogProps) {
  const createMutation = useCreateMilestone();
  const updateMutation = useUpdateMilestone();
  const isEditing = !!milestone;
  const { data: teamMembers = [] } = useProjectTeamMembers(projectId);

  // Collaborator state (managed outside react-hook-form since it's a uuid[])
  const [collaboratorIds, setCollaboratorIds] = useState<string[]>([]);
  const [showCollabSearch, setShowCollabSearch] = useState(false);
  const [collabSearch, setCollabSearch] = useState('');

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      status: 'pending',
      assigned_to: null,
      notes: '',
    },
  });

  useEffect(() => {
    if (milestone) {
      form.reset({
        name: milestone.name,
        due_date: new Date(milestone.due_date),
        status: milestone.status,
        assigned_to: milestone.assigned_to || null,
        notes: milestone.notes || '',
      });
      setCollaboratorIds((milestone as any).collaborator_ids || []);
    } else {
      form.reset({
        name: '',
        status: 'pending',
        assigned_to: null,
        notes: '',
      });
      setCollaboratorIds([]);
    }
  }, [milestone, form]);

  const onSubmit = (data: FormData) => {
    const payload: any = {
      name: data.name,
      due_date: format(data.due_date, 'yyyy-MM-dd'),
      status: data.status,
      assigned_to: data.assigned_to || null,
      collaborator_ids: collaboratorIds,
      notes: data.notes || null,
      project_id: projectId,
    };

    if (isEditing) {
      updateMutation.mutate(
        { id: milestone.id, ...payload },
        { onSuccess: () => onOpenChange(false) }
      );
    } else {
      createMutation.mutate(payload, { onSuccess: () => onOpenChange(false) });
    }
  };

  // Watch assigned_to reactively so collaborator list excludes assignee
  const watchedAssignee = useWatch({ control: form.control, name: 'assigned_to' });

  // Only show project team members (not all workspace users) as collaborator options
  const availableCollaborators = teamMembers.filter(
    m => !collaboratorIds.includes(m.user_id) && m.user_id !== watchedAssignee
  );

  const getProfile = (userId: string) => {
    const member = teamMembers.find(m => m.user_id === userId);
    return member?.profile ?? null;
  };

  const removeCollaborator = (userId: string) => {
    setCollaboratorIds(prev => prev.filter(id => id !== userId));
  };

  const addCollaborator = (userId: string) => {
    if (!collaboratorIds.includes(userId)) {
      setCollaboratorIds(prev => [...prev, userId]);
    }
    setShowCollabSearch(false);
    setCollabSearch('');
  };

  // Filter available collaborators by search text
  const filteredCollaborators = collabSearch
    ? availableCollaborators.filter(m => {
        const s = collabSearch.toLowerCase();
        return (m.profile?.full_name?.toLowerCase().includes(s) || m.profile?.email?.toLowerCase().includes(s));
      })
    : availableCollaborators;

  const initials = (name: string | null | undefined) =>
    (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Milestone' : 'Add Milestone'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Update milestone details' : 'Create a new project milestone'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Milestone Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Foundation Complete" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="due_date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Due Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            'w-full pl-3 text-left font-normal',
                            !field.value && 'text-muted-foreground'
                          )}
                        >
                          {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Assignee (single owner) */}
            <FormField
              control={form.control}
              name="assigned_to"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assignee</FormLabel>
                  <FormControl>
                    <ProjectTeamAssignSelect
                      projectId={projectId}
                      value={field.value}
                      onValueChange={(val) => field.onChange(val)}
                      useSentinel
                      placeholder="Who owns this milestone?"
                    />
                  </FormControl>
                  <p className="text-[11px] text-muted-foreground mt-1">Primary person responsible</p>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Collaborators (multi-select) */}
            <div className="space-y-2">
              <FormLabel>Collaborators</FormLabel>
              <p className="text-[11px] text-muted-foreground">Others who should be tagged and notified</p>
              
              {/* Tags for selected collaborators */}
              {collaboratorIds.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {collaboratorIds.map(uid => {
                    const profile = getProfile(uid);
                    return (
                      <Badge key={uid} variant="secondary" className="gap-1 pr-1 text-xs">
                        <Avatar className="h-4 w-4">
                          <AvatarImage src={profile?.avatar_url ?? undefined} />
                          <AvatarFallback className="text-[8px]">{initials(profile?.full_name)}</AvatarFallback>
                        </Avatar>
                        {profile?.full_name || profile?.email || 'Unknown'}
                        <button
                          type="button"
                          onClick={() => removeCollaborator(uid)}
                          className="ml-0.5 rounded-full p-0.5 hover:bg-muted-foreground/20"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    );
                  })}
                </div>
              )}

              {/* Add collaborator search */}
              {showCollabSearch ? (
                <div className="rounded-md border p-2 bg-background space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-muted-foreground">Add collaborator from project team</p>
                    <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => { setShowCollabSearch(false); setCollabSearch(''); }}>
                      Done
                    </Button>
                  </div>

                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={collabSearch}
                      onChange={e => setCollabSearch(e.target.value)}
                      placeholder="Filter team members..."
                      className="h-8 pl-7 text-xs"
                      autoFocus
                    />
                  </div>

                  <div className="max-h-36 overflow-y-auto space-y-0.5">
                    {filteredCollaborators.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-2 text-center">
                        {availableCollaborators.length === 0
                          ? 'All team members are already added. Use the Assignee field to add new people to the project.'
                          : 'No matching team members'}
                      </p>
                    ) : (
                      filteredCollaborators.map(m => (
                        <button
                          key={m.user_id}
                          type="button"
                          onClick={() => addCollaborator(m.user_id)}
                          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs hover:bg-accent transition-colors text-left"
                        >
                          <Avatar className="h-5 w-5">
                            <AvatarImage src={m.profile?.avatar_url ?? undefined} />
                            <AvatarFallback className="text-[9px]">{initials(m.profile?.full_name)}</AvatarFallback>
                          </Avatar>
                          <span className="truncate">{m.profile?.full_name || m.profile?.email || 'Unknown'}</span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs"
                  onClick={() => setShowCollabSearch(true)}
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  Add Collaborator
                </Button>
              )}
            </div>

            {isEditing && (
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Additional details about this milestone..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending
                  ? 'Saving...'
                  : isEditing
                  ? 'Save Changes'
                  : 'Add Milestone'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
