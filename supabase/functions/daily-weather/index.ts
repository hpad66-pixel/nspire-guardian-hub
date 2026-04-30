/**
 * C4 · daily-weather edge function.
 *
 * Fetches NOAA's free forecast for a project's lat/lng (via the Open-Meteo
 * API — no API key required) and patches the daily_reports row with
 * weather_high_f / weather_low_f / weather_description / precip_in / wind_mph.
 *
 * Request body: { report_id: string }
 *   - Looks up the daily_reports row + project's lat/lng.
 *   - Calls Open-Meteo for the log_date.
 *   - Updates the row.
 *
 * Returns the patched row. Auth: supabase session JWT (RLS keeps the update
 * scoped to the caller's tenant).
 */
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, content-type",
};

interface Payload { report_id: string; }

interface OpenMeteoResponse {
  daily?: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_sum: number[];
    windspeed_10m_max: number[];
    weathercode: number[];
  };
}

// Minimal weathercode → text mapping per WMO codes.
const WMO: Record<number, string> = {
  0: "Clear", 1: "Mostly clear", 2: "Partly cloudy", 3: "Overcast",
  45: "Fog", 48: "Freezing fog",
  51: "Light drizzle", 53: "Drizzle", 55: "Heavy drizzle",
  61: "Light rain", 63: "Rain", 65: "Heavy rain",
  71: "Light snow", 73: "Snow", 75: "Heavy snow",
  80: "Light showers", 81: "Showers", 82: "Heavy showers",
  95: "Thunderstorm", 96: "Thunderstorm w/ hail", 99: "Heavy thunderstorm",
};

function c2f(c: number) { return Math.round(c * 9 / 5 + 32); }
function mm2in(mm: number) { return +(mm / 25.4).toFixed(2); }
function kmh2mph(kmh: number) { return Math.round(kmh / 1.609); }

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: CORS });
  }

  try {
    const { report_id } = (await req.json()) as Payload;
    if (!report_id) {
      return new Response(JSON.stringify({ error: "report_id required" }),
        { status: 400, headers: { ...CORS, "Content-Type": "application/json" } });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } },
    );

    // Fetch the report and its project's coordinates.
    const { data: report, error: repErr } = await supabase
      .from("daily_reports")
      .select("id, project_id, log_date")
      .eq("id", report_id)
      .maybeSingle();
    if (repErr) throw repErr;
    if (!report) {
      return new Response(JSON.stringify({ error: "report not found" }),
        { status: 404, headers: { ...CORS, "Content-Type": "application/json" } });
    }

    const { data: project, error: projErr } = await supabase
      .from("projects")
      .select("id, latitude, longitude")
      .eq("id", (report as any).project_id)
      .maybeSingle();
    if (projErr) throw projErr;

    const lat = (project as any)?.latitude;
    const lng = (project as any)?.longitude;
    if (lat == null || lng == null) {
      return new Response(
        JSON.stringify({ error: "project missing latitude/longitude" }),
        { status: 422, headers: { ...CORS, "Content-Type": "application/json" } },
      );
    }

    const date = (report as any).log_date;
    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.searchParams.set("latitude", String(lat));
    url.searchParams.set("longitude", String(lng));
    url.searchParams.set(
      "daily",
      "temperature_2m_max,temperature_2m_min,precipitation_sum,windspeed_10m_max,weathercode",
    );
    url.searchParams.set("start_date", date);
    url.searchParams.set("end_date", date);
    url.searchParams.set("timezone", "auto");

    const resp = await fetch(url.toString());
    if (!resp.ok) {
      return new Response(
        JSON.stringify({ error: `Open-Meteo ${resp.status}` }),
        { status: 502, headers: { ...CORS, "Content-Type": "application/json" } },
      );
    }
    const body = (await resp.json()) as OpenMeteoResponse;
    const d = body.daily;
    if (!d || d.time.length === 0) {
      return new Response(JSON.stringify({ error: "no weather data" }),
        { status: 502, headers: { ...CORS, "Content-Type": "application/json" } });
    }

    const patch = {
      weather_high_f: c2f(d.temperature_2m_max[0]),
      weather_low_f: c2f(d.temperature_2m_min[0]),
      weather_description: WMO[d.weathercode[0]] ?? "Unknown",
      precip_in: mm2in(d.precipitation_sum[0]),
      wind_mph: kmh2mph(d.windspeed_10m_max[0]),
    };

    const { data: updated, error: upErr } = await supabase
      .from("daily_reports")
      .update(patch)
      .eq("id", report_id)
      .select()
      .maybeSingle();
    if (upErr) throw upErr;

    return new Response(JSON.stringify({ ok: true, report: updated, applied: patch }), {
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
