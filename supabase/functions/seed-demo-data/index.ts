import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role for seeding
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify caller is platform admin
    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: userData } = await supabaseUser.auth.getUser();
    if (!userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("is_platform_admin, workspace_id")
      .eq("user_id", userData.user.id)
      .single();

    if (!profile?.is_platform_admin) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const workspaceId = profile.workspace_id;
    const userId = userData.user.id;
    const now = new Date().toISOString();

    console.log("Seeding demo data for workspace:", workspaceId);

    // ── 1. Enable ALL workspace modules ──
    await supabaseAdmin.from("workspace_modules").upsert({
      workspace_id: workspaceId,
      credential_wallet_enabled: true,
      training_hub_enabled: true,
      safety_module_enabled: true,
      equipment_tracker_enabled: true,
      client_portal_enabled: true,
      email_inbox_enabled: true,
      qr_scanning_enabled: true,
      occupancy_enabled: true,
      platform_credential_wallet: true,
      platform_training_hub: true,
      platform_safety_module: true,
      platform_equipment_tracker: true,
      platform_client_portal: true,
      platform_email_inbox: true,
      platform_qr_scanning: true,
      platform_occupancy: true,
    }, { onConflict: "workspace_id" });

    // ── 2. Properties ──
    const propertyNames = [
      { name: "Riverside Towers", address: "1200 River Drive", city: "Austin", state: "TX", zip_code: "78701", total_units: 120, workspace_id: workspaceId, created_by: userId, is_managed_property: true },
      { name: "Oakmont Gardens", address: "450 Oak Street", city: "Austin", state: "TX", zip_code: "78704", total_units: 85, workspace_id: workspaceId, created_by: userId, is_managed_property: true },
      { name: "Summit Place Apartments", address: "789 Summit Blvd", city: "Austin", state: "TX", zip_code: "78745", total_units: 200, workspace_id: workspaceId, created_by: userId, is_managed_property: true },
      { name: "Cedar Creek Senior Living", address: "2100 Cedar Lane", city: "Round Rock", state: "TX", zip_code: "78664", total_units: 60, workspace_id: workspaceId, created_by: userId, is_managed_property: true },
      { name: "The Metropolitan", address: "555 Congress Ave", city: "Austin", state: "TX", zip_code: "78701", total_units: 150, workspace_id: workspaceId, created_by: userId, is_managed_property: true },
    ];

    // Insert only properties that don't already exist by name
    for (const prop of propertyNames) {
      const { data: existing } = await supabaseAdmin
        .from("properties")
        .select("id")
        .eq("name", prop.name)
        .eq("workspace_id", workspaceId)
        .maybeSingle();
      if (!existing) {
        await supabaseAdmin.from("properties").insert(prop);
      }
    }

    // Fetch all properties for this workspace to get IDs
    const { data: allProps } = await supabaseAdmin
      .from("properties")
      .select("id, name, total_units")
      .eq("workspace_id", workspaceId)
      .order("name");

    const propIds = allProps?.map((p: any) => p.id) ?? [];
    console.log("Properties seeded:", propIds.length);

    // ── 3. Units for first 2 properties ──
    if (propIds.length >= 2) {
      const units: any[] = [];
      for (let i = 0; i < 2; i++) {
        const propId = propIds[i];
        const count = i === 0 ? 12 : 8;
        for (let u = 1; u <= count; u++) {
          units.push({
            property_id: propId,
            unit_number: `${(i + 1) * 100 + u}`,
            floor: Math.ceil(u / 4),
            bedrooms: (u % 3) + 1,
            bathrooms: u % 2 === 0 ? 2 : 1,
            square_footage: 600 + (u % 3) * 200,
            status: u <= count - 2 ? "occupied" : "vacant",
            workspace_id: workspaceId,
          });
        }
      }
      await supabaseAdmin.from("units").upsert(units, { onConflict: "property_id,unit_number", ignoreDuplicates: true });
      console.log("Units seeded:", units.length);
    }

    // ── 4. Assets ──
    if (propIds.length > 0) {
      const assetTypes = ["elevator", "fire_extinguisher", "hvac", "generator", "boiler"];
      const assets: any[] = [];
      for (let i = 0; i < Math.min(3, propIds.length); i++) {
        assetTypes.forEach((t, j) => {
          assets.push({
            property_id: propIds[i],
            name: `${t.replace("_", " ").replace(/\b\w/g, (c: string) => c.toUpperCase())} ${j + 1}`,
            asset_type: t,
            status: j % 3 === 0 ? "needs_repair" : "operational",
            location_description: `Building ${String.fromCharCode(65 + i)}, Floor ${j + 1}`,
          });
        });
      }
      await supabaseAdmin.from("assets").upsert(assets, { ignoreDuplicates: true });
      console.log("Assets seeded:", assets.length);
    }

    // ── 5. Issues ──
    const issueData = [
      { title: "Roof leak in Building A", description: "Water intrusion near stairwell", severity: "severe" as const, status: "open", source_module: "nspire", property_id: propIds[0], deadline: new Date(Date.now() + 2 * 86400000).toISOString().split("T")[0] },
      { title: "Broken handrail - Unit 102", description: "Loose handrail on exterior stairs", severity: "moderate" as const, status: "open", source_module: "daily_grounds", property_id: propIds[0], deadline: new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0] },
      { title: "HVAC filter replacement overdue", description: "All units need seasonal filter change", severity: "low" as const, status: "in_progress", source_module: "nspire", property_id: propIds[1], deadline: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0] },
      { title: "Fire extinguisher expired - Bldg B", description: "Monthly check found expired unit", severity: "severe" as const, status: "open", source_module: "daily_grounds", property_id: propIds[1], deadline: new Date(Date.now() + 1 * 86400000).toISOString().split("T")[0] },
      { title: "Parking lot pothole", description: "Large pothole near entrance, trip hazard", severity: "moderate" as const, status: "open", source_module: "daily_grounds", property_id: propIds[2], deadline: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0] },
      { title: "Emergency lighting failure", description: "Exit signs dark in east corridor", severity: "severe" as const, status: "assigned", source_module: "nspire", property_id: propIds[0], deadline: new Date(Date.now() + 1 * 86400000).toISOString().split("T")[0] },
      { title: "Mold detected in laundry room", description: "Visible mold growth behind washers", severity: "severe" as const, status: "open", source_module: "nspire", property_id: propIds[2], deadline: new Date(Date.now() + 3 * 86400000).toISOString().split("T")[0] },
      { title: "Playground equipment rust", description: "Swing set bolts showing corrosion", severity: "moderate" as const, status: "resolved", source_module: "daily_grounds", property_id: propIds[1], deadline: new Date(Date.now() - 5 * 86400000).toISOString().split("T")[0] },
    ];
    await supabaseAdmin.from("issues").insert(issueData);
    console.log("Issues seeded:", issueData.length);

    // ── 6. Work Orders ──
    const workOrders = [
      { title: "Emergency roof repair", description: "Repair water intrusion in Building A stairwell area", priority: "emergency", status: "pending_approval", property_id: propIds[0], due_date: new Date(Date.now() + 2 * 86400000).toISOString().split("T")[0] },
      { title: "Handrail repair - Ext stairs", description: "Tighten and secure exterior handrail", priority: "routine", status: "approved", property_id: propIds[0], due_date: new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0] },
      { title: "HVAC filter replacement - All units", description: "Replace filters in all 85 units", priority: "routine", status: "in_progress", property_id: propIds[1], due_date: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0] },
      { title: "Fire extinguisher replacement", description: "Replace expired units in Building B", priority: "emergency", status: "approved", property_id: propIds[1], due_date: new Date(Date.now() + 1 * 86400000).toISOString().split("T")[0] },
      { title: "Parking lot patch", description: "Fill pothole near main entrance", priority: "routine", status: "pending_approval", property_id: propIds[2], due_date: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0] },
      { title: "Emergency lighting repair", description: "Replace exit sign LEDs in east corridor", priority: "emergency", status: "in_progress", property_id: propIds[0], due_date: new Date(Date.now() + 1 * 86400000).toISOString().split("T")[0] },
    ];
    await supabaseAdmin.from("work_orders").insert(workOrders);
    console.log("Work orders seeded:", workOrders.length);

    // ── 7. Projects ──
    const projects = [
      { name: "Riverside Towers Renovation", description: "Complete exterior renovation including roof, siding, and balcony repairs", status: "active", budget: 2500000, contract_value: 2350000, start_date: "2026-01-15", end_date: "2026-08-30", workspace_id: workspaceId, created_by: userId },
      { name: "Oakmont Gardens Landscaping", description: "Full landscape redesign with irrigation system", status: "active", budget: 150000, contract_value: 142000, start_date: "2026-03-01", end_date: "2026-06-15", workspace_id: workspaceId, created_by: userId },
      { name: "Summit Place HVAC Upgrade", description: "Replace aging HVAC systems in all 200 units", status: "planning", budget: 1800000, contract_value: 0, start_date: "2026-06-01", end_date: "2026-12-31", workspace_id: workspaceId, created_by: userId },
      { name: "Cedar Creek ADA Compliance", description: "ADA accessibility improvements throughout the property", status: "active", budget: 450000, contract_value: 425000, start_date: "2026-02-01", end_date: "2026-07-31", workspace_id: workspaceId, created_by: userId },
      { name: "Metropolitan Lobby Remodel", description: "High-end lobby renovation with modern finishes", status: "completed", budget: 350000, contract_value: 338000, start_date: "2025-10-01", end_date: "2026-02-28", workspace_id: workspaceId, created_by: userId },
    ];
    await supabaseAdmin.from("projects").upsert(projects, { onConflict: "name,workspace_id", ignoreDuplicates: true });
    console.log("Projects seeded:", projects.length);

    // ── 8. Contractors ──
    const contractors = [
      { name: "Mike Rodriguez", company: "Rodriguez Roofing LLC", trade: "Roofing", email: "mike@rodriguezroofing.com", phone: "512-555-0101", status: "active", workspace_id: workspaceId },
      { name: "Sarah Chen", company: "Chen Electric", trade: "Electrical", email: "sarah@chenelectric.com", phone: "512-555-0102", status: "active", workspace_id: workspaceId },
      { name: "James Patterson", company: "Patterson Plumbing", trade: "Plumbing", email: "james@pattersonplumbing.com", phone: "512-555-0103", status: "active", workspace_id: workspaceId },
      { name: "Lisa Nguyen", company: "Green Thumb Landscaping", trade: "Landscaping", email: "lisa@greenthumb.com", phone: "512-555-0104", status: "active", workspace_id: workspaceId },
      { name: "Carlos Mendez", company: "Mendez HVAC Services", trade: "HVAC", email: "carlos@mendezhvac.com", phone: "512-555-0105", status: "active", workspace_id: workspaceId },
      { name: "Tom Williams", company: "Williams General Contracting", trade: "General", email: "tom@williamsgc.com", phone: "512-555-0106", status: "active", workspace_id: workspaceId },
    ];
    await supabaseAdmin.from("contractors").upsert(contractors, { ignoreDuplicates: true });
    console.log("Contractors seeded:", contractors.length);

    // ── 9. Credentials ──
    const credentials = [
      { holder_id: userId, credential_type: "license", credential_number: "GC-2024-1847", issuing_authority: "Texas DLSR", issue_date: "2024-06-01", expiry_date: "2026-06-01", status: "active", workspace_id: workspaceId },
      { holder_id: userId, credential_type: "certification", credential_number: "OSHA-30-9284", issuing_authority: "OSHA", issue_date: "2025-01-15", expiry_date: "2028-01-15", status: "active", workspace_id: workspaceId },
      { holder_id: userId, credential_type: "insurance", credential_number: "INS-GL-2026-003", issuing_authority: "State Farm", issue_date: "2026-01-01", expiry_date: "2027-01-01", status: "active", workspace_id: workspaceId },
      { holder_id: userId, credential_type: "certification", credential_number: "EPA-608-UNV", issuing_authority: "EPA", issue_date: "2023-03-20", expiry_date: "2026-03-20", status: "expiring_soon", workspace_id: workspaceId },
    ];
    await supabaseAdmin.from("credentials").insert(credentials);
    console.log("Credentials seeded:", credentials.length);

    // ── 10. Equipment ──
    const equipmentCategories = await supabaseAdmin.from("equipment_categories").select("slug").limit(5);
    const catSlugs = equipmentCategories.data?.map((c: any) => c.slug) ?? ["vehicles", "tools", "heavy-equipment"];
    
    const equipment = [
      { name: "Ford F-250 Work Truck", category_slug: catSlugs[0] ?? "vehicles", make: "Ford", model: "F-250 Super Duty", year: 2024, status: "available", condition: "good", serial_number: "1FTBF2B6XRED12345", workspace_id: workspaceId, created_by: userId },
      { name: "Kubota Mini Excavator", category_slug: catSlugs.includes("heavy-equipment") ? "heavy-equipment" : catSlugs[0], make: "Kubota", model: "KX040-4", year: 2023, status: "checked_out", condition: "good", serial_number: "KUB-KX040-78901", workspace_id: workspaceId, created_by: userId },
      { name: "Hilti Rotary Hammer", category_slug: catSlugs.includes("tools") ? "tools" : catSlugs[0], make: "Hilti", model: "TE 60-ATC", year: 2025, status: "available", condition: "excellent", serial_number: "HILTI-TE60-4521", workspace_id: workspaceId, created_by: userId },
      { name: "Chevy Colorado Fleet Van", category_slug: catSlugs[0] ?? "vehicles", make: "Chevrolet", model: "Colorado", year: 2025, status: "available", condition: "excellent", license_plate: "TX-APAS-01", workspace_id: workspaceId, created_by: userId },
    ];
    await supabaseAdmin.from("equipment_assets").insert(equipment);
    console.log("Equipment seeded:", equipment.length);

    // ── 11. CRM Contacts ──
    const contacts = [
      { first_name: "Maria", last_name: "Gonzalez", email: "maria@riverside.com", phone: "512-555-2001", company_name: "Riverside HOA", contact_type: "client", workspace_id: workspaceId },
      { first_name: "David", last_name: "Kim", email: "david.kim@oakmont.org", phone: "512-555-2002", company_name: "Oakmont Management", contact_type: "client", workspace_id: workspaceId },
      { first_name: "Jennifer", last_name: "Brooks", email: "jbrooks@cityaustin.gov", phone: "512-555-2003", company_name: "City of Austin", contact_type: "government", workspace_id: workspaceId },
      { first_name: "Robert", last_name: "Taylor", email: "rtaylor@austinfire.gov", phone: "512-555-2004", company_name: "Austin Fire Department", contact_type: "government", workspace_id: workspaceId },
      { first_name: "Angela", last_name: "Martinez", email: "angela@summitplace.com", phone: "512-555-2005", company_name: "Summit Place LLC", contact_type: "owner", workspace_id: workspaceId },
    ];
    await supabaseAdmin.from("crm_contacts").insert(contacts);
    console.log("CRM contacts seeded:", contacts.length);

    // ── 12. Safety Incidents ──
    const safetyIncidents = [
      { title: "Slip and fall - wet floor", description: "Worker slipped on freshly mopped lobby floor. Minor knee abrasion.", severity: "minor", status: "closed", incident_date: new Date(Date.now() - 15 * 86400000).toISOString(), location: "Riverside Towers - Lobby", workspace_id: workspaceId, reported_by: userId },
      { title: "Ladder safety violation", description: "Worker observed using damaged ladder. Stopped work, ladder removed.", severity: "moderate", status: "investigating", incident_date: new Date(Date.now() - 3 * 86400000).toISOString(), location: "Oakmont Gardens - Building C", workspace_id: workspaceId, reported_by: userId },
      { title: "Chemical spill - cleaning supplies", description: "Small bleach spill in maintenance closet. Area ventilated and cleaned.", severity: "minor", status: "closed", incident_date: new Date(Date.now() - 30 * 86400000).toISOString(), location: "Summit Place - Maintenance", workspace_id: workspaceId, reported_by: userId },
    ];
    await supabaseAdmin.from("safety_incidents").insert(safetyIncidents);
    console.log("Safety incidents seeded:", safetyIncidents.length);

    // ── 13. Compliance Events ──
    const complianceEvents = [
      { title: "Annual fire inspection", category: "fire_safety", due_date: new Date(Date.now() + 45 * 86400000).toISOString().split("T")[0], status: "upcoming", priority: "high", property_id: propIds[0], workspace_id: workspaceId, source_type: "manual" },
      { title: "HUD NSPIRE inspection", category: "hud", due_date: new Date(Date.now() + 90 * 86400000).toISOString().split("T")[0], status: "upcoming", priority: "high", property_id: propIds[1], workspace_id: workspaceId, source_type: "manual" },
      { title: "Elevator certification renewal", category: "building", due_date: new Date(Date.now() + 20 * 86400000).toISOString().split("T")[0], status: "upcoming", priority: "medium", property_id: propIds[0], workspace_id: workspaceId, source_type: "manual" },
      { title: "Backflow preventer test", category: "water", due_date: new Date(Date.now() + 60 * 86400000).toISOString().split("T")[0], status: "upcoming", priority: "medium", property_id: propIds[2], workspace_id: workspaceId, source_type: "manual" },
      { title: "Lead-based paint disclosure audit", category: "environmental", due_date: new Date(Date.now() - 5 * 86400000).toISOString().split("T")[0], status: "overdue", priority: "high", property_id: propIds[3], workspace_id: workspaceId, source_type: "manual" },
    ];
    await supabaseAdmin.from("compliance_events").insert(complianceEvents);
    console.log("Compliance events seeded:", complianceEvents.length);

    // ── 14. Maintenance Requests (Voice Agent pipeline) ──
    const maintenanceRequests = [
      { caller_name: "John Davis", caller_phone: "512-555-3001", caller_unit_number: "101", property_id: propIds[0], issue_category: "plumbing", issue_description: "Kitchen faucet leaking constantly", urgency_level: "medium", is_emergency: false, status: "new" },
      { caller_name: "Ana Reyes", caller_phone: "512-555-3002", caller_unit_number: "205", property_id: propIds[0], issue_category: "electrical", issue_description: "No power in bedroom outlets", urgency_level: "high", is_emergency: false, status: "assigned" },
      { caller_name: "Mark Thompson", caller_phone: "512-555-3003", caller_unit_number: "108", property_id: propIds[1], issue_category: "plumbing", issue_description: "Water heater not producing hot water", urgency_level: "high", is_emergency: true, status: "in_progress" },
      { caller_name: "Linda Chen", caller_phone: "512-555-3004", caller_unit_number: "302", property_id: propIds[0], issue_category: "pest_control", issue_description: "Cockroaches in kitchen cabinets", urgency_level: "medium", is_emergency: false, status: "new" },
      { caller_name: "Steve Martinez", caller_phone: "512-555-3005", caller_unit_number: "110", property_id: propIds[1], issue_category: "hvac", issue_description: "AC unit blowing warm air", urgency_level: "high", is_emergency: false, status: "reviewed" },
    ];
    await supabaseAdmin.from("maintenance_requests").insert(maintenanceRequests);
    console.log("Maintenance requests seeded:", maintenanceRequests.length);

    // ── 15. Client Portal ──
    const portalSlug = `apas-demo-${Date.now().toString(36)}`;
    const { data: portalData } = await supabaseAdmin.from("client_portals").insert({
      workspace_id: workspaceId,
      name: "APAS Enterprises Client Portal",
      portal_type: "client",
      client_name: "APAS Enterprises",
      client_contact_name: "Hardeep Anand",
      client_contact_email: "hardeep@apas.ai",
      brand_accent_color: "#F9B233",
      portal_slug: portalSlug,
      is_active: true,
      status: "active",
      shared_modules: ["messages", "schedule", "credentials", "training", "safety", "equipment"],
      created_by: userId,
    }).select("id").single();
    console.log("Client portal seeded:", portalData?.id);

    // ── 16. Seed portal schedule content + milestones ──
    if (portalData?.id) {
      await supabaseAdmin.from("portal_schedule_content").upsert({
        portal_id: portalData.id,
        content: {
          navBrand: "APAS Enterprises",
          navBadge: "Active",
          navPowered: "APAS",
          heroTitle: "Three areas. Eight steps. One readout.",
          heroBody: "Track every area, milestone, certification step, and handover note from one interactive schedule.",
          heroTags: ["Construction", "Client Portal", "Interactive Schedule"],
          commitDate: "Q3 2026",
          commitSub: "Current Commitment",
          commitNote: "Milestones, notes, and questions on this page stay visible to the project team and portal users.",
          pullQuoteText: "This project is on track and the team is performing exceptionally well.",
          pullQuoteSub: "— Project Director, APAS Enterprises",
          areaCards: [
            { letter: "A", title: "Pre-Construction & Design", stat: "10 milestones", body: "Site survey through owner approval", units: "Permits, engineering, bid packages" },
            { letter: "B", title: "Construction Execution", stat: "10 milestones", body: "Foundation through punch list", units: "Structural, MEP, finishes" },
            { letter: "C", title: "Closeout & Handover", stat: "10 milestones", body: "CO through retention release", units: "Docs, training, warranties" },
          ],
        },
      }, { onConflict: "portal_id" });

      // Add portal access for demo
      const accessToken = crypto.randomUUID();
      await supabaseAdmin.from("portal_access").upsert({
        portal_id: portalData.id,
        email: "hardeep@apas.ai",
        name: "Hardeep Anand",
        company: "APAS Enterprises",
        magic_link_token: accessToken,
        magic_link_expires_at: new Date(Date.now() + 72 * 3600000).toISOString(),
        invited_by: userId,
        is_active: true,
      }, { onConflict: "portal_id,email" });

      console.log("Portal schedule content + access seeded");
    }

    // ── 17. Update workspace to enterprise ──
    await supabaseAdmin.from("workspaces").update({
      plan: "enterprise",
      status: "active",
      client_company: "APAS Enterprises",
      client_contact_name: "Hardeep Anand",
      billing_contact_email: "hardeep@apas.ai",
    }).eq("id", workspaceId);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Demo data seeded successfully",
        summary: {
          properties: propIds.length,
          issues: issueData.length,
          workOrders: workOrders.length,
          projects: projects.length,
          contractors: contractors.length,
          credentials: credentials.length,
          equipment: equipment.length,
          contacts: contacts.length,
          safetyIncidents: safetyIncidents.length,
          complianceEvents: complianceEvents.length,
          maintenanceRequests: maintenanceRequests.length,
          portalId: portalData?.id,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Seed error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Seed failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
