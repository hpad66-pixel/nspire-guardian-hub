import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { BellRing, Users } from 'lucide-react';
import type { ProjectTeamMember } from '@/hooks/useProjectTeam';

export function TeamWatcherPicker({
  team,
  value,
  onChange,
  excludeUserId,
  disabled,
}: {
  team: ProjectTeamMember[];
  value: string[];
  onChange: (ids: string[]) => void;
  excludeUserId?: string | null;
  disabled?: boolean;
}) {
  const available = team.filter((member) => member.user_id !== excludeUserId);
  const selectedNames = available
    .filter((member) => value.includes(member.user_id))
    .map((member) => member.profile?.full_name || member.profile?.email || 'Team member');

  const toggle = (userId: string, checked: boolean) => {
    onChange(checked ? [...new Set([...value, userId])] : value.filter((id) => id !== userId));
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" className="w-full justify-start font-normal h-auto min-h-9 py-2" disabled={disabled}>
          <Users className="h-4 w-4 mr-2 text-muted-foreground shrink-0" />
          <span className="truncate">{selectedNames.length ? selectedNames.join(', ') : 'Add people to CC / followers'}</span>
          {selectedNames.length > 0 && <span className="ml-auto text-xs rounded-full bg-primary/10 text-primary px-1.5 py-0.5">{selectedNames.length}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[340px] p-2">
        <div className="px-2 py-1.5">
          <p className="text-sm font-medium flex items-center gap-1.5"><BellRing className="h-4 w-4 text-[var(--apas-sapphire)]" /> CC / followers</p>
          <p className="text-xs text-muted-foreground mt-0.5">Followers see the project conversation and receive updates without replacing the accountable owner.</p>
        </div>
        <div className="max-h-60 overflow-y-auto mt-1">
          {available.length === 0 ? (
            <p className="text-sm text-muted-foreground px-2 py-4 text-center">Add team members to this project first.</p>
          ) : available.map((member) => {
            const name = member.profile?.full_name || member.profile?.email || 'Team member';
            const email = member.profile?.email;
            const checked = value.includes(member.user_id);
            return (
              <label key={member.user_id} className="flex items-center gap-2.5 rounded-md px-2 py-2 hover:bg-muted/60 cursor-pointer">
                <Checkbox checked={checked} onCheckedChange={(next) => toggle(member.user_id, Boolean(next))} />
                <span className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold shrink-0">{name.charAt(0).toUpperCase()}</span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium truncate">{name}</span>
                  {email && email !== name && <span className="block text-xs text-muted-foreground truncate">{email}</span>}
                </span>
              </label>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
