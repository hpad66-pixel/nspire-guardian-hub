/**
 * A5 · ProjectCostCodesPage — per-project cost-code enablement + alias editor.
 *
 * By default every cost_code in the tenant's default library is enabled for
 * every project. This page lets a PM:
 *   - Toggle individual codes off (won't appear in SOV pickers, PCO forms, etc.)
 *   - Alias a code for this project (e.g. "03 30 00 → Slab Mix A").
 *
 * Writes to `project_cost_code_overrides`. Rows only exist for codes that
 * differ from the default (either `is_enabled = false` or a non-null alias).
 *
 * Route: /projects/:projectId/cost-codes
 */
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  useDefaultLibrary, useCostCodes,
} from "@/hooks/useCostCodes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

interface OverrideRow {
  project_id: string;
  cost_code_id: string;
  alias: string | null;
  is_enabled: boolean;
}

export default function ProjectCostCodesPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const qc = useQueryClient();
  const { data: defaultLib } = useDefaultLibrary();
  const { data: codes = [] } = useCostCodes(defaultLib?.id ?? null);

  const { data: overrides = [] } = useQuery<OverrideRow[]>({
    queryKey: ["project-cost-code-overrides", projectId],
    enabled: Boolean(projectId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_cost_code_overrides" as any)
        .select("*")
        .eq("project_id", projectId!);
      if (error) throw error;
      return (data ?? []) as unknown as OverrideRow[];
    },
  });

  const overrideMap = useMemo(() => {
    const m = new Map<string, OverrideRow>();
    for (const o of overrides) m.set(o.cost_code_id, o);
    return m;
  }, [overrides]);

  const upsert = useMutation({
    mutationFn: async (input: { codeId: string; alias: string | null; isEnabled: boolean }) => {
      if (!projectId) throw new Error("No project");
      // If the row matches defaults (enabled + no alias), delete instead.
      const isDefault = input.isEnabled && !input.alias;
      if (isDefault) {
        await supabase.from("project_cost_code_overrides" as any)
          .delete()
          .eq("project_id", projectId)
          .eq("cost_code_id", input.codeId);
        return;
      }
      const { error } = await supabase
        .from("project_cost_code_overrides" as any)
        .upsert({
          project_id: projectId,
          cost_code_id: input.codeId,
          alias: input.alias,
          is_enabled: input.isEnabled,
        } as any, { onConflict: "project_id,cost_code_id" });
      if (error) throw error;
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["project-cost-code-overrides", projectId] }),
  });

  const [search, setSearch] = useState("");

  // Local alias drafts (committed on blur).
  const [aliasDraft, setAliasDraft] = useState<Record<string, string>>({});
  useEffect(() => {
    const next: Record<string, string> = {};
    for (const o of overrides) if (o.alias) next[o.cost_code_id] = o.alias;
    setAliasDraft(next);
  }, [overrides]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return codes;
    return codes.filter(
      (c) => c.code.toLowerCase().includes(q) || c.description.toLowerCase().includes(q),
    );
  }, [codes, search]);

  async function commitAlias(codeId: string) {
    const alias = (aliasDraft[codeId] ?? "").trim();
    const existing = overrideMap.get(codeId);
    const isEnabled = existing?.is_enabled ?? true;
    if ((existing?.alias ?? "") === alias) return;
    try {
      await upsert.mutateAsync({
        codeId, alias: alias || null, isEnabled,
      });
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function toggleEnabled(codeId: string, next: boolean) {
    const existing = overrideMap.get(codeId);
    try {
      await upsert.mutateAsync({
        codeId, alias: existing?.alias ?? null, isEnabled: next,
      });
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  const overriddenCount = overrides.filter((o) => !o.is_enabled || o.alias).length;

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Project cost codes</h1>
        <p className="text-muted-foreground mt-1">
          Disable codes this project doesn't use, or alias them for project-specific naming.
        </p>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-2 pb-2">
          <CardTitle className="text-base">
            Library: {defaultLib?.name ?? "— no default library —"}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              {overriddenCount} override{overriddenCount === 1 ? "" : "s"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Search codes…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mb-3"
          />

          {!defaultLib ? (
            <div className="text-sm text-muted-foreground p-6 text-center">
              No default library — seed one from <strong>Admin → Cost Codes</strong>.
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-sm text-muted-foreground p-6 text-center">
              No codes match.
            </div>
          ) : (
            <div className="rounded-md border divide-y max-h-[65vh] overflow-y-auto">
              {filtered.map((c) => {
                const ov = overrideMap.get(c.id);
                const isEnabled = ov?.is_enabled ?? true;
                return (
                  <div key={c.id} className="grid grid-cols-12 items-center gap-3 p-2 text-sm">
                    <div className="col-span-1 flex justify-center">
                      <Switch
                        checked={isEnabled}
                        onCheckedChange={(v) => toggleEnabled(c.id, v)}
                        aria-label="Enabled for project"
                      />
                    </div>
                    <div className="col-span-2 font-mono text-xs">{c.code}</div>
                    <div className="col-span-5 truncate">{c.description}</div>
                    <div className="col-span-4">
                      <Input
                        className="h-8"
                        placeholder="(project alias — optional)"
                        value={aliasDraft[c.id] ?? ""}
                        onChange={(e) => setAliasDraft({ ...aliasDraft, [c.id]: e.target.value })}
                        onBlur={() => commitAlias(c.id)}
                        disabled={!isEnabled}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {overriddenCount > 0 && (
            <div className="mt-3">
              <Button
                variant="outline" size="sm"
                onClick={async () => {
                  if (!confirm("Revert every override to default? This cannot be undone.")) return;
                  try {
                    await supabase.from("project_cost_code_overrides" as any)
                      .delete().eq("project_id", projectId);
                    qc.invalidateQueries({ queryKey: ["project-cost-code-overrides", projectId] });
                    toast.success("All overrides cleared");
                  } catch (e: any) {
                    toast.error(e.message);
                  }
                }}
              >
                Reset all to defaults
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
