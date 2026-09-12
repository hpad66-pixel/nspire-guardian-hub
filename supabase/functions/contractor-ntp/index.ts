import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { PDFDocument, StandardFonts, rgb } from 'https://esm.sh/pdf-lib@1.17.1';
import { noticeLetter, noticeMoney, type NoticeRecord } from '../_shared/noticeToProceed.ts';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization,content-type,apikey,x-client-info' };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

async function pdfAttachment(n: NoticeRecord) {
  const doc = await PDFDocument.create();
  // Retries must produce identical attachment bytes for the provider's
  // idempotency key, including PDF metadata timestamps.
  const issuedDate = new Date(n.issued_at!);
  doc.setCreationDate(issuedDate); doc.setModificationDate(issuedDate);
  const font = await doc.embedFont(StandardFonts.Helvetica); const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  let page = doc.addPage([612,792]); let y = 738;
  const clean = (s: string) => s.replace(/\u2014/g, ', ').replace(/[^\x20-\x7E\n]/g, ' ');
  const write = (text: string, size = 12, heavy = false) => {
    const f = heavy ? bold : font;
    for (const paragraph of clean(text).split('\n')) {
      let line = '';
      const flush = () => { if(y < 65) { page = doc.addPage([612,792]); y = 738; } page.drawText(line, { x: 48, y, size, font:f, color:rgb(.04,.17,.13) }); y -= size * 1.55; };
      for (const word of paragraph.split(' ')) {
        if (f.widthOfTextAtSize(`${line} ${word}`,size) > 510 && line) { flush(); line = ''; }
        // Split exceptionally long references so they cannot run off the page.
        for(const char of (line ? ` ${word}` : word)) { if(f.widthOfTextAtSize(line+char,size)>510) { flush(); line=''; } line+=char; }
      }
      flush();
    }
    y-=8;
  };
  const s=n.snapshot ?? {}; const b=s.branding ?? {};
  write(b.company_name || 'APAS Consulting',22,true);
  write([b.address_line1,b.address_line2,b.phone,b.email].filter(Boolean).join(' | '),10);
  write('NOTICE TO PROCEED',24,true);
  write(`Reference: NTP-${n.id.slice(0,8).toUpperCase()}\nIssued: ${n.issued_at?.slice(0,10)}\nTo: ${s.company_name}\nProject: ${s.project_name}${s.client_name ? `\nClient: ${s.client_name}` : ''}`);
  write('You are authorized to proceed with the work below under the approved agreement.');
  write('APPROVED AGREEMENT',12,true); write(`${n.agreement_reference}\nApproved on ${n.agreement_approved_on}`);
  write('AUTHORIZED SCOPE',12,true); write(n.scope_of_work);
  write(`Start: ${n.start_date}\nComplete by: ${n.completion_date}\nAuthorized budget: ${noticeMoney(n.budget_cents)}`,12,true);
  if(n.instructions) { write('COORDINATION AND CONDITIONS',12,true); write(n.instructions); }
  write('Proceed only within this scope and authorized budget. Obtain written approval before any change to scope, price, or completion date. The approved agreement governs the work.');
  write(`We look forward to a successful project together.\n${b.company_name || 'APAS Consulting'}`);
  const bytes=await doc.save(); let binary=''; for(const byte of bytes) binary+=String.fromCharCode(byte); return btoa(binary);
}

serve(async req => {
  if(req.method === 'OPTIONS') return new Response('ok',{headers:cors});
  let claimedId: string | null = null;
  const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  try {
    const user=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:req.headers.get('Authorization') ?? ''}}});
    const {data:auth}=await user.auth.getUser(); if(!auth.user) return json({error:'Sign in to send a Notice to Proceed'},401);
    const {noticeId}=await req.json();
    const {data:n,error}=await user.from('contractor_notices_to_proceed').select('*').eq('id',noticeId).single();
    if(error || !n) return json({error:'Notice not found'},404);
    const {data:allowed}=await user.rpc('can_manage_contractor_case',{p_case_id:n.case_id});
    if(!allowed) return json({error:'Manager access is required'},403);
    if(n.status !== 'issued') return json({error:'Issue the approved notice before sending'},409);
    if(n.delivery_status === 'sent') return json({ok:true,alreadySent:true});
    if(!Deno.env.get('RESEND_API_KEY')) return json({error:'Email delivery is not configured. The issued letter remains saved.'},503);
    if(n.delivery_status === 'sending' && Date.now()-new Date(n.delivery_claimed_at).getTime()<300000) return json({error:'Delivery is already in progress'},409);
    const claimedAt = new Date().toISOString();
    const claim=await db.from('contractor_notices_to_proceed').update({delivery_status:'sending',delivery_claimed_at:claimedAt,updated_at:claimedAt})
      .eq('id',n.id).eq('delivery_status',n.delivery_status).eq('updated_at',n.updated_at).select('id').maybeSingle();
    if(claim.error || !claim.data) return json({error:'Delivery is already in progress. Refresh to check its status.'},409);
    claimedId=n.id;
    const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${Deno.env.get('RESEND_API_KEY')}`,'Content-Type':'application/json','Idempotency-Key':`ntp-${n.id}`},body:JSON.stringify({
      from:'APAS Project Controls <hardeep@apas.ai>',to:[n.recipient_email],cc:n.cc_emails.length?n.cc_emails:undefined,bcc:n.bcc_emails.length?n.bcc_emails:undefined,
      subject:`Notice to Proceed | ${n.snapshot.project_name}`,html:noticeLetter(n),attachments:[{filename:`Notice-to-Proceed-${n.id.slice(0,8)}.pdf`,content:await pdfAttachment(n)}],
    })});
    const result=await response.json(); if(!response.ok) throw new Error(result.message || 'Email delivery failed');
    const saved=await db.from('contractor_notices_to_proceed').update({delivery_status:'sent',email_id:result.id,delivered_at:new Date().toISOString(),delivery_error:null}).eq('id',n.id);
    if(saved.error) throw saved.error;
    await db.from('contractor_activity_log').insert({tenant_id:n.tenant_id,case_id:n.case_id,actor_type:'staff',actor_user_id:auth.user.id,action:'notice_to_proceed_emailed',entity_id:n.id});
    return json({ok:true,emailId:result.id});
  } catch(error) {
    const message=error instanceof Error?error.message:'Could not send the notice';
    if(claimedId) await db.from('contractor_notices_to_proceed').update({delivery_status:'failed',delivery_error:message}).eq('id',claimedId);
    return json({error:message},400);
  }
});
