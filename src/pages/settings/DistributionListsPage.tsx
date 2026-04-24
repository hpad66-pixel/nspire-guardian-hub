import { useState } from "react";
import { useDistributionLists } from "@/hooks/useDistributionLists";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { DistributionListEditor } from "@/components/settings/DistributionListEditor";
import { toast } from "sonner";

export default function DistributionListsPage() {
  const { data: lists = [], isLoading, create, remove } = useDistributionLists();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [scope, setScope] = useState<"tenant" | "workspace" | "project">("tenant");

  const selectedList = lists.find((l) => l.id === selectedId) ?? null;

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
        {!selectedList ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              Select a list to manage its members.
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-4 space-y-4">
              <DistributionListEditor list={selectedList} />
              <Button
                variant="destructive"
                onClick={async () => {
                  if (!confirm("Delete this list?")) return;
                  await remove.mutateAsync(selectedList.id);
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
