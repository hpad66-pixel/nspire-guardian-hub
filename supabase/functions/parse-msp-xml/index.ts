/**
 * E1 · parse-msp-xml edge function.
 *
 * Accepts a Microsoft Project XML export (the ".xml" format produced by
 * File → Save As → XML in MS Project) and writes the Tasks + Predecessors
 * into `schedules` / `schedule_tasks` / `schedule_predecessors`.
 *
 * Request body (JSON):
 *   { schedule_id: string, xml: string }
 *   — `schedule_id` must already exist (created by useCreateSchedule).
 *   — `xml` is the full MSP XML document as text.
 *
 * Response: { ok, tasks_inserted, predecessors_inserted }
 *
 * This is a pragmatic parser — it reads the elements we need (UID, Name,
 * Start, Finish, Duration, Milestone, PercentComplete, PredecessorLink) and
 * ignores resource, calendar, and cost blocks. Duration comes as ISO8601
 * ("PT8H0M0S") which we convert into days by assuming 8-hour working days.
 */
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { DOMParser, Element } from "https://deno.land/x/deno_dom@v0.1.46/deno-dom-wasm.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, content-type",
};

interface Payload { schedule_id: string; xml: string; }

// ISO8601 duration → whole days (round-up on half days).
function isoDurationToDays(d: string | null): number | null {
  if (!d) return null;
  const m = d.match(/^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/);
  if (!m) return null;
  const days = Number(m[1] ?? 0);
  const hours = Number(m[2] ?? 0);
  const mins = Number(m[3] ?? 0);
  const totalHours = days * 8 + hours + mins / 60;
  return Math.max(0, Math.round(totalHours / 8));
}

function text(parent: Element, tag: string): string | null {
  const el = parent.querySelector(tag);
  return el ? el.textContent.trim() : null;
}

function date(parent: Element, tag: string): string | null {
  const raw = text(parent, tag);
  if (!raw) return null;
  // MSP emits "2026-04-22T09:00:00" — slice to date portion
  const isoDay = raw.split("T")[0];
  return /^\d{4}-\d{2}-\d{2}$/.test(isoDay) ? isoDay : null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: CORS });
  }

  try {
    const { schedule_id, xml } = (await req.json()) as Payload;
    if (!schedule_id || !xml) {
      return new Response(JSON.stringify({ error: "schedule_id + xml required" }),
        { status: 400, headers: { ...CORS, "Content-Type": "application/json" } });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } },
    );

    const doc = new DOMParser().parseFromString(xml, "text/html");
    if (!doc) throw new Error("Could not parse XML");

    // Wipe existing children for idempotent re-imports.
    await supabase.from("schedule_predecessors").delete()
      .in("task_id", (
        (await supabase.from("schedule_tasks").select("id").eq("schedule_id", schedule_id)).data ?? []
      ).map((r: any) => r.id));
    await supabase.from("schedule_tasks").delete().eq("schedule_id", schedule_id);

    const taskEls = doc.querySelectorAll("Task");
    const uidToId = new Map<string, string>();
    const tasksToInsert: any[] = [];

    taskEls.forEach((node) => {
      const task = node as unknown as Element;
      const uid = text(task, "UID");
      const name = text(task, "Name");
      if (!uid || !name) return;
      if (uid === "0") return; // root project task, skip

      tasksToInsert.push({
        schedule_id,
        task_code: text(task, "OutlineNumber") ?? uid,
        name,
        start_date: date(task, "Start"),
        finish_date: date(task, "Finish"),
        duration_days: isoDurationToDays(text(task, "Duration")),
        pct_complete: Math.min(100, Math.max(0, Number(text(task, "PercentComplete") ?? 0))),
        is_milestone: text(task, "Milestone") === "1",
        is_critical: text(task, "Critical") === "1",
        wbs_path: text(task, "WBS"),
      });
      // defer id capture until after insert
      uidToId.set(uid, ""); // placeholder
    });

    let tasksInserted = 0;
    if (tasksToInsert.length > 0) {
      const { data, error } = await supabase
        .from("schedule_tasks").insert(tasksToInsert).select("id, task_code");
      if (error) throw error;
      tasksInserted = data?.length ?? 0;
      // Re-walk XML to map UID → inserted id using task_code correlation.
      taskEls.forEach((node) => {
        const task = node as unknown as Element;
        const uid = text(task, "UID");
        const outline = text(task, "OutlineNumber") ?? uid;
        if (!uid || uid === "0") return;
        const match = (data ?? []).find((r: any) => r.task_code === outline);
        if (match) uidToId.set(uid, match.id);
      });
    }

    const predsToInsert: any[] = [];
    taskEls.forEach((node) => {
      const task = node as unknown as Element;
      const uid = text(task, "UID");
      if (!uid || uid === "0") return;
      const taskId = uidToId.get(uid);
      if (!taskId) return;

      task.querySelectorAll("PredecessorLink").forEach((linkNode) => {
        const link = linkNode as unknown as Element;
        const predUid = text(link, "PredecessorUID");
        const relation = text(link, "Type"); // 0 FF, 1 FS, 2 SF, 3 SS
        const lagRaw = text(link, "LinkLag"); // minutes * 10
        if (!predUid) return;
        const predId = uidToId.get(predUid);
        if (!predId) return;

        const rel = relation === "0" ? "FF"
                  : relation === "2" ? "SF"
                  : relation === "3" ? "SS"
                  : "FS";
        const lagMinutes = lagRaw ? Number(lagRaw) / 10 : 0;
        const lagDays = Math.round(lagMinutes / (8 * 60));
        predsToInsert.push({
          task_id: taskId,
          predecessor_task_id: predId,
          relation: rel,
          lag_days: lagDays,
        });
      });
    });

    let predsInserted = 0;
    if (predsToInsert.length > 0) {
      const { data, error } = await supabase
        .from("schedule_predecessors")
        .upsert(predsToInsert, { onConflict: "task_id,predecessor_task_id" })
        .select("task_id");
      if (error) throw error;
      predsInserted = data?.length ?? 0;
    }

    // Stamp imported_at + source on the schedule.
    await supabase.from("schedules").update({
      source: "msp", imported_at: new Date().toISOString(),
    }).eq("id", schedule_id);

    return new Response(JSON.stringify({
      ok: true, tasks_inserted: tasksInserted, predecessors_inserted: predsInserted,
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
