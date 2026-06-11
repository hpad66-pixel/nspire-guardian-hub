import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useProcoreReports, type ReportDataSource } from "@/hooks/useProcoreReports";
import { FilterRuleBuilder, type FilterRule } from "@/components/reports/FilterRuleBuilder";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

const DATA_SOURCES: Array<[ReportDataSource, string, string[]]> = [
  ["rfis",            "RFIs",             ["rfi_number","stage","question","cost_impact_cents","schedule_impact_days","date_initiated"]],
  ["submittals",      "Submittals",       ["submittal_number","submittal_type","status","final_due_date"]],
  ["punch",           "Punch items",      ["status","priority","due_date","closed_at"]],
  ["daily_logs",      "Daily logs",       ["report_date","submitted_at","superintendent_id"]],
  ["meetings",        "Meetings",         ["title","meeting_type","status","scheduled_at"]],
  ["schedule_tasks",  "Schedule tasks",   ["name","start_date","finish_date","pct_complete","is_critical"]],
  ["incidents",       "Incidents",        ["title","incident_type","severity","osha_recordable","occurred_at"]],
  ["budget_matrix",   "Budget matrix",    ["cost_code","revised_budget","committed_cost","direct_cost","variance"]],
  ["commitments",     "Commitments",      ["commitment_no","commitment_type","status","original_value","executed_date"]],
  ["change_orders",   "Change orders",    ["co_no","co_type","status","amount","days_impact","executed_date"]],
  ["direct_costs",    "Direct costs",     ["cost_type","reference_no","cost_date","amount","status"]],
  ["pay_apps",        "Pay apps",         ["pay_app_no","status","period_end","submitted_amount","approved_amount"]],
];

const EMPTY_SELECT_VALUE = "__none__";

export default function ReportBuilderPage() {
  const navigate = useNavigate();
  const { create } = useProcoreReports();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [dataSource, setDataSource] = useState<ReportDataSource>("rfis");
  const [scope, setScope] = useState<"private" | "project" | "tenant">("private");
  const [projectId, setProjectId] = useState("");
  const [columns, setColumns] = useState<string[]>([]);
  const [filters, setFilters] = useState<FilterRule[]>([]);
  const [groupBy, setGroupBy] = useState("");
  const [sort, setSort] = useState("");
  const [limit, setLimit] = useState<number | "">("");

  const availableColumns = DATA_SOURCES.find(([code]) => code === dataSource)?.[2] ?? [];

  function toggleColumn(c: string) {
    setColumns((cur) => cur.includes(c) ? cur.filter((x) => x !== c) : [...cur, c]);
  }

  async function handleSave() {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    const normalizedGroupBy = groupBy === EMPTY_SELECT_VALUE ? null : groupBy || null;
    const normalizedSort = sort === EMPTY_SELECT_VALUE ? null : sort || null;
    try {
      await create.mutateAsync({
        name: name.trim(),
        description: description.trim() || null,
        data_source: dataSource,
        scope,
        project_id: scope === "project" ? (projectId || null) : null,
        config: {
          columns: columns.length > 0 ? columns : undefined,
          filters: filters.map((f) => ({ op: f.op, column: f.column, value: f.value })),
          group_by: normalizedGroupBy ?? undefined,
          sort: normalizedSort ?? undefined,
          limit: typeof limit === "number" ? limit : undefined,
        },
      });
      toast.success("Report saved");
      navigate("/reports/procore");
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">New report</h1>
        <p className="text-muted-foreground mt-1">
          Pick a data source, columns, filters, and save. Reports respect RLS —
          results reflect the runner's permissions.
        </p>
      </div>

      <Card>
        <CardHeader><CardTitle>Basics</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Open RFIs by assignee" />
          </div>
          <div>
            <Label>Description (optional)</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Data source</Label>
              <Select value={dataSource} onValueChange={(v) => { setDataSource(v as ReportDataSource); setColumns([]); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DATA_SOURCES.map(([code, label]) => (
                    <SelectItem key={code} value={code}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Scope</Label>
              <Select value={scope} onValueChange={(v) => setScope(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="private">Private (you only)</SelectItem>
                  <SelectItem value="project">Project (project members)</SelectItem>
                  <SelectItem value="tenant">Tenant (everyone)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {scope === "project" && (
            <div>
              <Label>Project ID</Label>
              <Input value={projectId} onChange={(e) => setProjectId(e.target.value)} placeholder="uuid" />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Columns</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {availableColumns.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => toggleColumn(c)}
                className={`text-xs rounded-full border px-3 py-1 font-mono ${
                  columns.includes(c) ? "bg-primary text-primary-foreground border-primary" : ""
                }`}
              >
                {c}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            If none selected, all columns are returned.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Filters</CardTitle></CardHeader>
        <CardContent>
          <FilterRuleBuilder rules={filters} columns={availableColumns} onChange={setFilters} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Group, sort, limit</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-3 gap-3">
          <div>
            <Label>Group by</Label>
            <Select value={groupBy || EMPTY_SELECT_VALUE} onValueChange={setGroupBy}>
              <SelectTrigger><SelectValue placeholder="none" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={EMPTY_SELECT_VALUE}>—</SelectItem>
                {availableColumns.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Sort by</Label>
            <Select value={sort || EMPTY_SELECT_VALUE} onValueChange={setSort}>
              <SelectTrigger><SelectValue placeholder="default" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={EMPTY_SELECT_VALUE}>—</SelectItem>
                {availableColumns.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Limit</Label>
            <Input
              type="number" min={1}
              value={limit} onChange={(e) => setLimit(e.target.value ? Number(e.target.value) : "")}
              placeholder="e.g. 100"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => navigate("/reports/procore")}>Cancel</Button>
        <Button onClick={handleSave} disabled={create.isPending}>
          {create.isPending ? "Saving…" : "Save report"}
        </Button>
      </div>
    </div>
  );
}
