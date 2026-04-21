import { useState } from "react";
import { useDistributionLists, useDistributionListMembers } from "@/hooks/useDistributionLists";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { X } from "lucide-react";
import { toast } from "sonner";

export default function DistributionListsPage() {
  const { data: lists = [], isLoading, create, remove } = useDistributionLists();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [scope, setScope] = useState<"tenant" | "workspace" | "project">("tenant");

  const { data: members = [], addMember, removeMember } =
    useDistributionListMembers(selectedId);
  const [emailDraft, setEmailDraft] = useState("");

  async function handleCreate() {
    if (!name.trim()) return;
    try {
      const row = await create.mutateAsync({ name: name.trim(), scope });
      setSelectedId(row.id);
      setName("");
      toast.success("List created");
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function handleAddEmail() {
    const e = emailDraft.trim();
    if (!e) return;
    try {
      await addMember.mutateAsync({ email_override: e } as any);
      setEmailDraft("");
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1 space-y-4">
        <h1 className="text-2xl font-bold">Distribution Lists</h1>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">New list</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Input
              placeholder="e.g. OAC Meeting"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Select value={scope} onValueChange={(v) => setScope(v as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tenant">Tenant-wide</SelectItem>
                <SelectItem value="workspace">Workspace</SelectItem>
                <SelectItem value="project">Project</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleCreate} className="w-full" disabled={!name.trim()}>
              Create
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-1">
          {isLoading ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : lists.length === 0 ? (
            <div className="text-sm text-muted-foreground">No lists yet.</div>
          ) : (
            lists.map((l) => (
              <button
                key={l.id}
                onClick={() => setSelectedId(l.id)}
                className={`w-full text-left rounded-md border p-3 transition ${
                  selectedId === l.id ? "border-primary bg-primary/5" : "hover:bg-muted"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{l.name}</span>
                  <Badge variant="outline" className="text-xs">{l.scope}</Badge>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      <div className="lg:col-span-2">
        {!selectedId ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              Select a list to manage its members.
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Members</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="person@example.com"
                  value={emailDraft}
                  onChange={(e) => setEmailDraft(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddEmail()}
                />
                <Button onClick={handleAddEmail}>Add</Button>
              </div>

              <div className="space-y-2">
                {members.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No members yet.</div>
                ) : (
                  members.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center justify-between rounded-md border p-3"
                    >
                      <div className="text-sm">
                        {m.email_override ?? m.user_id ?? m.contact_id}
                        {m.role_label && (
                          <Badge variant="secondary" className="ml-2">{m.role_label}</Badge>
                        )}
                      </div>
                      <button
                        onClick={() => removeMember.mutateAsync(m.id)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              <Button
                variant="destructive"
                onClick={async () => {
                  if (!confirm("Delete this list?")) return;
                  await remove.mutateAsync(selectedId);
                  setSelectedId(null);
                }}
              >
                Delete list
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
