import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { School, Star, Users, User, Edit, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LWSchool } from '@/hooks/useUserSchool';
import { useSchoolAssignments, useSetDefaultSchool } from '@/hooks/useUserSchool';
import { CATEGORY_LABELS } from '@/services/learnworlds/learnworldsTypes';
import type { LWCourseCategory } from '@/services/learnworlds/learnworldsTypes';
import { toast } from 'sonner';

interface SchoolCardProps {
  school: LWSchool;
  onManageAssignments: () => void;
}

export function SchoolCard({ school, onManageAssignments }: SchoolCardProps) {
  const { data: assignments = [] } = useSchoolAssignments(school.id);
  const setDefault = useSetDefaultSchool();

  const orgCount = assignments.filter((a) => a.workspace_id !== null).length;
  const userCount = assignments.filter((a) => a.user_id !== null).length;

  const handleSetDefault = async () => {
    if (school.is_default) return;
    await setDefault.mutateAsync(school.id);
    toast.success(`${school.name} is now the default school`);
  };

  return (
    <div
      className={cn(
        'rounded-2xl border bg-card p-5 space-y-4 transition-all',
        school.is_default && 'border-primary/30 bg-primary/5'
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={cn(
              'h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0',
              school.is_default ? 'bg-primary/10' : 'bg-muted'
            )}
          >
            <School
              className={cn('h-5 w-5', school.is_default ? 'text-primary' : 'text-muted-foreground')}
            />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-semibold text-foreground truncate">{school.name}</h3>
              {school.is_default && (
                <Badge className="text-[10px] px-1.5 py-0 h-4 bg-primary/15 text-primary border-primary/20">
                  DEFAULT
                </Badge>
              )}
              <span
                className={cn(
                  'h-2 w-2 rounded-full flex-shrink-0',
                  school.is_active ? 'bg-green-500' : 'bg-muted-foreground'
                )}
              />
            </div>
            <p className="text-xs text-muted-foreground truncate">{school.school_url}</p>
          </div>
        </div>
      </div>

      {/* Categories */}
      <div className="flex flex-wrap gap-1">
        {school.categories.map((cat) => (
          <Badge
            key={cat}
            variant="secondary"
            className="text-[10px] px-1.5 py-0 h-4"
          >
            {CATEGORY_LABELS[cat as LWCourseCategory] ?? cat}
          </Badge>
        ))}
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Users className="h-3 w-3" />
          {orgCount} {orgCount === 1 ? 'organization' : 'organizations'}
        </span>
        <span className="flex items-center gap-1">
          <User className="h-3 w-3" />
          {userCount} {userCount === 1 ? 'individual' : 'individuals'}
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs flex-1"
          onClick={onManageAssignments}
        >
          <Edit className="h-3 w-3 mr-1.5" />
          Manage Assignments
        </Button>
        {!school.is_default && (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs"
            onClick={handleSetDefault}
            disabled={setDefault.isPending}
          >
            <Star className="h-3 w-3 mr-1.5" />
            Set Default
          </Button>
        )}
        {school.is_default && (
          <div className="flex items-center gap-1 text-xs text-primary px-2">
            <CheckCircle2 className="h-3 w-3" />
            Default
          </div>
        )}
      </div>
    </div>
  );
}
