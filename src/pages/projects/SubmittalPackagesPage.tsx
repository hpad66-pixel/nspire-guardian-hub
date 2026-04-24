/**
 * C2 · SubmittalPackagesPage — manage `submittal_packages` for a project.
 *
 * A "package" is a cover sheet grouping multiple submittals that are
 * submitted together (e.g. "Package 03A — Cast-in-Place Concrete"). Each
 * package carries its own number + title + cover-sheet notes. The list view
 * shows progress counts against child submittals once they exist.
 *
 * Route: /projects/:projectId/submittals/packages
 */
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useSubmittalPackages } from "@/hooks/useProcoreSubmittals";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Package, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export default function SubmittalPackagesPage() {
  const { projectId = "" } = useParams<{ projectId: string }>();
  const { data: packages = [], create, isLoading } = useSubmittalPackages(projectId || null);
  const [open, setOpen] = useState(false);
  const [number, setNumber] = useState("");
  const [title, setTitle] = useState("");

  async function handleCreate() {
    if (!number.trim()) { toast.error("Package number required"); return; }
    try {
      await create.mutateAsync({ number: number.trim(), title: title.trim() || undefined });
      toast.success(`Created ${number.trim()}`);
      setNumber("");
      setTitle("");
      setOpen(false);
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <Link
            to={`/projects/${projectId}/submittals`}
            className="text-sm text-muted-foreground hover:underline inline-flex items-center gap-1"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to submittals
          </Link>
          <h1 className="text-3xl font-bold mt-1">Submittal packages</h1>
          <p className="text-muted-foreground mt-1">
            Group submittals into cover-sheet bundles for review.
          </p>
        </div>
        <Button onClick={() => setOpen(true)} disabled={!projectId}>
          <Plus className="h-4 w-4 mr-2" /> New package
        </Button>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground">Loading…</div>
      ) : packages.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            No packages yet. Click <strong>New package</strong> to create one.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {packages.map((p: any) => (
            <Card key={p.id}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <span className="font-mono text-sm">{p.number}</span>
                    </div>
                    {p.title && (
                      <div className="font-medium truncate mt-0.5">{p.title}</div>
                    )}
                  </div>
                  <Badge variant="outline">{p.status ?? "open"}</Badge>
                </div>
                {p.description && (
                  <p className="text-xs text-muted-foreground line-clamp-3">
                    {p.description}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New submittal package</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Package number</Label>
              <Input value={number} onChange={(e) => setNumber(e.target.value)}
                     placeholder="e.g. PKG-03A" />
            </div>
            <div>
              <Label>Title (optional)</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)}
                     placeholder="e.g. Cast-in-Place Concrete" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={create.isPending}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={create.isPending || !number.trim()}>
              {create.isPending ? "Creating…" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
