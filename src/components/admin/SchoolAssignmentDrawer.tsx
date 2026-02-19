import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Building2, User, Plus, Trash2, Info } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import {
  useSchoolAssignments,
  useAddSchoolAssignment,
  useRemoveSchoolAssignment,
} from '@/hooks/useUserSchool';
import type { LWSchool } from '@/hooks/useUserSchool';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

interface SchoolAssignmentDrawerProps {
  school: LWSchool;
  open: boolean;
  onClose: () => void;
}

// ─── Fetch workspaces for org assignment ──────────────────────────────────────
function useWorkspaces() {
  return useQuery({
    queryKey: ['workspaces-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workspaces')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return (data ?? []) as Array<{ id: string; name: string }>;
    },
  });
}

// ─── Fetch profiles for individual assignment ────────────────────────────────
function useProfiles() {
  return useQuery({
    queryKey: ['profiles-for-assignment'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, email, workspace_id')
        .order('full_name');
      if (error) throw error;
      return (data ?? []) as Array<{
        user_id: string;
        full_name: string | null;
        email: string | null;
        workspace_id: string | null;
      }>;
    },
  });
}

export function SchoolAssignmentDrawer({ school, open, onClose }: SchoolAssignmentDrawerProps) {
  const { data: assignments = [], isLoading } = useSchoolAssignments(school.id);
  const addAssignment = useAddSchoolAssignment();
  const removeAssignment = useRemoveSchoolAssignment();
  const { data: workspaces = [] } = useWorkspaces();
  const { data: profiles = [] } = useProfiles();

  // Org form state
  const [orgSearch, setOrgSearch] = useState('');
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState('');
  const [orgNotes, setOrgNotes] = useState('');
  const [orgPrimary, setOrgPrimary] = useState(true);

  // Individual form state
  const [userSearch, setUserSearch] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [userNotes, setUserNotes] = useState('');

  const orgAssignments = assignments.filter((a) => a.workspace_id !== null);
  const userAssignments = assignments.filter((a) => a.user_id !== null);

  const filteredWorkspaces = workspaces.filter((w) =>
    w.name.toLowerCase().includes(orgSearch.toLowerCase())
  );
  const filteredProfiles = profiles.filter((p) => {
    const name = (p.full_name ?? '').toLowerCase();
    const email = (p.email ?? '').toLowerCase();
    return name.includes(userSearch.toLowerCase()) || email.includes(userSearch.toLowerCase());
  });

  const handleAddOrg = async () => {
    if (!selectedWorkspaceId) {
      toast.error('Select an organization first');
      return;
    }
    await addAssignment.mutateAsync({
      schoolId: school.id,
      workspaceId: selectedWorkspaceId,
      isPrimary: orgPrimary,
      priority: 2,
      notes: orgNotes || undefined,
    });
    setSelectedWorkspaceId('');
    setOrgSearch('');
    setOrgNotes('');
    toast.success('Organization assigned to school ✓');
  };

  const handleAddUser = async () => {
    if (!selectedUserId) {
      toast.error('Select a user first');
      return;
    }
    await addAssignment.mutateAsync({
      schoolId: school.id,
      userId: selectedUserId,
      isPrimary: true,
      priority: 3,
      notes: userNotes || undefined,
    });
    setSelectedUserId('');
    setUserSearch('');
    setUserNotes('');
    toast.success('User assigned to school ✓');
  };

  const handleRemove = async (assignmentId: string) => {
    await removeAssignment.mutateAsync({ assignmentId, schoolId: school.id });
    toast.success('Assignment removed');
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle className="text-base">{school.name} — Assignments</SheetTitle>
        </SheetHeader>

        {/* Info box */}
        <div className="mb-4 rounded-lg border bg-muted/30 p-3 flex gap-2">
          <Info className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            Individual assignments always take priority over organization assignments. Users with no
            assignment see the default school (APAS Labs). Users can belong to multiple schools and
            switch between them.
          </p>
        </div>

        <Tabs defaultValue="orgs">
          <TabsList className="w-full mb-4">
            <TabsTrigger value="orgs" className="flex-1 gap-1.5">
              <Building2 className="h-3.5 w-3.5" />
              Organizations
              {orgAssignments.length > 0 && (
                <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">
                  {orgAssignments.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="users" className="flex-1 gap-1.5">
              <User className="h-3.5 w-3.5" />
              Individuals
              {userAssignments.length > 0 && (
                <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">
                  {userAssignments.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* ── Organizations tab ── */}
          <TabsContent value="orgs" className="space-y-4">
            {/* Existing org assignments */}
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2].map((i) => (
                  <div key={i} className="h-14 rounded-lg bg-muted/40 animate-pulse" />
                ))}
              </div>
            ) : orgAssignments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No organizations assigned yet.
              </p>
            ) : (
              <div className="space-y-2">
                {orgAssignments.map((a) => {
                  const ws = workspaces.find((w) => w.id === a.workspace_id);
                  return (
                    <div
                      key={a.id}
                      className="flex items-center justify-between gap-2 rounded-lg border bg-card p-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {ws?.name ?? a.workspace_id}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Assigned {format(parseISO(a.created_at), 'MMM d, yyyy')}
                          {a.is_primary && (
                            <span className="ml-2 text-primary font-medium">· Primary</span>
                          )}
                        </p>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive flex-shrink-0"
                        onClick={() => handleRemove(a.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Add org form */}
            <div className="rounded-lg border bg-muted/20 p-3 space-y-3">
              <p className="text-xs font-semibold text-foreground">+ Assign Organization</p>
              <div className="space-y-1.5">
                <Label className="text-xs">Search organizations</Label>
                <Input
                  placeholder="Type to search..."
                  value={orgSearch}
                  onChange={(e) => {
                    setOrgSearch(e.target.value);
                    setSelectedWorkspaceId('');
                  }}
                  className="h-8 text-xs"
                />
                {orgSearch && filteredWorkspaces.length > 0 && (
                  <div className="rounded-md border bg-popover shadow-sm max-h-36 overflow-y-auto">
                    {filteredWorkspaces.slice(0, 8).map((w) => (
                      <button
                        key={w.id}
                        onClick={() => {
                          setSelectedWorkspaceId(w.id);
                          setOrgSearch(w.name);
                        }}
                        className="w-full text-left px-3 py-1.5 text-xs hover:bg-muted/50 transition-colors"
                      >
                        {w.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="org-primary"
                  checked={orgPrimary}
                  onCheckedChange={setOrgPrimary}
                  className="scale-75"
                />
                <Label htmlFor="org-primary" className="text-xs cursor-pointer">
                  Mark as primary school for this org
                </Label>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Notes (optional)</Label>
                <Textarea
                  value={orgNotes}
                  onChange={(e) => setOrgNotes(e.target.value)}
                  rows={2}
                  className="text-xs resize-none"
                  placeholder="e.g. Compliance training contract Q1 2026"
                />
              </div>
              <Button
                size="sm"
                className="w-full h-8 text-xs"
                onClick={handleAddOrg}
                disabled={!selectedWorkspaceId || addAssignment.isPending}
              >
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Assign Organization
              </Button>
            </div>
          </TabsContent>

          {/* ── Individuals tab ── */}
          <TabsContent value="users" className="space-y-4">
            {/* Existing user assignments */}
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2].map((i) => (
                  <div key={i} className="h-14 rounded-lg bg-muted/40 animate-pulse" />
                ))}
              </div>
            ) : userAssignments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No individual users assigned yet.
              </p>
            ) : (
              <div className="space-y-2">
                {userAssignments.map((a) => {
                  const profile = profiles.find((p) => p.user_id === a.user_id);
                  return (
                    <div
                      key={a.id}
                      className="flex items-center justify-between gap-2 rounded-lg border bg-card p-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {profile?.full_name ?? 'Unknown User'}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {profile?.email} · Assigned {format(parseISO(a.created_at), 'MMM d, yyyy')}
                        </p>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive flex-shrink-0"
                        onClick={() => handleRemove(a.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Add user form */}
            <div className="rounded-lg border bg-muted/20 p-3 space-y-3">
              <p className="text-xs font-semibold text-foreground">+ Assign Individual</p>
              <div className="space-y-1.5">
                <Label className="text-xs">Search by name or email</Label>
                <Input
                  placeholder="Type to search..."
                  value={userSearch}
                  onChange={(e) => {
                    setUserSearch(e.target.value);
                    setSelectedUserId('');
                  }}
                  className="h-8 text-xs"
                />
                {userSearch && filteredProfiles.length > 0 && (
                  <div className="rounded-md border bg-popover shadow-sm max-h-36 overflow-y-auto">
                    {filteredProfiles.slice(0, 8).map((p) => (
                      <button
                        key={p.user_id}
                        onClick={() => {
                          setSelectedUserId(p.user_id);
                          setUserSearch(p.full_name ?? p.email ?? '');
                        }}
                        className="w-full text-left px-3 py-1.5 text-xs hover:bg-muted/50 transition-colors"
                      >
                        <span className="font-medium">{p.full_name}</span>
                        {p.email && <span className="text-muted-foreground ml-1">{p.email}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Notes (optional)</Label>
                <Textarea
                  value={userNotes}
                  onChange={(e) => setUserNotes(e.target.value)}
                  rows={2}
                  className="text-xs resize-none"
                  placeholder="e.g. Solo subscriber, direct access"
                />
              </div>
              <Button
                size="sm"
                className="w-full h-8 text-xs"
                onClick={handleAddUser}
                disabled={!selectedUserId || addAssignment.isPending}
              >
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Assign Individual
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
