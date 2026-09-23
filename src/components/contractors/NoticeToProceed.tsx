import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Check, Circle, FileCheck2, Loader2, Send, Printer, PartyPopper, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { type ContractorCase } from '@/hooks/useContractorReadiness';
import { type FinancialProposal, type FinancialProposalLine } from '@/hooks/useFinancialProposals';
import { noticeChecks, noticeLetter, type NoticeDraft, type NoticeRecord } from '../../../supabase/functions/_shared/noticeToProceed';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ReadinessCelebration } from './ReadinessCelebration';

const cleanNoticeText = (value: unknown) => String(value ?? '').replace(/[–—]/g, ', ').replace(/\s+\n/g, '\n').trim();
const isoDate = (value?: string | null) => value ? value.slice(0, 10) : '';
const lineAmount = (line: FinancialProposalLine) => {
  const quantity = Number(line.quantity || 0);
  const unitCost = Number(line.unit_cost || 0);
  const markup = Number(line.markup_pct || 0);
  return quantity * unitCost * (1 + markup / 100);
};
const money = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
const proposalApprovedOn = (proposal: FinancialProposal) =>
  isoDate(proposal.accepted_signed_at || proposal.signed_hardcopy_at || proposal.submitted_signed_at || proposal.sent_to_client_at || proposal.updated_at);
const proposalReference = (proposal: FinancialProposal) => [
  proposal.proposal_no,
  proposal.title,
  proposal.revision_no ? `Revision ${proposal.revision_no}` : '',
].filter(Boolean).join(' | ');
const relevantProposalLines = (proposal: FinancialProposal) => {
  const lines = proposal.proposal_lines ?? [];
  const contractorLines = lines.filter(line => line.lead_type !== 'apas' || line.category === 'subcontract');
  return contractorLines.length ? contractorLines : lines;
};
const buildProposalNoticeDraft = (
  proposal: FinancialProposal,
  lines: FinancialProposalLine[],
  authorizedBudget: number,
  contractorName: string,
) => {
  const examples = lines.slice(0, 5).map(line => {
    const lead = line.lead_type === 'apas' ? 'APAS' : line.lead_type;
    return `Line ${line.line_no}: ${line.description} (${lead}, ${line.quantity} ${line.unit}, ${money(lineAmount(line))})`;
  });
  const approvedOn = proposalApprovedOn(proposal);
  const scopePieces = [
    `This Notice to Proceed authorizes ${contractorName} to begin the work approved under ${proposalReference(proposal)}${approvedOn ? `, approved on ${approvedOn}` : ''}.`,
    proposal.scope_bullets?.length ? `Approved scope includes: ${proposal.scope_bullets.slice(0, 4).join('; ')}.` : '',
    proposal.deliverables?.length ? `Deliverables include: ${proposal.deliverables.slice(0, 4).join('; ')}.` : '',
    examples.length ? `Specific proposal examples used for this authorization:\n${examples.join('\n')}` : '',
  ].filter(Boolean);
  return {
    agreement_reference: proposalReference(proposal),
    scope_of_work: cleanNoticeText(scopePieces.join('\n\n')),
    instructions: cleanNoticeText([
      `Authorized budget for this notice is ${money(authorizedBudget)} based on the approved proposal line schedule.`,
      'The start date and completion date must be confirmed before this notice is issued.',
      proposal.terms ? `Proposal terms: ${proposal.terms}` : '',
      'Proceed only within the approved scope, schedule, and budget. Any change in price, scope, field condition, material requirement, or completion date requires written approval before that changed work proceeds.',
      'Coordinate site access, safety requirements, insurance requirements, and closeout documentation with the project team before mobilization.',
    ].filter(Boolean).join('\n\n')),
  };
};

export function NoticeToProceed({ item }: { item: ContractorCase }) {
  const qc = useQueryClient(); const [open,setOpen] = useState(false); const [busy,setBusy] = useState(false); const [celebrate,setCelebrate] = useState(false);
  const [drafting,setDrafting] = useState(false);
  const [selectedProposalId,setSelectedProposalId] = useState('');
  const [draft,setDraft] = useState<NoticeDraft>({agreement_reference:'',agreement_approved_on:'',agreement_confirmed:false,scope_of_work:'',start_date:'',completion_date:'',budget_cents:null,prerequisites_confirmed:false,instructions:'',recipient_email:item.organization?.email ?? '',cc_emails:[],bcc_emails:[],readiness_waived:false,readiness_waiver_reason:''});
  const query = useQuery({queryKey:['contractor-readiness','ntp',item.id],queryFn:async () => {
    const r=await supabase.from('contractor_notices_to_proceed' as any).select('*').eq('case_id',item.id).maybeSingle(); if(r.error) throw r.error; return r.data as unknown as NoticeRecord | null;
  }});
  const branding=useQuery({queryKey:['ntp-branding',item.tenant_id],enabled:open,queryFn:async()=>{
    const r=await supabase.from('company_branding').select('*').eq('workspace_id',item.tenant_id).order('updated_at',{ascending:false}).limit(1).maybeSingle(); if(r.error) throw r.error; return r.data;
  }});
  const record=query.data; const issued=record?.status==='issued';
  const proposals=useQuery({queryKey:['contractor-readiness','ntp-proposals',item.project_id],enabled:open && !issued && !!item.project_id,queryFn:async()=>{
    const r=await supabase.from('proposals').select('*, proposal_lines(*)').eq('project_id',item.project_id!).eq('status','approved').order('updated_at',{ascending:false});
    if(r.error) throw r.error;
    return (r.data ?? []) as unknown as FinancialProposal[];
  }});
  useEffect(()=>{ if(query.data) setDraft(query.data); },[query.data]);
  useEffect(()=>{ if(!selectedProposalId && proposals.data?.length) setSelectedProposalId(proposals.data[0].id); },[proposals.data,selectedProposalId]);
  const selectedProposal=useMemo(()=>proposals.data?.find(p=>p.id===selectedProposalId) ?? null,[proposals.data,selectedProposalId]);
  const selectedLines=useMemo(()=>selectedProposal ? relevantProposalLines(selectedProposal) : [],[selectedProposal]);
  const selectedBudget=useMemo(()=>selectedLines.reduce((total,line)=>total+lineAmount(line),0),[selectedLines]);
  const readinessQualified = item.status === 'qualified' && item.work_ready && item.contract_ready;
  const checks=noticeChecks(draft,readinessQualified,draft.readiness_waived === true);
  const waiverReady = !draft.readiness_waived || Boolean(draft.readiness_waiver_reason?.trim() && draft.readiness_waiver_reason.trim().length >= 12);
  const ready=checks.every(c=>c.ready) && draft.prerequisites_confirmed && !!draft.recipient_email && waiverReady;
  const patch=<K extends keyof NoticeDraft>(key:K,value:NoticeDraft[K])=>setDraft(current=>({...current,[key]:value}));
  const preview:NoticeRecord=issued ? record : {...draft,id:record?.id ?? 'DRAFT',case_id:item.id,status:'draft',snapshot:{company_name:item.organization?.name,project_name:item.project?.name,client_name:item.client?.name,branding:branding.data as unknown as Record<string,string>}};
  const deliverNotice=async(noticeId?: string | null)=>{
    if(!noticeId) throw new Error('Save the issued notice before sending.');
    const r=await supabase.functions.invoke('contractor-ntp',{body:{noticeId}});
    if(r.error || !r.data?.ok) throw new Error(r.data?.error || r.error?.message || 'Delivery failed');
    return r.data as {ok:true;emailId?:string;alreadySent?:boolean};
  };
  const save=async(issue:boolean)=>{
    setBusy(true);
    try {
      const result=await (supabase.rpc as any)('save_contractor_ntp',{p_case_id:item.id,p_draft:draft,p_issue:issue}); if(result.error) throw result.error;
      await qc.invalidateQueries({queryKey:['contractor-readiness']});
      await query.refetch();
      if(issue) {
        const issuedNotice = result.data as NoticeRecord | null;
        try {
          await deliverNotice(issuedNotice?.id);
          toast.success('Notice issued and emailed with the branded PDF.');
        } catch(emailError) {
          const message=emailError instanceof Error?emailError.message:'Email delivery failed';
          toast.error(`Notice issued, but email did not send: ${message}`);
        }
        await query.refetch();
        setCelebrate(true);
      }
      else toast.success('Notice draft saved');
    } catch(e) { toast.error(e instanceof Error?e.message:(e as {message?:string})?.message || 'Could not save notice'); }
    finally {setBusy(false);}
  };
  const draftFromProposal=()=>{
    if(!selectedProposal) { toast.error('Choose an approved proposal first.'); return; }
    setDrafting(true);
    const proposalDraft=buildProposalNoticeDraft(selectedProposal,selectedLines,selectedBudget,item.organization?.name ?? 'the contractor');
    const approvedOn=proposalApprovedOn(selectedProposal);
    setDraft(current=>({
      ...current,
      agreement_reference:proposalDraft.agreement_reference,
      agreement_approved_on:approvedOn || current.agreement_approved_on,
      agreement_confirmed:Boolean(approvedOn) || current.agreement_confirmed,
      scope_of_work:proposalDraft.scope_of_work,
      budget_cents:Number.isFinite(selectedBudget) && selectedBudget > 0 ? Math.round(selectedBudget*100) : current.budget_cents,
      instructions:proposalDraft.instructions,
    }));
    toast.success('Notice draft filled from the approved proposal. Review dates before issuing.');
    setDrafting(false);
  };
  const send=async()=>{setBusy(true);try{await deliverNotice(record?.id); toast.success('Notice emailed as a branded letter with PDF'); await query.refetch();}catch(e){toast.error(e instanceof Error?e.message:'Delivery failed');}finally{setBusy(false);}};
  const print=()=>{const w=window.open('','_blank'); if(w){w.opener=null;w.document.write(`<!doctype html><html><head><title>Notice to Proceed</title><style>@page{size:letter;margin:14mm}body{margin:0}section,table{break-inside:avoid}</style></head><body>${noticeLetter(preview)}</body></html>`);w.document.close();w.print();}};
  return <section className={`relative overflow-hidden rounded-2xl border p-5 ${issued?'border-emerald-300 bg-emerald-50/60':'bg-card'}`}>
    {celebrate && <ReadinessCelebration />}
    <div className="flex flex-wrap items-center justify-between gap-4"><div className="flex items-center gap-3"><div className="rounded-xl bg-emerald-900 p-3 text-white">{issued?<PartyPopper className="h-5 w-5" />:<FileCheck2 className="h-5 w-5" />}</div><div><h2 className="text-lg font-semibold">{issued?'Congratulations. Authorized to proceed.':'From ready to underway'}</h2><p className="text-sm text-muted-foreground">{issued?`Notice issued ${record.issued_at?.slice(0,10)} · Email ${record.delivery_status?.replace('_',' ')}`:'Confirm the essentials, then issue your Notice to Proceed.'}</p></div></div><Button onClick={()=>setOpen(true)} disabled={query.isLoading || !!query.error}>{issued?'View Notice to Proceed':'Prepare Notice to Proceed'}</Button></div>
    {query.error && <p role="alert" className="mt-2 text-sm text-destructive">Could not load notices. <button onClick={()=>query.refetch()} className="underline">Retry</button></p>}
    {!issued && <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-5">{checks.map(c=><div key={c.label} title={c.detail} className={`flex items-center gap-2 rounded-xl p-3 text-xs font-semibold ${c.ready?'bg-emerald-100 text-emerald-900':'bg-muted text-muted-foreground'}`}>{c.ready?<Check className="h-4 w-4" />:<Circle className="h-4 w-4" />}{c.label}</div>)}</div>}
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-h-[94vh] max-w-5xl overflow-y-auto"><DialogHeader><DialogTitle>Notice to Proceed</DialogTitle><DialogDescription>{issued?'The issued letter is saved in the company portal. Email it directly or print a copy.':'A clear scope, a clear schedule, and a clear authorization. Review the letter before issuing.'}</DialogDescription></DialogHeader>
      {issued && <div className="relative overflow-hidden rounded-xl bg-emerald-50 p-4 text-emerald-900">{celebrate && <ReadinessCelebration />}<p className="font-semibold">Congratulations. This work is authorized.</p><p className="mt-1 text-sm">The letter is available in the company portal. Send the email below when you are ready.</p></div>}
      <div className="grid gap-6 lg:grid-cols-2">{!issued && <div className="space-y-4">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 text-emerald-950">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-emerald-900 p-2 text-white"><Sparkles className="h-4 w-4" /></div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">Draft from approved proposal</p>
              <p className="mt-1 text-sm text-emerald-800">Use the approved proposal as the source of truth. This writes the NTP from proposal facts only: scope examples, schedule, budget, and conditions. Dates still need human confirmation before issue.</p>
            </div>
          </div>
          <div className="mt-4 space-y-3">
            <select className="w-full rounded-md border bg-white px-3 py-2 text-sm" value={selectedProposalId} onChange={e=>setSelectedProposalId(e.target.value)} disabled={proposals.isLoading || !proposals.data?.length}>
              {!proposals.data?.length && <option value="">No approved proposals found</option>}
              {proposals.data?.map(proposal=><option key={proposal.id} value={proposal.id}>{proposal.proposal_no} | {proposal.title}</option>)}
            </select>
            {selectedProposal && <div className="rounded-xl bg-white p-3 text-sm">
              <div className="flex flex-wrap justify-between gap-2"><span className="font-semibold">{selectedLines.length} source line item{selectedLines.length===1?'':'s'}</span><span>{money(selectedBudget)}</span></div>
              <ul className="mt-2 max-h-28 space-y-1 overflow-y-auto text-xs text-muted-foreground">
                {selectedLines.slice(0,6).map(line=><li key={line.id}>{line.line_no}. {line.description} · {money(lineAmount(line))}</li>)}
                {selectedLines.length>6 && <li>Plus {selectedLines.length-6} more approved line item{selectedLines.length-6===1?'':'s'}.</li>}
              </ul>
            </div>}
            <Button type="button" variant="secondary" onClick={draftFromProposal} disabled={drafting || proposals.isLoading || !selectedProposal}>
              {drafting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Generate NTP from proposal
            </Button>
          </div>
        </div>
        <Field label="Approved contract or proposal reference"><Input value={draft.agreement_reference} onChange={e=>patch('agreement_reference',e.target.value)} placeholder="Signed proposal number or document reference" /></Field>
        <Field label="Agreement approval date"><Input type="date" value={draft.agreement_approved_on || ''} onChange={e=>patch('agreement_approved_on',e.target.value)} /></Field>
        <label className="flex items-start gap-2 text-sm"><Checkbox checked={draft.agreement_confirmed} onCheckedChange={v=>patch('agreement_confirmed',v===true)} />I have the approved agreement on file and authority to release this work.</label>
        <Field label="Authorized scope and deliverables"><Textarea className="min-h-28" value={draft.scope_of_work} onChange={e=>patch('scope_of_work',e.target.value)} placeholder="Precisely what this company is authorized to perform" /></Field>
        <div className="grid grid-cols-2 gap-3"><Field label="Start date"><Input type="date" value={draft.start_date || ''} onChange={e=>patch('start_date',e.target.value)} /></Field><Field label="Complete by"><Input type="date" value={draft.completion_date || ''} onChange={e=>patch('completion_date',e.target.value)} /></Field></div>
        <Field label="Authorized budget ($)"><Input type="number" min="0" step="0.01" value={draft.budget_cents===null?'':draft.budget_cents/100} onChange={e=>patch('budget_cents',e.target.value===''?null:Math.round(Number(e.target.value)*100))} /></Field>
        <Field label="Site access, permits, coordination, and conditions"><Textarea value={draft.instructions} onChange={e=>patch('instructions',e.target.value)} placeholder="Include any prerequisites or special instructions that apply." /></Field>
        <label className="flex items-start gap-2 text-sm"><Checkbox checked={draft.prerequisites_confirmed} onCheckedChange={v=>patch('prerequisites_confirmed',v===true)} />Site access, permits, and other applicable start conditions are confirmed.</label>
        {!readinessQualified && <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-amber-950">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-amber-600 p-2 text-white"><AlertTriangle className="h-4 w-4" /></div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">Management waiver for this Notice to Proceed</p>
              <p className="mt-1 text-sm text-amber-900">Use this only when you intentionally want to issue the NTP before the full contractor readiness package is complete. The waiver is audited and does not mark the contractor payment or qualification file complete.</p>
            </div>
          </div>
          <label className="mt-3 flex items-start gap-2 text-sm font-semibold"><Checkbox checked={draft.readiness_waived === true} onCheckedChange={v=>patch('readiness_waived',v===true)} />Waive readiness checklist for this NTP only</label>
          {draft.readiness_waived && <Field label="Waiver reason *"><Textarea value={draft.readiness_waiver_reason ?? ''} onChange={e=>patch('readiness_waiver_reason',e.target.value)} placeholder="Example: Owner directed immediate mobilization while W-9 and updated COI are being collected. PM accepts responsibility and will close missing items before payment." /></Field>}
        </div>}
        <Field label="Send to"><Input type="email" value={draft.recipient_email} onChange={e=>patch('recipient_email',e.target.value)} /></Field>
        <div className="grid grid-cols-2 gap-3">{(['cc_emails','bcc_emails'] as const).map(key=><Field key={key} label={key==='cc_emails'?'CC':'BCC'}><Input defaultValue={draft[key].join(', ')} onBlur={e=>patch(key,e.target.value.split(/[,;]+/).map(s=>s.trim()).filter(Boolean))} placeholder="Emails, separated by commas" /></Field>)}</div>
        <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={()=>save(false)} disabled={busy}>Save draft</Button><Button onClick={()=>save(true)} disabled={busy || !ready}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Issue Notice to Proceed</Button></div>
        {!ready && <p className="text-xs text-muted-foreground">Complete the release checks, or record a management waiver for readiness, then confirm applicable start conditions to issue. You can save a draft at any time.</p>}
      </div>}
      <div className={issued?'lg:col-span-2':''}><iframe title="Notice to Proceed letter preview" sandbox="" srcDoc={noticeLetter(preview)} className="h-[650px] w-full rounded-xl border bg-white" />{issued && <div className="mt-4 flex flex-wrap gap-2"><Button onClick={send} disabled={busy || record.delivery_status==='sent'}><Send className="mr-2 h-4 w-4" />{record.delivery_status==='sent'?'Email sent':'Email letter + PDF'}</Button><Button variant="outline" onClick={print}><Printer className="mr-2 h-4 w-4" />Print / Save PDF</Button></div>}</div></div>
    </DialogContent></Dialog>
  </section>;
}
function Field({label,children}:{label:string;children:ReactNode}) {return <label className="block space-y-1.5"><Label asChild><span>{label}</span></Label>{children}</label>;}
