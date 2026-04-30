/**
 * C5 · MeetingTemplatesPage — lightweight page for managing reusable meeting
 * templates (title pattern + default attendees + agenda boilerplate).
 *
 * The meeting_templates table is tenant-scoped; this page lists existing rows
 * with an inline "New from template → meeting" shortcut. Editing templates
 * is a simple name+notes form — more elaborate JSON schemas can follow later.
 */
import { useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { requireTenantId } from "@/lib/tenant";
import { useProjectMeetings } from "@/hooks/useProjectMeetings";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Copy, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface MeetingTemplate {
  id: string;
  tenant_id: string;
  name: string;
  meeting_type: string;
  default_notes: string | null;
  created_at: string;
}

export default function MeetingTemplatesPage() {
  const { projectId = "" } = useParams();
  const qc = useQueryClient();
  const { createMeeting } = useProjectMeetings(projectId);

  const { data: templates = [] } = useQuery<MeetingTemplate[]>({
    queryKey: ["meeting-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("meeting_templates" as any).select("*")
        .order("name");
      if (error) throw error;
      return (data ?? []) as MeetingTemplate[];
    },
  });

  const createTemplate = useMutation({
    mutationFn: async (input: { name: string; type: string; notes: string }) => {
      const tenant_id = await requireTenantId();
      const { data, error } = await supabase.from("meeting_templates" as any).insert({
        tenant_id, name: input.name, meeting_type: input.type,
        default_notes: input.notes || null,
      } as any).select().single();
      if (error) throw error;
      return data as MeetingTemplate;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["meeting-templates"] }),
  });

  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("meeting_templates" as any)
        .delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["meeting-templates"] }),
  });

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState("owner-architect-contractor");
  const [notes, setNotes] = useState("");

  async function handleCreate() {
    if (!name.trim()) { toast.error("Name required"); return; }
    try {
      await createTemplate.mutateAsync({ name: name.trim(), type, notes });
      setName(""); setNotes(""); setOpen(false);
      toast.success("Template created");
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function spawnMeeting(tpl: MeetingTemplate) {
    try {
      await createMeeting.mutateAsync({
        project_id: projectId,
        title: `${tpl.name} · ${new Date().toLocaleDateString()}`,
        meeting_type: tpl.meeting_type,
        meeting_date: new Date().toISOString().split("T")[0],
        meeting_time: "09:00",
        attendees: [],
        raw_notes: tpl.default_notes ?? "",
        status: "draft",
      } as any);
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Meeting templates</h1>
          <p className="text-muted-foreground mt-1">
            Reusable boilerplate for recurring meetings.
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> New template
        </Button>
      </div>

      {templates.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            No templates yet.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {templates.map((t) => (
            <Card key={t.id}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{t.name}</div>
                    <div className="text-xs text-muted-foreground">{t.meeting_type}</div>
                  </div>
                  <Button size="icon" variant="ghost" className="h-7 w-7"
                          onClick={() => deleteTemplate.mutate(t.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                {t.default_notes && (
                  <p className="text-xs text-muted-foreground line-clamp-3">
                    {t.default_notes}
                  </p>
                )}
                <Button size="sm" variant="outline" className="w-full"
                        onClick={() => spawnMeeting(t)}>
                  <Copy className="h-3.5 w-3.5 mr-1" /> Spawn meeting from template
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New meeting template</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <Label>Type</Label>
              <Input value={type} onChange={(e) => setType(e.target.value)} />
            </div>
            <div>
              <Label>Default notes / agenda</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={6} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createTemplate.isPending || !name.trim()}>
              {createTemplate.isPending ? "Creating…" : "Create template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
