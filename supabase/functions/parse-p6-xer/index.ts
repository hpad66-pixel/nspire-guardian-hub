/**
 * E1 · parse-p6-xer edge function.
 *
 * Parses a Primavera P6 XER export into `schedule_tasks` + `schedule_predecessors`.
 *
 * XER is a plain-text format organized by tables:
 *
 *   %T <TABLE>
 *   %F col1\tcol2\t…
 *   %R v1\tv2\t…
 *   %R …
 *   %E   ← end of file
 *
 * We read TASK (activities) and TASKPRED (relationships). Milestones appear
 * as `task_type = 'TT_Mile'`; durations are in hours (`target_drtn_hr_cnt`).
 *
 * Request body (JSON):
 *   { schedule_id: string, xer: string }
 * Response: { ok, tasks_inserted, predecessors_inserted }
 */
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, content-type",
};

interface Payload { schedule_id: string; xer: string; }

interface XerTable {
  name: string;
  columns: string[];
  rows: string[][];
}

/** Tokenize an XER document into a map of table name → rows. */
function parseXer(xer: string): Map<string, XerTable> {
  const tables = new Map<string, XerTable>();
  let current: XerTable | null = null;
  for (const rawLine of xer.split(/\r?\n/)) {
    if (!rawLine) continue;
    if (rawLine.startsWith("%T\t")) {
      const name = rawLine.slice(3).trim();
      current = { name, columns: [], rows: [] };
      tables.set(name, current);
    } else if (rawLine.startsWith("%F\t") && current) {
      current.columns = rawLine.slice(3).split("\t").map((s) => s.trim());
    } else if (rawLine.startsWith("%R\t") && current) {
      current.rows.push(rawLine.slice(3).split("\t"));
    } else if (rawLine.startsWith("%E")) {
      current = null;
    }
  }
  return tables;
}

function rowsAsObjects(t: XerTable | undefined): Record<string, string>[] {
  if (!t) return [];
  return t.rows.map((r) => {
    const obj: Record<string, string> = {};
    t.columns.forEach((c, i) => { obj[c] = r[i] ?? ""; });
    return obj;
  });
}

/** Coerce P6 date "YYYY-MM-DD HH:MM" → "YYYY-MM-DD"; blank → null. */
function toDate(raw: string | undefined): string | null {
  if (!raw) return null;
  const s = raw.trim();
  if (!s) return null;
  return s.split(" ")[0];
}

function mapRelation(raw: string | undefined): "FS" | "SS" | "FF" | "SF" {
  const r = (raw ?? "").toUpperCase();
  if (r.includes("PR_FS")) return "FS";
  if (r.includes("PR_SS")) return "SS";
  if (r.includes("PR_FF")) return "FF";
  if (r.includes("PR_SF")) return "SF";
  return "FS";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: CORS });
  }

  try {
    const { schedule_id, xer } = (await req.json()) as Payload;
    if (!schedule_id || !xer) {
      return new Response(JSON.stringify({ error: "schedule_id + xer required" }),
        { status: 400, headers: { ...CORS, "Content-Type": "application/json" } });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } },
    );

    const tables = parseXer(xer);
    const tasks = rowsAsObjects(tables.get("TASK"));
    const preds = rowsAsObjects(tables.get("TASKPRED"));

    // Drop prior import so the re-run is idempotent.
    await supabase.from("schedule_predecessors").delete().in(
      "task_id",
      ((await supabase.from("schedule_tasks").select("id").eq("schedule_id", schedule_id)).data ?? [])
        .map((r: any) => r.id),
    );
    await supabase.from("schedule_tasks").delete().eq("schedule_id", schedule_id);

    // Insert tasks.
    const tasksToInsert = tasks.map((t) => ({
      schedule_id,
      task_code: t["task_code"] || t["task_id"] || null,
      name: t["task_name"] || t["task_code"] || "(unnamed)",
      start_date: toDate(t["target_start_date"] || t["early_start_date"]),
      finish_date: toDate(t["target_end_date"] || t["early_end_date"]),
      duration_days: (() => {
        const hrs = Number(t["target_drtn_hr_cnt"] ?? 0);
        return Number.isFinite(hrs) ? Math.round(hrs / 8) : null;
      })(),
      pct_complete: (() => {
        const p = Number(t["phys_complete_pct"] ?? t["act_work_qty"] ?? 0);
        return Math.min(100, Math.max(0, p));
      })(),
      is_milestone: (t["task_type"] ?? "").includes("Mile"),
      is_critical: (t["driving_path_flag"] ?? "").toUpperCase() === "Y",
      wbs_path: t["wbs_id"] || null,
    }));

    let tasksInserted = 0;
    const taskIdToNewId = new Map<string, string>();
    if (tasksToInsert.length > 0) {
      const { data, error } = await supabase
        .from("schedule_tasks").insert(tasksToInsert).select("id, task_code");
      if (error) throw error;
      tasksInserted = data?.length ?? 0;
      // Map XER task_id → our new schedule_tasks.id via task_code.
      const codeToNewId = new Map<string, string>();
      (data ?? []).forEach((r: any) => codeToNewId.set(r.task_code, r.id));
      tasks.forEach((t) => {
        const code = t["task_code"] || t["task_id"];
        if (!code) return;
        const newId = codeToNewId.get(code);
        if (newId) taskIdToNewId.set(t["task_id"] ?? code, newId);
      });
    }

    const predsToInsert = preds.map((p) => {
      const taskId = taskIdToNewId.get(p["task_id"]);
      const predId = taskIdToNewId.get(p["pred_task_id"]);
      if (!taskId || !predId) return null;
      return {
        task_id: taskId,
        predecessor_task_id: predId,
        relation: mapRelation(p["pred_type"]),
        lag_days: Math.round(Number(p["lag_hr_cnt"] ?? 0) / 8),
      };
    }).filter((x): x is NonNullable<typeof x> => x !== null);

    let predsInserted = 0;
    if (predsToInsert.length > 0) {
      const { data, error } = await supabase
        .from("schedule_predecessors")
        .upsert(predsToInsert, { onConflict: "task_id,predecessor_task_id" })
        .select("task_id");
      if (error) throw error;
      predsInserted = data?.length ?? 0;
    }

    await supabase.from("schedules").update({
      source: "p6", imported_at: new Date().toISOString(),
    }).eq("id", schedule_id);

    return new Response(JSON.stringify({
      ok: true,
      tasks_inserted: tasksInserted,
      predecessors_inserted: predsInserted,
    }), {
      status: 200,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
