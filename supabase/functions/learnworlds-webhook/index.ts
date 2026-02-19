import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return new Response('Invalid JSON', { status: 400, headers: corsHeaders });
  }

  // Log every incoming payload for debugging during integration
  console.log('[learnworlds-webhook] Incoming payload:', JSON.stringify(payload, null, 2));

  // ── Verify webhook secret ──────────────────────────────────────────────────
  const secret = Deno.env.get('LEARNWORLDS_WEBHOOK_SECRET');
  if (!secret) {
    console.warn('[learnworlds-webhook] LEARNWORLDS_WEBHOOK_SECRET not set — skipping verification');
  } else {
    const authHeader = req.headers.get('Authorization') ?? req.headers.get('x-lw-signature') ?? '';
    if (!authHeader.includes(secret)) {
      console.error('[learnworlds-webhook] Webhook secret mismatch');
      return new Response('Unauthorized', { status: 401, headers: corsHeaders });
    }
  }

  const data = (payload as Record<string, unknown>);
  const event = data?.event as string | undefined;

  if (event !== 'course_completed') {
    // Acknowledge other events without processing
    console.log('[learnworlds-webhook] Ignoring event type:', event);
    return new Response(JSON.stringify({ ok: true, ignored: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // ── Extract payload ────────────────────────────────────────────────────────
  const eventData = data?.data as Record<string, unknown> | undefined;
  const user = eventData?.user as Record<string, string> | undefined;
  const course = eventData?.course as Record<string, string> | undefined;
  const completion = eventData?.completion as Record<string, unknown> | undefined;

  if (!user?.email || !course?.id || !completion) {
    console.error('[learnworlds-webhook] Missing required fields in payload');
    return new Response(JSON.stringify({ ok: false, error: 'Missing fields' }), {
      status: 200, // Return 200 so LW doesn't retry
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // ── Init Supabase with service role (bypasses RLS) ─────────────────────────
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  // ── Resolve user from email ────────────────────────────────────────────────
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('user_id, workspace_id')
    .eq('email', user.email)
    .maybeSingle();

  if (profileError || !profile) {
    console.warn('[learnworlds-webhook] User not found for email:', user.email);
    return new Response(JSON.stringify({ ok: true, warning: 'User not found' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { user_id, workspace_id } = profile;
  const lwCourseId = course.id;

  // ── Insert completion record ───────────────────────────────────────────────
  const { error: insertError } = await supabase.from('training_completions').insert({
    workspace_id,
    user_id,
    lw_course_id: lwCourseId,
    lw_completion_id: completion.id as string ?? null,
    completed_at: completion.completed_at as string,
    score: completion.score as number ?? null,
    passed: completion.passed as boolean ?? null,
    certificate_url: completion.certificate_url as string ?? null,
    certificate_id: null,
  });

  if (insertError) {
    console.error('[learnworlds-webhook] Failed to insert completion:', insertError.message);
    return new Response(JSON.stringify({ ok: false, error: insertError.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  console.log('[learnworlds-webhook] Completion recorded for user:', user_id, 'course:', lwCourseId);

  // ── Update matching training assignment ────────────────────────────────────
  const { data: assignment } = await supabase
    .from('training_assignments')
    .select('id, recurrence, recurrence_interval_days')
    .eq('assigned_to', user_id)
    .eq('lw_course_id', lwCourseId)
    .maybeSingle();

  if (assignment) {
    if (assignment.recurrence && assignment.recurrence !== 'none' && assignment.recurrence_interval_days) {
      // Calculate next due date
      const nextDue = new Date();
      nextDue.setDate(nextDue.getDate() + assignment.recurrence_interval_days);

      await supabase
        .from('training_assignments')
        .update({ next_due_date: nextDue.toISOString().split('T')[0] })
        .eq('id', assignment.id);

      console.log('[learnworlds-webhook] Next due date set:', nextDue.toISOString().split('T')[0]);
    }
    // Non-recurring assignments stay in place (historical record)
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
