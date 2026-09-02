import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const propertyId = String(body.propertyId || "");
    const accountId = body.accountId ? String(body.accountId) : null;
    const documentUrl = body.documentUrl ? String(body.documentUrl) : null;
    const documentName = body.documentName ? String(body.documentName) : null;
    const extracted = body.extracted && typeof body.extracted === "object" ? body.extracted : {};

    if (!propertyId || !accountId) {
      return new Response(JSON.stringify({ error: "propertyId and accountId are required" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const { data: prop, error: propErr } = await supabase
      .from("properties")
      .select("id, workspace_id")
      .eq("id", propertyId)
      .single();
    if (propErr || !prop) throw propErr || new Error("Property not found");

    const start = extracted.periodStart || extracted.bill_period_start;
    if (!start) {
      return new Response(JSON.stringify({ error: "Bill period start is required" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const charges = Number(extracted.currentCharges ?? extracted.amountDue ?? 0) || 0;
    const { data, error } = await supabase
      .from("water_bills")
      .upsert({
        tenant_id: prop.workspace_id,
        property_id: propertyId,
        account_id: accountId,
        bill_period_start: start,
        bill_period_end: extracted.periodEnd || extracted.bill_period_end || start,
        billing_date: extracted.billingDate || null,
        due_date: extracted.dueDate || null,
        current_charges: charges,
        amount_due: Number(extracted.amountDue ?? charges) || 0,
        water_charges: Number(extracted.waterCharges ?? 0) || 0,
        sewer_charges: Number(extracted.sewerCharges ?? 0) || 0,
        other_fees: Number(extracted.otherFees ?? 0) || 0,
        consumption_gallons: Number(extracted.consumptionGallons ?? 0) || 0,
        is_estimated: Boolean(extracted.isEstimated),
        status: extracted.isEstimated ? "disputed" : "open",
        document_url: documentUrl,
        document_name: documentName,
        source: "ocr",
        raw_extract: extracted,
        created_by: userData.user.id,
      }, { onConflict: "account_id,bill_period_start" })
      .select()
      .single();
    if (error) throw error;

    return new Response(JSON.stringify({ bill: data }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
