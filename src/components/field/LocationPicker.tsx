/**
 * C3 · LocationPicker — hierarchical picker over project_locations.
 *
 * Parents are expanded on click; leaves select. Supports creating a new
 * location inline via the "+" button (prompts the caller to insert a row).
 */
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { requireTenantId } from "@/lib/tenant";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { ChevronRight, ChevronDown, MapPin, Plus, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ProjectLocation {
  id: string;
  project_id: string;
  name: string;
  parent_id: string | null;
  level: number;
  sort_order: number;
}

interface LocationTreeNode extends ProjectLocation {
  children: LocationTreeNode[];
  depth: number;
}

export interface LocationPickerProps {
  projectId: string;
  value: string | null;
  onValueChange: (id: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
}

function buildTree(rows: ProjectLocation[]): LocationTreeNode[] {
  const byId = new Map<string, LocationTreeNode>();
  const roots: LocationTreeNode[] = [];
  for (const r of rows) {
    byId.set(r.id, { ...r, children: [], depth: 0 });
  }
  for (const r of rows) {
    const node = byId.get(r.id)!;
    if (r.parent_id && byId.has(r.parent_id)) {
      const parent = byId.get(r.parent_id)!;
      node.depth = parent.depth + 1;
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

function flatten(nodes: LocationTreeNode[], expanded: Set<string>): LocationTreeNode[] {
  const out: LocationTreeNode[] = [];
  const walk = (ns: LocationTreeNode[]) => {
    for (const n of ns) {
      out.push(n);
      if (expanded.has(n.id)) walk(n.children);
    }
  };
  walk(nodes);
  return out;
}

export function LocationPicker({
  projectId, value, onValueChange,
  placeholder = "Pick a location…",
  disabled,
}: LocationPickerProps) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [creatingUnderId, setCreatingUnderId] = useState<string | null | undefined>(undefined);
  const [newName, setNewName] = useState("");

  const { data: locations = [] } = useQuery<ProjectLocation[]>({
    queryKey: ["project-locations", projectId],
    enabled: Boolean(projectId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_locations" as any)
        .select("id, project_id, name, parent_id, level, sort_order")
        .eq("project_id", projectId)
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as unknown as ProjectLocation[];
    },
  });

  const tree = useMemo(() => buildTree(locations), [locations]);
  const rows = useMemo(() => flatten(tree, expanded), [tree, expanded]);
  const selected = locations.find((l) => l.id === value) ?? null;

  const create = useMutation({
    mutationFn: async (input: { name: string; parentId: string | null }) => {
      const tenant_id = await requireTenantId();
      const parent = locations.find((l) => l.id === input.parentId) ?? null;
      const level = (parent?.level ?? 0) + 1;
      const { data, error } = await supabase.from("project_locations" as any)
        .insert({
          tenant_id, project_id: projectId,
          name: input.name, parent_id: input.parentId,
          level, sort_order: locations.length,
        } as any)
        .select().single();
      if (error) throw error;
      return data as unknown as ProjectLocation;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["project-locations", projectId] });
    },
  });

  function toggleExpanded(id: string) {
    setExpanded((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function handleCreate() {
    if (!newName.trim()) return;
    try {
      const row = await create.mutateAsync({
        name: newName.trim(),
        parentId: creatingUnderId ?? null,
      });
      if (creatingUnderId) setExpanded((s) => new Set(s).add(creatingUnderId));
      onValueChange(row.id);
      setNewName("");
      setCreatingUnderId(undefined);
      toast.success(`Created "${row.name}"`);
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button" variant="outline" disabled={disabled}
          className="w-full justify-between font-normal"
        >
          <span className="flex items-center gap-2 truncate">
            <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
            {selected ? selected.name : <span className="text-muted-foreground">{placeholder}</span>}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[--radix-popover-trigger-width]" align="start">
        <div className="max-h-80 overflow-y-auto">
          {rows.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground">
              No locations yet. Add one below.
            </div>
          ) : (
            <ul className="py-1">
              {rows.map((node) => {
                const hasChildren = node.children.length > 0;
                const isExpanded = expanded.has(node.id);
                const isSel = node.id === value;
                return (
                  <li key={node.id}>
                    <div
                      className={cn(
                        "flex items-center gap-1 pr-2 py-1 text-sm hover:bg-muted",
                        isSel && "bg-muted",
                      )}
                      style={{ paddingLeft: 8 + node.depth * 16 }}
                    >
                      {hasChildren ? (
                        <button
                          type="button" onClick={() => toggleExpanded(node.id)}
                          className="h-5 w-5 flex items-center justify-center text-muted-foreground"
                        >
                          {isExpanded
                            ? <ChevronDown className="h-3.5 w-3.5" />
                            : <ChevronRight className="h-3.5 w-3.5" />}
                        </button>
                      ) : (
                        <span className="h-5 w-5" />
                      )}
                      <button
                        type="button"
                        onClick={() => { onValueChange(node.id); setOpen(false); }}
                        className="flex-1 text-left truncate"
                      >
                        {node.name}
                      </button>
                      <button
                        type="button"
                        onClick={() => setCreatingUnderId(node.id)}
                        className="text-muted-foreground hover:text-foreground"
                        title="Add child"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                      {isSel && <Check className="h-3.5 w-3.5 text-primary" />}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="border-t p-2 space-y-2">
          {creatingUnderId !== undefined ? (
            <div>
              <div className="text-xs text-muted-foreground mb-1">
                {creatingUnderId === null
                  ? "New root location"
                  : `Add under: ${locations.find((l) => l.id === creatingUnderId)?.name ?? "—"}`}
              </div>
              <div className="flex gap-2">
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Name…"
                  className="h-8"
                  autoFocus
                  onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); }}
                />
                <Button size="sm" onClick={handleCreate} disabled={create.isPending || !newName.trim()}>
                  Add
                </Button>
                <Button size="sm" variant="ghost"
                        onClick={() => { setCreatingUnderId(undefined); setNewName(""); }}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button size="sm" variant="ghost" className="w-full"
                    onClick={() => setCreatingUnderId(null)}>
              <Plus className="h-3.5 w-3.5 mr-1" /> New root location
            </Button>
          )}
          {selected && (
            <Button size="sm" variant="ghost" className="w-full"
                    onClick={() => { onValueChange(null); setOpen(false); }}>
              Clear selection
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
