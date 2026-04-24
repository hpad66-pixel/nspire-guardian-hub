/**
 * A4 · WorkflowEditor — module-scoped workflow definition editor.
 *
 * Owner-admins pick a module (RFI, Submittal, Punch, CO, Pay App…), then
 * either clone the default definition into a new version or edit the steps
 * directly. Each step has a sequence number, state name, assignee rule, and
 * optional SLA (due_offset_days).
 *
 * This is the design-time counterpart to `src/lib/workflow-engine.ts` — the
 * engine consumes these definitions when creating workflow instances.
 */
import { useEffect, useMemo, useState } from "react";
import {
  useWorkflowDefinitions, useWorkflowSteps,
  type WorkflowStep, type WorkflowDefinition,
} from "@/hooks/useWorkflowDefinitions";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ChevronUp, ChevronDown, Plus, Trash2, Copy, Save } from "lucide-react";
import { toast } from "sonner";

const MODULES = [
  "rfi", "submittal", "punch_item",
  "change_order", "potential_change_order",
  "prime_change_order", "commitment_change_order",
  "prime_pay_application", "commitment_pay_application",
  "inspection", "meeting", "daily_log",
] as const;

const ASSIGNEE_RULES = [
  { value: "role:PM",                          label: "Role · PM" },
  { value: "role:Superintendent",              label: "Role · Superintendent" },
  { value: "role:Owner",                       label: "Role · Owner" },
  { value: "role:Architect",                   label: "Role · Architect" },
  { value: "field:responsible_contractor_id",  label: "Record field · responsible contractor" },
  { value: "field:rfi_manager_id",             label: "Record field · RFI manager" },
  { value: "field:assignee_id",                label: "Record field · assignee" },
  { value: "explicit",                         label: "Explicit (caller-provided)" },
];

type DraftStep = Omit<WorkflowStep, "id" | "definition_id">;

function blankStep(): DraftStep {
  return {
    sequence: 0, state_name: "pending",
    assignee_rule: "role:PM", due_offset_days: null, auto_actions: {},
  };
}

export function WorkflowEditor() {
  const [module, setModule] = useState<string>("rfi");
  const { data: definitions = [], create, setDefault } = useWorkflowDefinitions(module);
  const [activeId, setActiveId] = useState<string | null>(null);
  const { data: steps = [], replaceAll } = useWorkflowSteps(activeId);

  // Draft editor state — sync when activeId or saved steps change.
  const [draft, setDraft] = useState<DraftStep[]>([]);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setDraft(steps.map((s) => ({
      sequence: s.sequence,
      state_name: s.state_name,
      assignee_rule: s.assignee_rule,
      due_offset_days: s.due_offset_days,
      auto_actions: s.auto_actions ?? {},
    })));
    setDirty(false);
  }, [activeId, steps]);

  // When the module changes, pre-select its default definition.
  useEffect(() => {
    const def = definitions.find((d) => d.is_default) ?? definitions[0] ?? null;
    setActiveId(def?.id ?? null);
  }, [module, definitions]);

  const activeDef = useMemo<WorkflowDefinition | null>(
    () => definitions.find((d) => d.id === activeId) ?? null,
    [definitions, activeId],
  );

  const [newName, setNewName] = useState("");

  async function handleCreate(cloneFromId?: string) {
    const name = newName.trim() || `${module} workflow`;
    try {
      const def = await create.mutateAsync({ module, name, cloneFromId });
      setActiveId(def.id);
      setNewName("");
      toast.success(`Created ${def.name} v${def.version}`);
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function handleSetDefault() {
    if (!activeDef) return;
    try {
      await setDefault.mutateAsync({ definitionId: activeDef.id, module });
      toast.success("Marked as default");
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  function addStep() {
    setDraft((d) => [...d, { ...blankStep(), sequence: d.length + 1 }]);
    setDirty(true);
  }
  function updateStep(i: number, patch: Partial<DraftStep>) {
    setDraft((d) => d.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
    setDirty(true);
  }
  function removeStep(i: number) {
    setDraft((d) => d.filter((_, idx) => idx !== i));
    setDirty(true);
  }
  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= draft.length) return;
    const next = draft.slice();
    [next[i], next[j]] = [next[j], next[i]];
    setDraft(next);
    setDirty(true);
  }

  async function handleSave() {
    try {
      await replaceAll.mutateAsync(draft);
      toast.success(`Saved ${draft.length} step${draft.length === 1 ? "" : "s"}`);
      setDirty(false);
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Workflow definition</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <Label>Module</Label>
            <Select value={module} onValueChange={(v) => setModule(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {MODULES.map((m) => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Version</Label>
            <Select value={activeId ?? ""} onValueChange={(v) => setActiveId(v)}>
              <SelectTrigger>
                <SelectValue placeholder="No definitions for this module yet" />
              </SelectTrigger>
              <SelectContent>
                {definitions.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name} · v{d.version}
                    {d.is_default && <span className="text-xs text-muted-foreground ml-2">· default</span>}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2">
            <Label>New version name</Label>
            <div className="flex gap-2">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={`e.g. ${module} v${(definitions[0]?.version ?? 0) + 1}`}
              />
              <Button
                variant="outline"
                onClick={() => handleCreate(activeId ?? undefined)}
                disabled={create.isPending}
                title="Clone active definition as a new version"
              >
                <Copy className="h-4 w-4 mr-1" /> Clone
              </Button>
              <Button onClick={() => handleCreate()} disabled={create.isPending}>
                {create.isPending ? "Creating…" : "New"}
              </Button>
            </div>
          </div>
          <div className="md:col-span-4 flex items-center gap-2">
            {activeDef && (
              <>
                <Badge variant={activeDef.is_default ? "default" : "outline"}>
                  {activeDef.is_default ? "Default" : "Not default"}
                </Badge>
                {!activeDef.is_default && (
                  <Button size="sm" variant="outline"
                          onClick={handleSetDefault} disabled={setDefault.isPending}>
                    Set as default
                  </Button>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2 flex-row items-center justify-between">
          <CardTitle className="text-base">Steps · {draft.length}</CardTitle>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={addStep} disabled={!activeId}>
              <Plus className="h-4 w-4 mr-1" /> Add step
            </Button>
            <Button size="sm" onClick={handleSave}
                    disabled={!activeId || !dirty || replaceAll.isPending}>
              <Save className="h-4 w-4 mr-1" />
              {replaceAll.isPending ? "Saving…" : "Save"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!activeId ? (
            <div className="text-sm text-muted-foreground p-6 text-center">
              Pick or create a definition to edit its steps.
            </div>
          ) : draft.length === 0 ? (
            <div className="text-sm text-muted-foreground p-6 text-center">
              No steps yet — use <strong>Add step</strong> to configure the workflow.
            </div>
          ) : (
            <div className="rounded-md border divide-y">
              {draft.map((s, i) => (
                <div key={i} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end p-3">
                  <div className="md:col-span-1">
                    <Label className="text-xs">Seq</Label>
                    <div className="font-mono text-sm">#{i + 1}</div>
                  </div>
                  <div className="md:col-span-3">
                    <Label className="text-xs">State name</Label>
                    <Input
                      value={s.state_name}
                      onChange={(e) => updateStep(i, { state_name: e.target.value })}
                      placeholder="e.g. pm_review"
                      className="h-8"
                    />
                  </div>
                  <div className="md:col-span-4">
                    <Label className="text-xs">Assignee rule</Label>
                    <Select
                      value={s.assignee_rule}
                      onValueChange={(v) => updateStep(i, { assignee_rule: v })}
                    >
                      <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ASSIGNEE_RULES.map((r) => (
                          <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-2">
                    <Label className="text-xs">SLA (days)</Label>
                    <Input
                      type="number" min={0}
                      value={s.due_offset_days ?? ""}
                      onChange={(e) => updateStep(i, {
                        due_offset_days: e.target.value ? Number(e.target.value) : null,
                      })}
                      className="h-8"
                    />
                  </div>
                  <div className="md:col-span-2 flex justify-end gap-1">
                    <Button size="icon" variant="ghost" className="h-8 w-8"
                            onClick={() => move(i, -1)} disabled={i === 0}>
                      <ChevronUp className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8"
                            onClick={() => move(i, 1)} disabled={i === draft.length - 1}>
                      <ChevronDown className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8"
                            onClick={() => removeStep(i)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
