/**
 * A5 · CostCodeLibraryEditor — admin surface for cost-code libraries.
 *
 * Features:
 *   - List libraries (with the is_default badge), seed the CSI MasterFormat 2018
 *     library in one click, or create a custom library.
 *   - Tree view of codes in the selected library (division → sections → sub).
 *   - Add / rename / archive codes inline.
 *   - CSV import (code, description, parent_code) for bulk seeding a custom library.
 *
 * Route: /admin/cost-codes/editor — the existing CostCodeLibrariesPage remains
 * at /admin/cost-codes as the simpler "which library is active" landing.
 */
import { useMemo, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { requireTenantId } from "@/lib/tenant";
import {
  useCostCodeLibraries, useCostCodes, type CostCode,
} from "@/hooks/useCostCodes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  ChevronRight, ChevronDown, Plus, Upload, Archive,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface TreeNode extends CostCode {
  children: TreeNode[];
}

function buildTree(rows: CostCode[]): TreeNode[] {
  const byId = new Map<string, TreeNode>();
  const roots: TreeNode[] = [];
  for (const r of rows) byId.set(r.id, { ...r, children: [] });
  for (const r of rows) {
    const node = byId.get(r.id)!;
    if (r.parent_id && byId.has(r.parent_id)) {
      byId.get(r.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  const sortRec = (ns: TreeNode[]) => {
    ns.sort((a, b) => a.code.localeCompare(b.code));
    ns.forEach((n) => sortRec(n.children));
  };
  sortRec(roots);
  return roots;
}

function parseCsv(text: string): Array<{ code: string; description: string; parent_code: string | null }> {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  // Strip optional header
  const startsWithHeader = lines[0]?.toLowerCase().startsWith("code");
  const data = startsWithHeader ? lines.slice(1) : lines;
  return data.map((line) => {
    const [code, description, parentCode] = line.split(",").map((s) => s?.trim() ?? "");
    return {
      code,
      description: description || code,
      parent_code: parentCode || null,
    };
  }).filter((r) => r.code);
}

export default function CostCodeLibraryEditor() {
  const qc = useQueryClient();
  const { data: libraries = [], create: _unused, seedCsi } = useCostCodeLibraries();
  const [libraryId, setLibraryId] = useState<string | null>(null);
  const active = libraries.find((l) => l.id === libraryId) ?? libraries[0] ?? null;
  const activeId = active?.id ?? null;
  const { data: codes = [] } = useCostCodes(activeId);

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [newLibOpen, setNewLibOpen] = useState(false);
  const [newLibName, setNewLibName] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [addParentId, setAddParentId] = useState<string | null>(null);
  const [addCode, setAddCode] = useState("");
  const [addDesc, setAddDesc] = useState("");
  const csvInputRef = useRef<HTMLInputElement>(null);

  const tree = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return buildTree(codes);
    // When searching, flatten and filter — keep parents of matches.
    const matches = codes.filter(
      (c) => c.code.toLowerCase().includes(q) ||
             c.description.toLowerCase().includes(q),
    );
    const keepIds = new Set(matches.map((m) => m.id));
    matches.forEach((m) => {
      let cur = m.parent_id;
      while (cur) {
        keepIds.add(cur);
        cur = codes.find((c) => c.id === cur)?.parent_id ?? null;
      }
    });
    return buildTree(codes.filter((c) => keepIds.has(c.id)));
  }, [codes, search]);

  const createLibrary = useMutation({
    mutationFn: async (name: string) => {
      const tenant_id = await requireTenantId();
      const { data, error } = await supabase.from("cost_code_libraries" as any)
        .insert({
          tenant_id, name, source: "custom", is_default: false,
        } as any).select().single();
      if (error) throw error;
      return data as any;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cost-code-libraries"] }),
  });

  const insertCode = useMutation({
    mutationFn: async (input: {
      code: string; description: string; parent_id: string | null;
    }) => {
      if (!activeId) throw new Error("No library");
      const parent = codes.find((c) => c.id === input.parent_id) ?? null;
      const { data, error } = await supabase.from("cost_codes" as any).insert({
        library_id: activeId,
        code: input.code,
        description: input.description,
        level: (parent?.level ?? 0) + 1,
        parent_id: input.parent_id,
        is_active: true,
      } as any).select().single();
      if (error) throw error;
      return data as CostCode;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cost-codes", activeId] }),
  });

  const archiveCode = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("cost_codes" as any)
        .update({ is_active: false } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cost-codes", activeId] }),
  });

  async function handleCreateLib() {
    if (!newLibName.trim()) return;
    try {
      const lib = await createLibrary.mutateAsync(newLibName.trim());
      setLibraryId(lib.id);
      setNewLibOpen(false);
      setNewLibName("");
      toast.success("Library created");
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function handleSeedCsi() {
    try {
      const lib = await seedCsi.mutateAsync();
      setLibraryId(lib.id);
      toast.success("Seeded CSI MasterFormat 2018");
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function handleAddCode() {
    if (!addCode.trim() || !addDesc.trim()) { toast.error("Code + description required"); return; }
    try {
      await insertCode.mutateAsync({
        code: addCode.trim(), description: addDesc.trim(),
        parent_id: addParentId,
      });
      setAddCode(""); setAddDesc(""); setAddOpen(false);
      toast.success("Code added");
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function handleCsv(file: File) {
    const text = await file.text();
    const rows = parseCsv(text);
    if (!activeId) { toast.error("Pick a library first"); return; }
    if (rows.length === 0) { toast.error("No rows parsed"); return; }
    try {
      // Insert roots first
      const codeToId = new Map<string, string>();
      for (const c of codes) codeToId.set(c.code, c.id);

      const insertOne = async (r: { code: string; description: string; parent_code: string | null }) => {
        if (codeToId.has(r.code)) return;
        const parentId = r.parent_code ? codeToId.get(r.parent_code) ?? null : null;
        const parent = parentId ? codes.find((c) => c.id === parentId) : null;
        const { data, error } = await supabase.from("cost_codes" as any).insert({
          library_id: activeId,
          code: r.code,
          description: r.description,
          level: (parent?.level ?? 0) + 1,
          parent_id: parentId,
          is_active: true,
        } as any).select().single();
        if (error) throw error;
        codeToId.set(r.code, (data as any).id);
      };

      // Do roots first, then leaves
      const roots = rows.filter((r) => !r.parent_code);
      const leaves = rows.filter((r) => r.parent_code);
      for (const r of roots) await insertOne(r);
      for (const r of leaves) await insertOne(r);

      qc.invalidateQueries({ queryKey: ["cost-codes", activeId] });
      toast.success(`Imported ${rows.length} rows`);
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  function toggleExpand(id: string) {
    setExpanded((s) => {
      const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n;
    });
  }

  function renderNode(node: TreeNode, depth: number): JSX.Element {
    const isExpanded = expanded.has(node.id);
    return (
      <div key={node.id}>
        <div
          className="flex items-center gap-2 py-1.5 pr-2 text-sm hover:bg-muted/40"
          style={{ paddingLeft: 8 + depth * 16 }}
        >
          {node.children.length > 0 ? (
            <button onClick={() => toggleExpand(node.id)} className="h-5 w-5 flex items-center justify-center text-muted-foreground">
              {isExpanded
                ? <ChevronDown className="h-3.5 w-3.5" />
                : <ChevronRight className="h-3.5 w-3.5" />}
            </button>
          ) : <span className="h-5 w-5" />}
          <span className="font-mono text-xs text-muted-foreground w-20 shrink-0">{node.code}</span>
          <span className="flex-1 truncate">{node.description}</span>
          <Button
            size="icon" variant="ghost" className="h-6 w-6"
            title="Add child"
            onClick={() => { setAddParentId(node.id); setAddOpen(true); }}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon" variant="ghost" className="h-6 w-6"
            title="Archive"
            onClick={() => archiveCode.mutate(node.id)}
          >
            <Archive className="h-3.5 w-3.5" />
          </Button>
        </div>
        {isExpanded && node.children.map((c) => renderNode(c, depth + 1))}
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">Cost Code Libraries</h1>
          <p className="text-muted-foreground mt-1">
            Manage MasterFormat divisions, custom codes, and the cost-type axis.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSeedCsi} disabled={seedCsi.isPending}>
            {seedCsi.isPending ? "Seeding…" : "Seed CSI 2018"}
          </Button>
          <Button onClick={() => setNewLibOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> New library
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <aside className="lg:col-span-1">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Libraries</CardTitle></CardHeader>
            <CardContent className="space-y-1">
              {libraries.length === 0 ? (
                <p className="text-xs text-muted-foreground">No libraries yet.</p>
              ) : libraries.map((l) => (
                <button
                  key={l.id}
                  onClick={() => setLibraryId(l.id)}
                  className={cn(
                    "w-full text-left p-2 rounded-md border text-sm",
                    activeId === l.id ? "border-primary bg-primary/5" : "hover:bg-muted/40",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate">{l.name}</span>
                    {l.is_default && <Badge variant="default" className="text-[10px]">default</Badge>}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5 capitalize">
                    {l.source}
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>
        </aside>

        <section className="lg:col-span-3">
          <Card>
            <CardHeader className="flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-base">
                {active ? active.name : "No library selected"}
              </CardTitle>
              {active && (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => { setAddParentId(null); setAddOpen(true); }}>
                    <Plus className="h-4 w-4 mr-1" /> Root code
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => csvInputRef.current?.click()}>
                    <Upload className="h-4 w-4 mr-1" /> Import CSV
                  </Button>
                  <input
                    ref={csvInputRef} type="file" accept=".csv,text/csv" className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleCsv(f);
                      e.currentTarget.value = "";
                    }}
                  />
                </div>
              )}
            </CardHeader>
            <CardContent>
              {!active ? (
                <div className="p-6 text-sm text-muted-foreground text-center">
                  Create a library or seed CSI to begin.
                </div>
              ) : (
                <>
                  <Input
                    placeholder="Search code or description…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="mb-3"
                  />
                  {codes.length === 0 ? (
                    <div className="p-6 text-sm text-muted-foreground text-center">
                      No active codes in this library.
                    </div>
                  ) : (
                    <div className="rounded-md border max-h-[60vh] overflow-y-auto">
                      {tree.map((n) => renderNode(n, 0))}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground mt-3">
                    CSV format: <code className="font-mono">code,description,parent_code</code> (parent_code optional for roots).
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </section>
      </div>

      <Dialog open={newLibOpen} onOpenChange={setNewLibOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New library</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Label>Library name</Label>
            <Input value={newLibName} onChange={(e) => setNewLibName(e.target.value)}
                   placeholder="e.g. Company Custom Codes" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewLibOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateLib} disabled={createLibrary.isPending || !newLibName.trim()}>
              {createLibrary.isPending ? "Creating…" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {addParentId
                ? `Add child under ${codes.find((c) => c.id === addParentId)?.code ?? ""}`
                : "Add root code"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Code</Label>
              <Input value={addCode} onChange={(e) => setAddCode(e.target.value)}
                     placeholder="e.g. 03 30 00" />
            </div>
            <div>
              <Label>Description</Label>
              <Input value={addDesc} onChange={(e) => setAddDesc(e.target.value)}
                     placeholder="e.g. Cast-in-Place Concrete" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAddCode} disabled={insertCode.isPending || !addCode.trim() || !addDesc.trim()}>
              {insertCode.isPending ? "Adding…" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
