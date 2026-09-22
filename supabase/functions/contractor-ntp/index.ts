import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { PDFDocument, StandardFonts, rgb } from 'https://esm.sh/pdf-lib@1.17.1';
import { noticeLetter, noticeMoney, type NoticeRecord } from '../_shared/noticeToProceed.ts';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization,content-type,apikey,x-client-info' };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
const textValue = (value: unknown, fallback = '') => String(value ?? '').trim() || fallback;
const hexRgb = (value: unknown, fallback: [number, number, number]) => {
  const match = /^#?([0-9a-f]{6})$/i.exec(String(value ?? ''));
  if (!match) return rgb(fallback[0], fallback[1], fallback[2]);
  const hex = match[1];
  return rgb(parseInt(hex.slice(0,2),16)/255, parseInt(hex.slice(2,4),16)/255, parseInt(hex.slice(4,6),16)/255);
};

async function pdfAttachment(n: NoticeRecord) {
  const doc = await PDFDocument.create();
  // Retries must produce identical attachment bytes for the provider's
  // idempotency key, including PDF metadata timestamps.
  const issuedDate = new Date(n.issued_at!);
  doc.setCreationDate(issuedDate); doc.setModificationDate(issuedDate);
  const font = await doc.embedFont(StandardFonts.Helvetica); const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  let page = doc.addPage([612,792]); let y = 738;
  const clean = (s: string) => s.replace(/\u2014/g, ', ').replace(/[^\x20-\x7E\n]/g, ' ');
  const s=n.snapshot ?? {}; const b=s.branding ?? {};
  const company = textValue(b.company_name, 'APAS Consulting');
  const email = textValue(b.email, 'hardeep@apas.ai');
  const contact = [b.address_line1,b.address_line2,b.phone,email,b.website].filter(Boolean).join(' | ');
  const primary = hexRgb(b.primary_color, [.03,.17,.14]);
  const secondary = hexRgb(b.secondary_color, [.77,.64,.35]);
  const drawHeader = () => {
    page.drawRectangle({ x: 0, y: 710, width: 612, height: 82, color: primary });
    page.drawRectangle({ x: 0, y: 704, width: 612, height: 6, color: secondary });
    page.drawText(clean(company), { x: 48, y: 756, size: 22, font: bold, color: rgb(1,1,1) });
    page.drawText(clean(contact), { x: 48, y: 735, size: 9, font, color: rgb(.86,.91,.89) });
    page.drawRectangle({ x: 498, y: 728, width: 66, height: 42, borderColor: rgb(1,1,1), borderWidth: 1, color: rgb(1,1,1) });
    page.drawText('APAS', { x: 515, y: 745, size: 12, font: bold, color: primary });
    y = 672;
  };
  const write = (text: string, size = 12, heavy = false) => {
    const f = heavy ? bold : font;
    for (const paragraph of clean(text).split('\n')) {
      let line = '';
      const flush = () => { if(y < 80) { page = doc.addPage([612,792]); drawHeader(); } page.drawText(line, { x: 48, y, size, font:f, color:rgb(.04,.17,.13) }); y -= size * 1.55; };
      for (const word of paragraph.split(' ')) {
        if (f.widthOfTextAtSize(`${line} ${word}`,size) > 510 && line) { flush(); line = ''; }
        // Split exceptionally long references so they cannot run off the page.
        for(const char of (line ? ` ${word}` : word)) { if(f.widthOfTextAtSize(line+char,size)>510) { flush(); line=''; } line+=char; }
      }
      flush();
    }
    y-=8;
  };
  drawHeader();
  write('NOTICE TO PROCEED',24,true);
  write(`Reference: NTP-${n.id.slice(0,8).toUpperCase()}\nIssued: ${n.issued_at?.slice(0,10)}\nTo: ${s.company_name}\nProject: ${s.project_name}${s.client_name ? `\nClient: ${s.client_name}` : ''}`);
  write('You are authorized to proceed with the work described below under the approved agreement, approved proposal, and project requirements.');
  write('APPROVED AGREEMENT',12,true); write(`${n.agreement_reference}\nApproved on ${n.agreement_approved_on}`);
  write('AUTHORIZED SCOPE',12,true); write(n.scope_of_work);
  write(`Start date: ${n.start_date}\nRequired completion: ${n.completion_date}\nAuthorized budget: ${noticeMoney(n.budget_cents)}`,12,true);
  if(n.instructions) { write('COORDINATION AND CONDITIONS',12,true); write(n.instructions); }
  write('IMPORTANT CONTROLS',12,true);
  write('Proceed only within the approved scope, schedule, and authorized budget. Do not perform changed or additional work without written approval. Submit invoices, closeout documents, and supporting backup against the approved proposal or contract line items.');
  write('The approved agreement governs the work. This notice starts authorized performance only for the scope and amount stated above.');
  y -= 16;
  write('/s/ Hardeep Anand, PE',20,true);
  write(`Hardeep Anand, PE\nAuthorized Representative | ${company}`,11);
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
      from:'Hardeep Anand, PE <hardeep@apas.ai>',to:[n.recipient_email],cc:n.cc_emails.length?n.cc_emails:undefined,bcc:n.bcc_emails.length?n.bcc_emails:undefined,
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
