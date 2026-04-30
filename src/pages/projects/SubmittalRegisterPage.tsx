/**
 * C2 · SubmittalRegisterPage — tabular view of every item in the
 * `submittal_register_items` table for the active project.
 *
 * The register is the contractor-side submittal roadmap: one row per
 * specification requirement, filterable by status + section. Rows are
 * generated automatically by the GenerateRegisterButton on the
 * Specifications page, or inserted manually by the PM.
 *
 * Route: /projects/:projectId/submittals/register
 */
import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useSubmittalRegister } from "@/hooks/useProcoreSubmittals";
import { GenerateRegisterButton } from "@/components/specs/GenerateRegisterButton";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ArrowLeft } from "lucide-react";

const STATUS_ORDER = [
  "required", "submitted", "approved", "approved_as_noted",
  "revise", "rejected", "closed", "waived",
];

export default function SubmittalRegisterPage() {
  const { projectId = "" } = useParams<{ projectId: string }>();
  const { data: rows = [], isLoading } = useSubmittalRegister(projectId || null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r: any) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (!q) return true;
      return (r.required_type ?? "").toLowerCase().includes(q) ||
             (r.description ?? "").toLowerCase().includes(q) ||
             (r.status ?? "").toLowerCase().includes(q);
    });
  }, [rows, search, statusFilter]);

  const counts = useMemo(() => {
    const out: Record<string, number> = {};
    for (const r of rows as any[]) {
      out[r.status] = (out[r.status] ?? 0) + 1;
    }
    return out;
  }, [rows]);

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <Link
            to={`/projects/${projectId}/submittals`}
            className="text-sm text-muted-foreground hover:underline inline-flex items-center gap-1"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to submittals
          </Link>
          <h1 className="text-3xl font-bold mt-1">Submittal register</h1>
          <p className="text-muted-foreground mt-1">
            Roadmap of required submittals, generated from active specifications.
          </p>
        </div>
        {projectId && <GenerateRegisterButton projectId={projectId} />}
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="flex flex-wrap gap-1.5">
          {STATUS_ORDER.map((s) => (
            <Badge key={s} variant={statusFilter === s ? "default" : "outline"}
                   className="cursor-pointer capitalize"
                   onClick={() => setStatusFilter(statusFilter === s ? "all" : s)}>
              {s.replaceAll("_", " ")} · {counts[s] ?? 0}
            </Badge>
          ))}
        </div>
        <div className="flex-1 min-w-[200px]">
          <Input
            placeholder="Search type / description / status…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUS_ORDER.map((s) => (
              <SelectItem key={s} value={s} className="capitalize">
                {s.replaceAll("_", " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 text-sm text-muted-foreground">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              {rows.length === 0
                ? "No register rows yet. Use Generate register to populate from specs."
                : "No rows match the current filter."}
            </div>
          ) : (
            <div className="max-h-[70vh] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/60 text-xs uppercase text-muted-foreground sticky top-0">
                  <tr>
                    <th className="text-left px-3 py-2">Type</th>
                    <th className="text-left px-3 py-2">Description</th>
                    <th className="text-left px-3 py-2">Status</th>
                    <th className="text-left px-3 py-2">Due</th>
                  </tr>
                </thead>
                <tbody>
                  {(filtered as any[]).map((r) => (
                    <tr key={r.id} className="border-t">
                      <td className="px-3 py-2">{r.required_type ?? "—"}</td>
                      <td className="px-3 py-2 truncate max-w-[48ch]">
                        {r.description ?? "—"}
                      </td>
                      <td className="px-3 py-2">
                        <Badge variant="outline" className="capitalize">
                          {(r.status ?? "required").replaceAll("_", " ")}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 tabular-nums">{r.due_date ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
