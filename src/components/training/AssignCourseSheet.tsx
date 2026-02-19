import { useState } from 'react';
import { useAllAssignments, useAssignCourse, useRemoveAssignment, useTeamCompletions } from '@/hooks/useTraining';
import { useCatalog } from '@/hooks/useTraining';
import { useAuth } from '@/hooks/useAuth';
import { useWorkspaceContext } from '@/contexts/WorkspaceContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ChevronLeft, Search, Calendar, Users, User, Building2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LWCourse } from '@/services/learnworlds/learnworldsTypes';

interface AssignCourseSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedHolderId?: string;
  preselectedHolderName?: string;
}

const RECURRENCE_OPTIONS = [
  { value: 'none', label: 'One-time (no recurrence)', days: undefined },
  { value: 'monthly', label: 'Monthly', days: 30 },
  { value: 'quarterly', label: 'Every 3 months', days: 90 },
  { value: 'biannually', label: 'Every 6 months', days: 180 },
  { value: 'annually', label: 'Annually', days: 365 },
];

const ROLE_OPTIONS = [
  { value: 'inspector', label: 'Inspectors' },
  { value: 'manager', label: 'Property Managers' },
  { value: 'superintendent', label: 'Superintendents' },
  { value: 'project_manager', label: 'Project Managers' },
  { value: 'administrator', label: 'Administrators' },
  { value: 'clerk', label: 'Clerks' },
];

type Step = 1 | 2 | 3;

export function AssignCourseSheet({
  open,
  onOpenChange,
  preselectedHolderId,
  preselectedHolderName,
}: AssignCourseSheetProps) {
  const { user } = useAuth();
  const { workspace } = useWorkspaceContext();
  const assignCourse = useAssignCourse();
  const { data: catalog = [] } = useCatalog();

  const [step, setStep] = useState<Step>(1);
  const [selectedCourse, setSelectedCourse] = useState<LWCourse | null>(null);
  const [search, setSearch] = useState('');

  // Step 2 — assign to
  const [assignType, setAssignType] = useState<'person' | 'role' | 'org'>('person');
  const [assignedTo, setAssignedTo] = useState(preselectedHolderId ?? '');
  const [assignedToRole, setAssignedToRole] = useState('');

  // Step 3 — schedule
  const [dueDate, setDueDate] = useState('');
  const [recurrence, setRecurrence] = useState('none');
  const [isMandatory, setIsMandatory] = useState(true);
  const [notes, setNotes] = useState('');

  const filteredCatalog = catalog.filter((c) =>
    c.title.toLowerCase().includes(search.toLowerCase())
  );

  const reset = () => {
    setStep(1);
    setSelectedCourse(null);
    setSearch('');
    setAssignType('person');
    setAssignedTo(preselectedHolderId ?? '');
    setAssignedToRole('');
    setDueDate('');
    setRecurrence('none');
    setIsMandatory(true);
    setNotes('');
  };

  const handleClose = () => {
    reset();
    onOpenChange(false);
  };

  const handleSave = async () => {
    if (!selectedCourse || !workspace?.id || !user) return;

    const recOpt = RECURRENCE_OPTIONS.find((r) => r.value === recurrence);

    await assignCourse.mutateAsync({
      workspaceId: workspace.id,
      lwCourseId: selectedCourse.id,
      assignedTo: assignType === 'person' ? assignedTo || undefined : undefined,
      assignedToRole: assignType === 'role' ? assignedToRole || undefined : undefined,
      dueDate: dueDate || undefined,
      recurrence: recurrence !== 'none' ? recurrence : undefined,
      recurrenceIntervalDays: recOpt?.days,
      isMandatory,
      notes: notes || undefined,
    });

    handleClose();
  };

  const canProceedStep2 =
    assignType === 'person' ? !!assignedTo : assignType === 'role' ? !!assignedToRole : true;

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="pb-4 border-b">
          <div className="flex items-center gap-2">
            {step > 1 && (
              <button
                onClick={() => setStep((s) => (s - 1) as Step)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}
            <div>
              <SheetTitle className="text-base">Assign Course</SheetTitle>
              <SheetDescription className="text-xs">Step {step} of 3</SheetDescription>
            </div>
          </div>
          {/* Progress dots */}
          <div className="flex gap-1.5 mt-2">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={cn(
                  'h-1 rounded-full transition-all',
                  s <= step ? 'bg-primary' : 'bg-muted',
                  s === step ? 'w-6' : 'w-3'
                )}
              />
            ))}
          </div>
        </SheetHeader>

        <div className="py-5 space-y-4">
          {/* ── STEP 1: Select Course ──────────────────────────────────── */}
          {step === 1 && (
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-foreground">Select a course to assign</p>
                <p className="text-xs text-muted-foreground">Search your course catalog</p>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search courses…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 h-9 text-sm"
                />
              </div>
              <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                {filteredCatalog.map((course) => (
                  <button
                    key={course.id}
                    onClick={() => {
                      setSelectedCourse(course);
                      setStep(2);
                    }}
                    className={cn(
                      'w-full text-left rounded-lg border p-3 transition-all hover:border-primary/50 hover:bg-primary/5',
                      selectedCourse?.id === course.id && 'border-primary bg-primary/5'
                    )}
                  >
                    <p className="text-sm font-medium text-foreground">{course.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {Math.floor(course.durationMinutes / 60)}h {course.durationMinutes % 60 > 0 ? `${course.durationMinutes % 60}m` : ''} · {course.difficulty}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── STEP 2: Assign To ─────────────────────────────────────── */}
          {step === 2 && selectedCourse && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-foreground">Who should take this?</p>
                <p className="text-xs text-muted-foreground font-medium mt-0.5 text-primary">{selectedCourse.title}</p>
              </div>

              {/* Assign type */}
              <div className="grid grid-cols-3 gap-2">
                {([
                  { type: 'person', icon: User, label: 'Specific Person' },
                  { type: 'role', icon: Users, label: 'By Role' },
                  { type: 'org', icon: Building2, label: 'Everyone' },
                ] as const).map(({ type, icon: Icon, label }) => (
                  <button
                    key={type}
                    onClick={() => setAssignType(type)}
                    className={cn(
                      'flex flex-col items-center gap-1.5 rounded-xl border p-3 text-xs font-medium transition-all',
                      assignType === type
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'text-muted-foreground hover:border-primary/40'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </button>
                ))}
              </div>

              {/* Person picker */}
              {assignType === 'person' && (
                <div className="space-y-1.5">
                  <Label className="text-xs">User ID</Label>
                  <Input
                    placeholder={preselectedHolderName ?? 'Enter user ID or select from list'}
                    value={assignedTo}
                    onChange={(e) => setAssignedTo(e.target.value)}
                    className="h-9 text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    {preselectedHolderName ? `Assigned to: ${preselectedHolderName}` : 'Enter the user\'s ID'}
                  </p>
                </div>
              )}

              {/* Role picker */}
              {assignType === 'role' && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Role</Label>
                  <Select value={assignedToRole} onValueChange={setAssignedToRole}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLE_OPTIONS.map((r) => (
                        <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {assignType === 'org' && (
                <div className="rounded-lg bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
                  This course will be assigned to all members of your organization.
                </div>
              )}

              <Button
                className="w-full"
                onClick={() => setStep(3)}
                disabled={!canProceedStep2}
              >
                Next: Set Schedule
              </Button>
            </div>
          )}

          {/* ── STEP 3: Schedule ─────────────────────────────────────── */}
          {step === 3 && selectedCourse && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-foreground">When should it be done?</p>
                <p className="text-xs text-muted-foreground font-medium mt-0.5 text-primary">{selectedCourse.title}</p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Due Date (optional)</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="pl-8 h-9 text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Recurrence</Label>
                <Select value={recurrence} onValueChange={setRecurrence}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RECURRENCE_OPTIONS.map((r) => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium text-foreground">Mark as mandatory</p>
                  <p className="text-xs text-muted-foreground">Required to complete</p>
                </div>
                <Switch checked={isMandatory} onCheckedChange={setIsMandatory} />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Note for assignee (optional)</Label>
                <Input
                  placeholder="e.g. Required for your role under OSHA regulations"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>

              <Button
                className="w-full"
                onClick={handleSave}
                disabled={assignCourse.isPending}
              >
                {assignCourse.isPending ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Assigning…</>
                ) : (
                  'Assign Course ✓'
                )}
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
