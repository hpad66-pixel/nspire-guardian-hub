/**
 * B1 · ProjectDirectoryPage — people + companies per project.
 *
 * Layout:
 *   - Header with "Add person" button → AddPersonDialog.
 *   - Tabs:
 *       People   → resolved directory entries with role + key-contact toggle
 *       Companies → distinct organizations referenced on the project, click
 *                   to open CompanyDrawer.
 */
import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  useProjectDirectory, type DirectoryEntry,
} from "@/hooks/useProjectDirectory";
import { usePersonByReference, useOrganization } from "@/hooks/useDirectory";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AddPersonDialog } from "@/components/directory/AddPersonDialog";
import { CompanyDrawer } from "@/components/directory/CompanyDrawer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Tabs, TabsList, TabsTrigger, TabsContent,
} from "@/components/ui/tabs";
import { Star, UserPlus, Trash2, Building2 } from "lucide-react";
import { toast } from "sonner";

function DirectoryRow({
  entry, onRemove, onToggleKey, onPickOrg,
}: {
  entry: DirectoryEntry;
  onRemove: (id: string) => void;
  onToggleKey: (id: string, next: boolean) => void;
  onPickOrg: (orgId: string) => void;
}) {
  const { data: person } = usePersonByReference(entry.user_id, entry.contact_id);
  const { data: org } = useOrganization(entry.organization_id);

  return (
    <div className="flex items-start justify-between gap-3 p-3 border-b last:border-b-0">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 truncate">
          <span className="font-medium truncate">{person?.name ?? "(loading)"}</span>
          {person?.kind && (
            <Badge variant="outline" className="text-[10px]">{person.kind}</Badge>
          )}
          {entry.is_key_contact && <Badge>Key</Badge>}
        </div>
        <div className="text-xs text-muted-foreground flex flex-wrap gap-2 mt-0.5">
          {entry.role_label && <span>{entry.role_label}</span>}
          {person?.email && <span>· {person.email}</span>}
          {person?.phone && <span>· {person.phone}</span>}
          {org && (
            <button
              type="button"
              onClick={() => onPickOrg(org.id)}
              className="text-primary hover:underline inline-flex items-center gap-1"
            >
              <Building2 className="h-3 w-3" /> {org.name}
            </button>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1">
        <Button
          size="icon" variant="ghost" className="h-7 w-7"
          title={entry.is_key_contact ? "Unmark key contact" : "Mark as key contact"}
          onClick={() => onToggleKey(entry.id, !entry.is_key_contact)}
        >
          <Star
            className={`h-4 w-4 ${entry.is_key_contact ? "fill-[var(--accent)] text-[var(--accent)]" : ""}`}
          />
        </Button>
        <Button
          size="icon" variant="ghost" className="h-7 w-7"
          onClick={() => onRemove(entry.id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export default function ProjectDirectoryPage() {
  const { projectId = "" } = useParams<{ projectId: string }>();
  const qc = useQueryClient();
  const { data: entries = [], isLoading, remove } = useProjectDirectory(projectId ?? null);

  const [addOpen, setAddOpen] = useState(false);
  const [drawerOrgId, setDrawerOrgId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // Toggle key_contact inline.
  const toggleKey = useMutation({
    mutationFn: async (input: { id: string; next: boolean }) => {
      const { error } = await supabase
        .from("project_directory_entries" as any)
        .update({ is_key_contact: input.next } as any)
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["project-directory", projectId] }),
  });

  async function handleRemove(id: string) {
    if (!confirm("Remove this person from the project directory?")) return;
    try {
      await remove.mutateAsync(id);
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function handleToggleKey(id: string, next: boolean) {
    try {
      await toggleKey.mutateAsync({ id, next });
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  // Lightweight client filter across the people tab.
  const filteredPeople = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter((e) => {
      return (e.role_label ?? "").toLowerCase().includes(q);
    });
  }, [entries, search]);

  // Roll up distinct organization IDs referenced on the project.
  const companyIds = useMemo(() => {
    const s = new Set<string>();
    for (const e of entries) if (e.organization_id) s.add(e.organization_id);
    return [...s];
  }, [entries]);

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-1">Project Directory</h1>
          <p className="text-muted-foreground">
            People and companies assigned to this project.
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)} disabled={!projectId}>
          <UserPlus className="h-4 w-4 mr-2" />
          Add person
        </Button>
      </div>

      <Tabs defaultValue="people">
        <TabsList>
          <TabsTrigger value="people">People · {entries.length}</TabsTrigger>
          <TabsTrigger value="companies">Companies · {companyIds.length}</TabsTrigger>
        </TabsList>

        <TabsContent value="people" className="mt-3">
          <Input
            placeholder="Filter by role label…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mb-3"
          />
          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-6 text-sm text-muted-foreground">Loading…</div>
              ) : filteredPeople.length === 0 ? (
                <div className="p-8 text-sm text-muted-foreground text-center">
                  {entries.length === 0
                    ? "No people in this directory yet."
                    : "No matches."}
                </div>
              ) : (
                <div>
                  {filteredPeople.map((e) => (
                    <DirectoryRow
                      key={e.id}
                      entry={e}
                      onRemove={handleRemove}
                      onToggleKey={handleToggleKey}
                      onPickOrg={(id) => setDrawerOrgId(id)}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="companies" className="mt-3">
          {companyIds.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-sm text-muted-foreground text-center">
                No companies linked through the directory yet.
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {companyIds.map((id) => (
                <CompanyCard
                  key={id}
                  organizationId={id}
                  onClick={() => setDrawerOrgId(id)}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {projectId && (
        <AddPersonDialog
          open={addOpen}
          onOpenChange={setAddOpen}
          projectId={projectId}
        />
      )}
      <CompanyDrawer
        organizationId={drawerOrgId}
        open={Boolean(drawerOrgId)}
        onOpenChange={(o) => !o && setDrawerOrgId(null)}
        projectId={projectId}
      />
    </div>
  );
}

function CompanyCard({
  organizationId, onClick,
}: { organizationId: string; onClick: () => void }) {
  const { data: org } = useOrganization(organizationId);
  if (!org) return null;
  return (
    <button
      type="button" onClick={onClick}
      className="text-left"
    >
      <Card className="transition-shadow hover:shadow-md">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="font-medium truncate">{org.name}</div>
              <div className="text-xs text-muted-foreground truncate mt-0.5">
                {[org.email, org.phone, org.city].filter(Boolean).join(" · ") || "—"}
              </div>
            </div>
            <Badge variant="outline" className="capitalize">{org.kind}</Badge>
          </div>
        </CardContent>
      </Card>
    </button>
  );
}
