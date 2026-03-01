import { useState } from 'react';
import { UserPlus, Search, UserCircle } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { useProjectTeamMembers, useAddProjectTeamMember } from '@/hooks/useProjectTeam';
import { useSearchProfiles } from '@/hooks/useProfiles';
import { toast } from 'sonner';

interface ProjectTeamAssignSelectProps {
  projectId: string;
  value: string | null | undefined;
  onValueChange: (userId: string | null) => void;
  placeholder?: string;
  /** Use _none_ sentinel for react-hook-form compatibility */
  useSentinel?: boolean;
}

export function ProjectTeamAssignSelect({
  projectId,
  value,
  onValueChange,
  placeholder = 'Select person',
  useSentinel = false,
}: ProjectTeamAssignSelectProps) {
  const { data: teamMembers = [] } = useProjectTeamMembers(projectId);
  const addMember = useAddProjectTeamMember();
  const [showSearch, setShowSearch] = useState(false);
  const [search, setSearch] = useState('');
  const { data: searchResults = [] } = useSearchProfiles(search);

  const existingUserIds = new Set(teamMembers.map(m => m.user_id));
  const addableProfiles = searchResults.filter(p => !existingUserIds.has(p.user_id));

  const handleAddAndAssign = async (userId: string) => {
    try {
      await addMember.mutateAsync({
        projectId,
        userId,
        role: 'subcontractor', // default role; can be changed later in team tab
      });
      onValueChange(userId);
      setShowSearch(false);
      setSearch('');
      toast.success('Team member added and assigned');
    } catch {
      // error toast handled by hook
    }
  };

  const noneValue = useSentinel ? '_none_' : 'unassigned';
  const selectValue = value || noneValue;

  if (showSearch) {
    return (
      <div className="space-y-2 rounded-md border p-2 bg-background">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-muted-foreground">Add team member to project</p>
          <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => { setShowSearch(false); setSearch(''); }}>
            Cancel
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="h-8 pl-7 text-xs"
            autoFocus
          />
        </div>
        <div className="max-h-36 overflow-y-auto space-y-0.5">
          {addableProfiles.length === 0 && search.length > 0 && (
            <p className="text-xs text-muted-foreground py-2 text-center">No users found</p>
          )}
          {addableProfiles.map(p => (
            <button
              key={p.user_id}
              type="button"
              onClick={() => handleAddAndAssign(p.user_id)}
              disabled={addMember.isPending}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs hover:bg-accent transition-colors text-left"
            >
              <Avatar className="h-5 w-5">
                <AvatarImage src={p.avatar_url ?? undefined} />
                <AvatarFallback className="text-[9px]">
                  {(p.full_name || p.email || '?').charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{p.full_name || 'Unnamed'}</p>
                <p className="text-muted-foreground truncate">{p.email}</p>
              </div>
              <UserPlus className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <Select
        value={selectValue}
        onValueChange={(val) => {
          if (val === '__add_member__') {
            setShowSearch(true);
            return;
          }
          onValueChange(val === noneValue ? null : val);
        }}
      >
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={noneValue}>
            <span className="flex items-center gap-2 text-muted-foreground">
              <UserCircle className="h-4 w-4" /> Unassigned
            </span>
          </SelectItem>
          {teamMembers.map((member) => (
            <SelectItem key={member.user_id} value={member.user_id}>
              {member.profile?.full_name || member.profile?.email || 'Unknown'}
            </SelectItem>
          ))}
          <Separator className="my-1" />
          <SelectItem value="__add_member__">
            <span className="flex items-center gap-2 text-primary">
              <UserPlus className="h-4 w-4" /> Add team member...
            </span>
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
