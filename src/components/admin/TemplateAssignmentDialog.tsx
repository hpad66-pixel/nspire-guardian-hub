/**
 * A2 · TemplateAssignmentDialog — assign a permission template to a user,
 * optionally scoped to a workspace or project.
 *
 * Writes a `user_template_assignments` row via the `useAssignTemplate` hook.
 * Scope priority at read time is handled server-side in `public.can()` — this
 * dialog just records intent.
 */
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  usePermissionTemplates, useAssignTemplate,
} from "@/hooks/usePermissionTemplates";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface SimpleRow { id: string; name: string | null; }

export function TemplateAssignmentDialog({
  open, onOpenChange,
  defaultUserId, defaultTemplateId, defaultWorkspaceId, defaultProjectId,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  defaultUserId?: string;
  defaultTemplateId?: string;
  defaultWorkspaceId?: string;
  defaultProjectId?: string;
}) {
  const { data: templates = [] } = usePermissionTemplates();
  const assign = useAssignTemplate();

  const [userId, setUserId] = useState(defaultUserId ?? "");
  const [userSearch, setUserSearch] = useState("");
  const [templateId, setTemplateId] = useState(defaultTemplateId ?? "");
  const [scope, setScope] = useState<"tenant" | "workspace" | "project">("tenant");
  const [workspaceId, setWorkspaceId] = useState(defaultWorkspaceId ?? "");
  const [projectId, setProjectId] = useState(defaultProjectId ?? "");

  useEffect(() => {
    if (!open) return;
    setUserId(defaultUserId ?? "");
    setTemplateId(defaultTemplateId ?? "");
    setWorkspaceId(defaultWorkspaceId ?? "");
    setProjectId(defaultProjectId ?? "");
    setScope(
      defaultProjectId ? "project" :
      defaultWorkspaceId ? "workspace" : "tenant",
    );
  }, [open, defaultUserId, defaultTemplateId, defaultWorkspaceId, defaultProjectId]);

  // Directory lookup — search users by display_name/email
  const { data: users = [] } = useQuery<SimpleRow[]>({
    queryKey: ["template-assign-users", userSearch],
    enabled: open && userSearch.trim().length > 0,
    queryFn: async () => {
      const q = userSearch.trim();
      const { data, error } = await supabase
        .from("profiles" as any)
        .select("id, display_name, email")
        .or(`display_name.ilike.%${q}%,email.ilike.%${q}%`)
        .limit(20);
      if (error) throw error;
      return ((data ?? []) as any[]).map((u) => ({
        id: u.id, name: u.display_name ?? u.email ?? u.id,
      }));
    },
  });

  const { data: workspaces = [] } = useQuery<SimpleRow[]>({
    queryKey: ["template-assign-workspaces"],
    enabled: open && scope === "workspace",
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workspaces" as any).select("id, name").order("name");
      if (error) throw error;
      return (data ?? []) as SimpleRow[];
    },
  });

  const { data: projects = [] } = useQuery<SimpleRow[]>({
    queryKey: ["template-assign-projects"],
    enabled: open && scope === "project",
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects" as any).select("id, name").order("name");
      if (error) throw error;
      return (data ?? []) as SimpleRow[];
    },
  });

  async function handleSubmit() {
    if (!userId) { toast.error("Pick a user"); return; }
    if (!templateId) { toast.error("Pick a template"); return; }
    if (scope === "workspace" && !workspaceId) { toast.error("Pick a workspace"); return; }
    if (scope === "project" && !projectId) { toast.error("Pick a project"); return; }

    try {
      await assign.mutateAsync({
        userId,
        templateId,
        workspaceId: scope === "workspace" ? workspaceId : undefined,
        projectId: scope === "project" ? projectId : undefined,
      });
      toast.success("Template assigned");
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !assign.isPending && onOpenChange(o)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Assign permission template</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label>User</Label>
            {defaultUserId ? (
              <Input value={userId} disabled />
            ) : (
              <>
                <Input
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Search by name or email…"
                />
                {users.length > 0 && (
                  <div className="mt-1 border rounded-md max-h-32 overflow-y-auto text-sm">
                    {users.map((u) => (
                      <button
                        key={u.id} type="button"
                        onClick={() => { setUserId(u.id); setUserSearch(u.name ?? ""); }}
                        className={`block w-full text-left p-2 hover:bg-muted ${
                          userId === u.id ? "bg-muted" : ""
                        }`}
                      >
                        {u.name}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          <div>
            <Label>Template</Label>
            <Select value={templateId} onValueChange={setTemplateId}>
              <SelectTrigger><SelectValue placeholder="Pick a template…" /></SelectTrigger>
              <SelectContent>
                {templates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                    {t.is_system && <span className="text-xs text-muted-foreground ml-2">· system</span>}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Scope</Label>
            <Select value={scope} onValueChange={(v) => setScope(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="tenant">Entire tenant</SelectItem>
                <SelectItem value="workspace">Single workspace</SelectItem>
                <SelectItem value="project">Single project</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {scope === "workspace" && (
            <div>
              <Label>Workspace</Label>
              <Select value={workspaceId} onValueChange={setWorkspaceId}>
                <SelectTrigger><SelectValue placeholder="Pick a workspace…" /></SelectTrigger>
                <SelectContent>
                  {workspaces.map((w) => (
                    <SelectItem key={w.id} value={w.id}>{w.name ?? w.id}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {scope === "project" && (
            <div>
              <Label>Project</Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger><SelectValue placeholder="Pick a project…" /></SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name ?? p.id}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={assign.isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={assign.isPending || !userId || !templateId}>
            {assign.isPending ? "Assigning…" : "Assign"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
