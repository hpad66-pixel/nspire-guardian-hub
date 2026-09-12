import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Circle, FileCheck2, Loader2, Send, Printer, PartyPopper } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { type ContractorCase } from '@/hooks/useContractorReadiness';
import { noticeChecks, noticeLetter, type NoticeDraft, type NoticeRecord } from '../../../supabase/functions/_shared/noticeToProceed';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ReadinessCelebration } from './ReadinessCelebration';

export function NoticeToProceed({ item }: { item: ContractorCase }) {
  const qc = useQueryClient(); const [open,setOpen] = useState(false); const [busy,setBusy] = useState(false); const [celebrate,setCelebrate] = useState(false);
  const [draft,setDraft] = useState<NoticeDraft>({agreement_reference:'',agreement_approved_on:'',agreement_confirmed:false,scope_of_work:'',start_date:'',completion_date:'',budget_cents:null,prerequisites_confirmed:false,instructions:'',recipient_email:item.organization?.email ?? '',cc_emails:[],bcc_emails:[]});
  const query = useQuery({queryKey:['contractor-readiness','ntp',item.id],queryFn:async () => {
    const r=await supabase.from('contractor_notices_to_proceed' as any).select('*').eq('case_id',item.id).maybeSingle(); if(r.error) throw r.error; return r.data as unknown as NoticeRecord | null;
  }});
  const branding=useQuery({queryKey:['ntp-branding',item.tenant_id],enabled:open,queryFn:async()=>{
    const r=await supabase.from('company_branding').select('*').eq('workspace_id',item.tenant_id).order('updated_at',{ascending:false}).limit(1).maybeSingle(); if(r.error) throw r.error; return r.data;
  }});
  useEffect(()=>{ if(query.data) setDraft(query.data); },[query.data]);
  const record=query.data; const issued=record?.status==='issued';
  const checks=noticeChecks(draft,item.status==='qualified' && item.work_ready && item.contract_ready);
  const ready=checks.every(c=>c.ready) && draft.prerequisites_confirmed && !!draft.recipient_email;
  const patch=<K extends keyof NoticeDraft>(key:K,value:NoticeDraft[K])=>setDraft(current=>({...current,[key]:value}));
  const preview:NoticeRecord=issued ? record : {...draft,id:record?.id ?? 'DRAFT',case_id:item.id,status:'draft',snapshot:{company_name:item.organization?.name,project_name:item.project?.name,client_name:item.client?.name,branding:branding.data as unknown as Record<string,string>}};
  const save=async(issue:boolean)=>{
    setBusy(true);
    try {
      const result=await (supabase.rpc as any)('save_contractor_ntp',{p_case_id:item.id,p_draft:draft,p_issue:issue}); if(result.error) throw result.error;
      await qc.invalidateQueries({queryKey:['contractor-readiness']});
      if(issue) { setCelebrate(true); toast.success('Notice issued. Your team is ready to begin.'); }
      else toast.success('Notice draft saved');
    } catch(e) { toast.error(e instanceof Error?e.message:(e as {message?:string})?.message || 'Could not save notice'); }
    finally {setBusy(false);}
  };
  const send=async()=>{setBusy(true);try{const r=await supabase.functions.invoke('contractor-ntp',{body:{noticeId:record?.id}}); if(r.error || !r.data?.ok) throw new Error(r.data?.error || r.error?.message || 'Delivery failed'); toast.success('Notice emailed as a branded letter with PDF'); await query.refetch();}catch(e){toast.error(e instanceof Error?e.message:'Delivery failed');}finally{setBusy(false);}};
  const print=()=>{const w=window.open('','_blank'); if(w){w.opener=null;w.document.write(`<!doctype html><html><head><title>Notice to Proceed</title><style>@page{size:letter;margin:14mm}body{margin:0}section,table{break-inside:avoid}</style></head><body>${noticeLetter(preview)}</body></html>`);w.document.close();w.print();}};
  return <section className={`relative overflow-hidden rounded-2xl border p-5 ${issued?'border-emerald-300 bg-emerald-50/60':'bg-card'}`}>
    {celebrate && <ReadinessCelebration />}
    <div className="flex flex-wrap items-center justify-between gap-4"><div className="flex items-center gap-3"><div className="rounded-xl bg-emerald-900 p-3 text-white">{issued?<PartyPopper className="h-5 w-5" />:<FileCheck2 className="h-5 w-5" />}</div><div><h2 className="text-lg font-semibold">{issued?'Congratulations. Authorized to proceed.':'From ready to underway'}</h2><p className="text-sm text-muted-foreground">{issued?`Notice issued ${record.issued_at?.slice(0,10)} · Email ${record.delivery_status?.replace('_',' ')}`:'Confirm the essentials, then issue your Notice to Proceed.'}</p></div></div><Button onClick={()=>setOpen(true)} disabled={query.isLoading || !!query.error}>{issued?'View Notice to Proceed':'Prepare Notice to Proceed'}</Button></div>
    {query.error && <p role="alert" className="mt-2 text-sm text-destructive">Could not load notices. <button onClick={()=>query.refetch()} className="underline">Retry</button></p>}
    {!issued && <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-5">{checks.map(c=><div key={c.label} title={c.detail} className={`flex items-center gap-2 rounded-xl p-3 text-xs font-semibold ${c.ready?'bg-emerald-100 text-emerald-900':'bg-muted text-muted-foreground'}`}>{c.ready?<Check className="h-4 w-4" />:<Circle className="h-4 w-4" />}{c.label}</div>)}</div>}
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-h-[94vh] max-w-5xl overflow-y-auto"><DialogHeader><DialogTitle>Notice to Proceed</DialogTitle><DialogDescription>{issued?'The issued letter is saved in the company portal. Email it directly or print a copy.':'A clear scope, a clear schedule, and a clear authorization. Review the letter before issuing.'}</DialogDescription></DialogHeader>
      {issued && <div className="relative overflow-hidden rounded-xl bg-emerald-50 p-4 text-emerald-900">{celebrate && <ReadinessCelebration />}<p className="font-semibold">Congratulations. This work is authorized.</p><p className="mt-1 text-sm">The letter is available in the company portal. Send the email below when you are ready.</p></div>}
      <div className="grid gap-6 lg:grid-cols-2">{!issued && <div className="space-y-4">
        <Field label="Approved contract or proposal reference"><Input value={draft.agreement_reference} onChange={e=>patch('agreement_reference',e.target.value)} placeholder="Signed proposal number or document reference" /></Field>
        <Field label="Agreement approval date"><Input type="date" value={draft.agreement_approved_on || ''} onChange={e=>patch('agreement_approved_on',e.target.value)} /></Field>
        <label className="flex items-start gap-2 text-sm"><Checkbox checked={draft.agreement_confirmed} onCheckedChange={v=>patch('agreement_confirmed',v===true)} />I have the approved agreement on file and authority to release this work.</label>
        <Field label="Authorized scope and deliverables"><Textarea className="min-h-28" value={draft.scope_of_work} onChange={e=>patch('scope_of_work',e.target.value)} placeholder="Precisely what this company is authorized to perform" /></Field>
        <div className="grid grid-cols-2 gap-3"><Field label="Start date"><Input type="date" value={draft.start_date || ''} onChange={e=>patch('start_date',e.target.value)} /></Field><Field label="Complete by"><Input type="date" value={draft.completion_date || ''} onChange={e=>patch('completion_date',e.target.value)} /></Field></div>
        <Field label="Authorized budget ($)"><Input type="number" min="0" step="0.01" value={draft.budget_cents===null?'':draft.budget_cents/100} onChange={e=>patch('budget_cents',e.target.value===''?null:Math.round(Number(e.target.value)*100))} /></Field>
        <Field label="Site access, permits, coordination, and conditions"><Textarea value={draft.instructions} onChange={e=>patch('instructions',e.target.value)} placeholder="Include any prerequisites or special instructions that apply." /></Field>
        <label className="flex items-start gap-2 text-sm"><Checkbox checked={draft.prerequisites_confirmed} onCheckedChange={v=>patch('prerequisites_confirmed',v===true)} />Site access, permits, and other applicable start conditions are confirmed.</label>
        <Field label="Send to"><Input type="email" value={draft.recipient_email} onChange={e=>patch('recipient_email',e.target.value)} /></Field>
        <div className="grid grid-cols-2 gap-3">{(['cc_emails','bcc_emails'] as const).map(key=><Field key={key} label={key==='cc_emails'?'CC':'BCC'}><Input defaultValue={draft[key].join(', ')} onBlur={e=>patch(key,e.target.value.split(/[,;]+/).map(s=>s.trim()).filter(Boolean))} placeholder="Emails, separated by commas" /></Field>)}</div>
        <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={()=>save(false)} disabled={busy}>Save draft</Button><Button onClick={()=>save(true)} disabled={busy || !ready}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Issue Notice to Proceed</Button></div>
        {!ready && <p className="text-xs text-muted-foreground">Complete the five release checks and confirm applicable start conditions to issue. You can save a draft at any time.</p>}
      </div>}
      <div className={issued?'lg:col-span-2':''}><iframe title="Notice to Proceed letter preview" sandbox="" srcDoc={noticeLetter(preview)} className="h-[650px] w-full rounded-xl border bg-white" />{issued && <div className="mt-4 flex flex-wrap gap-2"><Button onClick={send} disabled={busy || record.delivery_status==='sent'}><Send className="mr-2 h-4 w-4" />{record.delivery_status==='sent'?'Email sent':'Email letter + PDF'}</Button><Button variant="outline" onClick={print}><Printer className="mr-2 h-4 w-4" />Print / Save PDF</Button></div>}</div></div>
    </DialogContent></Dialog>
  </section>;
}
function Field({label,children}:{label:string;children:React.ReactNode}) {return <label className="block space-y-1.5"><Label asChild><span>{label}</span></Label>{children}</label>;}
