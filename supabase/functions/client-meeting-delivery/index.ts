import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { meetingReportHtml, meetingScheduleDue } from '../_shared/clientMeetingReport.ts';
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } });
serve(async (req) => {
    const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    if (req.method !== 'POST' || !service || req.headers.get('Authorization') !== `Bearer ${service}`)
        return json({ error: 'Forbidden' }, 403);
    const key = Deno.env.get('RESEND_API_KEY');
    if (!key)
        return json({ error: 'Email delivery is not configured' }, 503);
    const db = createClient(Deno.env.get('SUPABASE_URL')!, service);
    const now = new Date();
    let sent = 0, skipped = 0, failed = 0;
    const { data: settings, error } = await db.from('client_meeting_delivery_settings').select('*').eq('enabled', true);
    if (error)
        return json({ error: 'Could not read delivery preferences' }, 500);
    for (const s of settings || []) {
        if (!meetingScheduleDue(s, now)) {
            skipped++;
            continue;
        }
        // Recheck the configuring user's current authority. Revocation stops delivery.
        const { data: bundle, error: access } = await db.rpc('agent_client_meeting', { p_tenant: s.tenant_id, p_actor: s.configured_by, p_client: s.client_id, p_operation: 'read', p_payload: {} });
        if (access || !bundle?.canEdit) {
            failed++;
            continue;
        }
        const p = bundle.publications?.[0];
        if (!p || !s.recipients.length) {
            skipped++;
            continue;
        }
        const slot = new Intl.DateTimeFormat('en-CA', { timeZone: s.timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
        const { data: claim, error: claimError } = await db.rpc('claim_client_meeting_delivery', { p_publication: p.id, p_slot: slot });
        if (claimError) {
            failed++;
            continue;
        }
        if (!claim) {
            skipped++;
            continue;
        }
        const url = `${(Deno.env.get('PROJ_OS_APP_URL') || 'https://projos.ai').replace(/\/$/, '')}/owner-portal/clients/${s.client_id}/meetings`;
        try {
            const to = [...new Set(s.recipients as string[])];
            const cc = [...new Set(s.cc as string[])].filter(x => !to.includes(x));
            const bcc = [...new Set(s.bcc as string[])].filter(x => !to.includes(x) && !cc.includes(x));
            const r = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', 'Idempotency-Key': `client-meeting-${p.id}` }, body: JSON.stringify({ from: Deno.env.get('CLIENT_MEETING_FROM') || 'APAS Consulting <hardeep@apas.ai>', to, ...(cc.length ? { cc } : {}), ...(bcc.length ? { bcc } : {}), subject: `${bundle.client.name}: ${p.snapshot.title} | ${p.snapshot.meeting_date}`, html: meetingReportHtml(p.snapshot, url), text: `${p.snapshot.title}\n${p.snapshot.meeting_date}\n${url}` }), signal: AbortSignal.timeout(20000) });
            if (!r.ok) {
                await db.from('client_meeting_deliveries').update({ status: 'failed', error: `Email provider returned ${r.status}`, updated_at: new Date().toISOString() }).eq('id', claim);
                failed++;
                continue;
            }
            const result = await r.json();
            const { error: recordError } = await db.from('client_meeting_deliveries').update({ status: 'sent', provider_id: result.id, error: null, updated_at: new Date().toISOString() }).eq('id', claim);
            if (recordError) {
                failed++;
                continue;
            }
            sent++;
        }
        catch {
            // Outcome may be uncertain. Preserve the claim; retries reuse the provider key
            // only within 23 hours, never after its idempotency retention window.
            await db.from('client_meeting_deliveries').update({ error: 'Delivery outcome uncertain. Review before retrying after 23 hours.', updated_at: new Date().toISOString() }).eq('id', claim);
            failed++;
        }
    }
    return json({ sent, skipped, failed }, failed ? 502 : 200);
});
