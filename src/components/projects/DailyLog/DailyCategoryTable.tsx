/**
 * C4 · DailyCategoryTable — generic CRUD grid for a daily_log child table.
 *
 * Each daily-log child table (manpower / equipment / deliveries / …) shares
 * the same shape: rows keyed by `id`, belonging to a `daily_report_id`. This
 * component encapsulates the "show rows → edit inline → add → delete" flow,
 * driven by a column schema supplied by the caller.
 */
import { useState } from "react";
import { useDailyCategory } from "@/hooks/useDailyLog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export type ColumnType = "text" | "number" | "time";

export interface ColumnDef<TRow> {
  key: keyof TRow & string;
  header: string;
  type?: ColumnType;
  placeholder?: string;
  width?: string;
}

export interface DailyCategoryTableProps<TRow> {
  table: string;
  dailyReportId: string | null;
  columns: ColumnDef<TRow>[];
  /** Label shown when the table has no rows. */
  emptyText?: string;
  /** Build a blank row for the "+Add" action. */
  buildEmpty: () => Partial<TRow>;
}

export function DailyCategoryTable<TRow extends { id: string }>({
  table, dailyReportId, columns, emptyText, buildEmpty,
}: DailyCategoryTableProps<TRow>) {
  const { data: rows = [], add, update, remove, isLoading } =
    useDailyCategory<TRow>(table, dailyReportId);

  const [draft, setDraft] = useState<Partial<TRow>>(buildEmpty());

  async function handleAdd() {
    try {
      await add.mutateAsync(draft);
      setDraft(buildEmpty());
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function handlePatch(id: string, patch: Partial<TRow>) {
    try {
      await update.mutateAsync({ id, patch });
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function handleRemove(id: string) {
    try {
      await remove.mutateAsync(id);
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  if (!dailyReportId) {
    return (
      <div className="text-sm text-muted-foreground p-6 text-center">
        Create the daily report first to enter rows.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Inline add row */}
      <div className="rounded-md border bg-muted/20 p-2 grid grid-cols-12 gap-2 items-end">
        {columns.map((c) => (
          <div key={c.key} style={{ gridColumn: `span ${parseColSpan(c.width)}` }}>
            <label className="text-xs text-muted-foreground block mb-1">
              {c.header}
            </label>
            <Input
              className="h-8"
              type={c.type ?? "text"}
              value={(draft[c.key] ?? "") as any}
              placeholder={c.placeholder}
              onChange={(e) => {
                const raw = e.target.value;
                const next = c.type === "number"
                  ? (raw === "" ? null : Number(raw)) as any
                  : raw as any;
                setDraft({ ...draft, [c.key]: next });
              }}
            />
          </div>
        ))}
        <div className="col-span-1 flex justify-end">
          <Button size="sm" onClick={handleAdd} disabled={add.isPending}>
            <Plus className="h-4 w-4 mr-1" /> Add
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground p-3">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="text-sm text-muted-foreground border rounded-md p-6 text-center">
          {emptyText ?? "No rows yet."}
        </div>
      ) : (
        <div className="rounded-md border divide-y">
          {rows.map((row) => (
            <div key={row.id} className="grid grid-cols-12 gap-2 items-center p-2">
              {columns.map((c) => (
                <div key={c.key} style={{ gridColumn: `span ${parseColSpan(c.width)}` }}>
                  <Input
                    className="h-8"
                    type={c.type ?? "text"}
                    defaultValue={(row as any)[c.key] ?? ""}
                    onBlur={(e) => {
                      const raw = e.target.value;
                      const next = c.type === "number"
                        ? (raw === "" ? null : Number(raw))
                        : raw;
                      if ((row as any)[c.key] !== next) {
                        handlePatch(row.id, { [c.key]: next } as Partial<TRow>);
                      }
                    }}
                  />
                </div>
              ))}
              <div className="col-span-1 flex justify-end">
                <Button
                  size="icon" variant="ghost" className="h-7 w-7"
                  onClick={() => handleRemove(row.id)}
                  disabled={remove.isPending}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Accept widths like "col-span-3" or "3" or undefined → default 3. */
function parseColSpan(raw: string | undefined): number {
  if (!raw) return 3;
  const m = raw.match(/(\d+)/);
  return m ? Math.max(1, Math.min(11, Number(m[1]))) : 3;
}
