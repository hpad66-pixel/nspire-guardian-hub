import { useState } from "react";
import { Link } from "react-router-dom";
import { usePermissionTemplates } from "@/hooks/usePermissionTemplates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function PermissionTemplatesPage() {
  const { data: templates = [], isLoading, create, remove } = usePermissionTemplates();
  const [newName, setNewName] = useState("");

  async function handleCreate() {
    if (!newName.trim()) return;
    try {
      await create.mutateAsync({ name: newName.trim() });
      setNewName("");
      toast.success("Template created");
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function handleClone(id: string, name: string) {
    const newTitle = `${name} (copy)`;
    try {
      await create.mutateAsync({ name: newTitle, clonedFrom: id });
      toast.success(`Cloned as "${newTitle}"`);
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete template "${name}"? Users assigned to it will lose those permissions.`)) return;
    try {
      await remove.mutateAsync(id);
      toast.success("Template deleted");
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Permission Templates</h1>
          <p className="text-muted-foreground mt-1">
            Define reusable permission bundles and assign them to users.
          </p>
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>New template</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Input
            placeholder="e.g. Finance Lead"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          />
          <Button onClick={handleCreate} disabled={!newName.trim() || create.isPending}>
            Create
          </Button>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="text-muted-foreground">Loading…</div>
      ) : templates.length === 0 ? (
        <div className="text-muted-foreground">No templates yet.</div>
      ) : (
        <div className="grid gap-3">
          {templates.map((t) => (
            <Card key={t.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Link to={`/admin/permission-templates/${t.id}`} className="font-medium hover:underline">
                      {t.name}
                    </Link>
                    {t.is_system && <Badge variant="secondary">System</Badge>}
                  </div>
                  {t.description && (
                    <div className="text-sm text-muted-foreground mt-1">{t.description}</div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleClone(t.id, t.name)}>
                    Clone
                  </Button>
                  {!t.is_system && (
                    <Button variant="destructive" size="sm" onClick={() => handleDelete(t.id, t.name)}>
                      Delete
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
