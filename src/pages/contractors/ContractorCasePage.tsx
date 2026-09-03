import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  AlertCircle, ArrowLeft, Bot, Building2, Check, CheckCircle2, Clock3, Copy,
  BellRing, ExternalLink, Eye, FileCheck2, FileUp, Loader2, LockKeyhole, Mail, MessageSquare,
  RefreshCcw, Send, ShieldAlert, ShieldCheck, Sparkles, X,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import {
  getContractorDocumentUrl, useContractorAutomation, useContractorCase, useContractorReviewActions,
  type ContractorDocument, type ContractorRequirement,
} from '@/hooks/useContractorReadiness';
import { requireTenantId } from '@/lib/tenant';
import { supabase } from '@/integrations/supabase/client';
import { ReadinessBadge } from '@/components/contractors/ReadinessBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function ContractorCasePage() {
  const { caseId } = useParams<{ caseId: string }>();
  const { data: item, isLoading, refetch } = useContractorCase(caseId);
  const automation = useContractorAutomation(caseId ? [caseId] : []);
  const actions = useContractorReviewActions(caseId ?? '');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<'contractor' | 'broker'>('contractor');
  const [inviteResult, setInviteResult] = useState<{ link: string; emailSent: boolean } | null>(null);
  const [notes, setNotes] = useState('');
  const docs = useMemo(() => new Map((item?.documents ?? []).map((d) => [d.id, d])), [item?.documents]);
  const latestPortal = automation.data?.links[0];
  useEffect(() => { setNotes(item?.internal_notes ?? ''); }, [item?.id, item?.internal_notes]);

  if (isLoading) return <div className="mx-auto max-w-6xl space-y-4 p-6"><Skeleton className="h-24" /><Skeleton className="h-64" /></div>;
  if (!item) return <div className="p-8 text-center"><h1 className="text-xl font-bold">Qualification case not found</h1><Button className="mt-4" asChild><Link to="/contractor-readiness">Back to Contractor Readiness</Link></Button></div>;

  const sendInvite = async () => {
    try {
      const result = await actions.invite.mutateAsync({ email: inviteEmail, name: inviteName, role: inviteRole });
      setInviteResult(result);
      toast.success(result.emailSent ? 'Secure invitation emailed' : 'Secure link created');
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Invitation failed'); }
  };
  const setCaseStatus = async (status: any) => {
    try { await actions.updateCase.mutateAsync({ status }); toast.success('Case status updated'); }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Update failed'); }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
      <Link to={item.project_id ? `/projects/${item.project_id}/contractors` : item.client_id ? `/organizations/${item.client_id}/contractors` : '/contractor-readiness'} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Back to contractor list</Link>
      <div className="flex flex-col gap-4 rounded-2xl border bg-gradient-to-br from-emerald-950 to-[#173d34] p-5 text-white shadow-xl sm:flex-row sm:items-center sm:justify-between sm:p-7">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/20"><Building2 className="h-6 w-6" /></div>
          <div><div className="flex flex-wrap items-center gap-2"><h1 className="text-2xl font-bold sm:text-3xl">{item.organization?.name}</h1><ReadinessBadge status={item.status} /></div><p className="mt-1 text-sm text-white/70">{item.project?.name ?? item.client?.name ?? 'Company-wide qualification'} · {item.risk_tier} risk</p></div>
        </div>
        <div className="flex flex-wrap gap-2"><Button variant="secondary" onClick={() => { setInviteEmail(item.organization?.email ?? ''); setInviteOpen(true); }}><Mail className="mr-2 h-4 w-4" />Send secure link</Button><Select value={['suspended', 'rejected'].includes(item.status) ? item.status : 'automatic'} onValueChange={(value) => setCaseStatus(value === 'automatic' ? 'in_progress' : value)}><SelectTrigger className="w-[210px] border-white/20 bg-white/10 text-white"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="automatic">Automatic · {item.status.replace(/_/g, ' ')}</SelectItem><SelectItem value="suspended">Suspend company</SelectItem><SelectItem value="rejected">Reject company</SelectItem></SelectContent></Select></div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card><CardContent className="p-4"><div className="flex items-center justify-between"><span className="text-sm font-semibold">Readiness score</span><span className="text-2xl font-bold">{Math.round(Number(item.score))}%</span></div><Progress value={Number(item.score)} className="mt-3 h-2.5" /></CardContent></Card>
        <GateCard label="Work ready" ready={item.work_ready} description="License & insurance" />
        <GateCard label="Contract ready" ready={item.contract_ready} description="Work + due diligence" />
        <GateCard label="Payment ready" ready={item.payment_ready} description="Contract + tax controls" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <Card>
          <CardHeader><CardTitle>Qualification checklist</CardTitle><CardDescription>Review the evidence, use AI only to extract visible fields, and make the final human decision.</CardDescription></CardHeader>
          <CardContent>
            <Accordion type="multiple" className="space-y-2">
              {(item.requirements ?? []).map((requirement) => (
                <RequirementReview key={requirement.id} requirement={requirement} document={requirement.current_document_id ? docs.get(requirement.current_document_id) : undefined} comments={(item.comments ?? []).filter((c) => c.requirement_id === requirement.id)} activeException={(item.exceptions ?? []).find((exception) => exception.requirement_id === requirement.id)} caseItem={item} onRefresh={refetch} actions={actions} />
              ))}
            </Accordion>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card><CardHeader><CardTitle className="text-base">Company record</CardTitle></CardHeader><CardContent className="space-y-2 text-sm"><Row label="Legal name" value={item.organization?.legal_name || item.organization?.name} /><Row label="Email" value={item.organization?.email} /><Row label="Phone" value={item.organization?.phone} /><Row label="Website" value={item.organization?.website} link /><Row label="Trades" value={(item.profile?.trade_categories ?? []).join(', ') || 'Not provided'} /><Row label="Service area" value={(item.profile?.service_areas ?? []).join(', ') || 'Not provided'} /></CardContent></Card>
          <Card><CardHeader><CardTitle className="text-base">Portal automation</CardTitle><CardDescription>Invitation delivery, contractor activity, and automated follow-up.</CardDescription></CardHeader><CardContent className="space-y-3">{latestPortal ? <><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><Mail className="h-4 w-4 text-emerald-700" /><span className="text-sm font-semibold">{latestPortal.delivery_status === 'sent' ? 'Email delivered' : latestPortal.delivery_status === 'failed' ? 'Email failed' : 'Secure link ready'}</span></div><span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${latestPortal.delivery_status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>{latestPortal.delivery_status.replace('_', ' ')}</span></div><div className="grid grid-cols-2 gap-2"><PortalFact icon={Eye} label="Portal activity" value={latestPortal.last_used_at ? `Opened ${formatDistanceToNow(new Date(latestPortal.last_used_at), { addSuffix: true })}` : 'Not opened yet'} /><PortalFact icon={BellRing} label="Reminders sent" value={String(automation.data?.reminders.filter((event) => event.status === 'sent').length ?? 0)} /></div><p className="text-[11px] text-muted-foreground">Sent to {latestPortal.email} · link expires {format(new Date(latestPortal.expires_at), 'MMM d, yyyy')}</p></> : <div className="rounded-lg border border-dashed p-4 text-center"><Mail className="mx-auto h-5 w-5 text-muted-foreground" /><p className="mt-2 text-sm font-semibold">No contractor portal issued</p><p className="mt-1 text-xs text-muted-foreground">Use “Send secure link” to start automated onboarding.</p></div>}</CardContent></Card>
          <Card><CardHeader><CardTitle className="text-base">Internal notes</CardTitle><CardDescription>Never shown in the contractor portal.</CardDescription></CardHeader><CardContent><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Risk, capacity, reference calls, conditions…" rows={5} /><Button className="mt-3 w-full" variant="outline" disabled={actions.updateCase.isPending} onClick={async () => { try { await actions.updateCase.mutateAsync({ internal_notes: notes }); toast.success('Notes saved'); } catch (e) { toast.error(e instanceof Error ? e.message : 'Save failed'); } }}>Save notes</Button></CardContent></Card>
          <Card><CardHeader><CardTitle className="text-base">Audit trail</CardTitle></CardHeader><CardContent className="space-y-3">{(item.activity ?? []).slice(0, 8).map((event) => <div key={event.id} className="border-l-2 border-emerald-200 pl-3"><p className="text-xs font-semibold capitalize">{event.action.replace(/_/g, ' ')}</p><p className="text-[11px] text-muted-foreground">{format(new Date(event.created_at), 'MMM d, yyyy · h:mm a')}</p></div>)}{!(item.activity ?? []).length && <p className="text-sm text-muted-foreground">No activity yet.</p>}</CardContent></Card>
        </div>
      </div>

      <Dialog open={inviteOpen} onOpenChange={(open) => { setInviteOpen(open); if (!open) setInviteResult(null); }}>
        <DialogContent><DialogHeader><DialogTitle>Send qualification request</DialogTitle><DialogDescription>The recipient gets a branded, mobile-ready checklist with no password. The secure link expires in 30 days.</DialogDescription></DialogHeader>{inviteResult ? <div className="space-y-3"><div className={`rounded-lg p-3 text-sm ${inviteResult.emailSent ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-900'}`}>{inviteResult.emailSent ? 'Invitation email sent successfully.' : 'Email is not configured, but the secure link is ready to copy.'}</div><div className="flex gap-2"><Input readOnly value={inviteResult.link} /><Button size="icon" onClick={() => { navigator.clipboard.writeText(inviteResult.link); toast.success('Link copied'); }}><Copy className="h-4 w-4" /></Button></div></div> : <div className="space-y-3"><div><Label>Recipient type</Label><Select value={inviteRole} onValueChange={(value: 'contractor' | 'broker') => setInviteRole(value)}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="contractor">Contractor representative</SelectItem><SelectItem value="broker">Insurance broker</SelectItem></SelectContent></Select></div><div><Label>Contact name</Label><Input className="mt-1" value={inviteName} onChange={(e) => setInviteName(e.target.value)} /></div><div><Label>Email *</Label><Input className="mt-1" type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} /></div></div>}<DialogFooter>{!inviteResult && <Button onClick={sendInvite} disabled={actions.invite.isPending}>{actions.invite.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}Send request</Button>}</DialogFooter></DialogContent>
      </Dialog>
    </div>
  );
}

function RequirementReview({ requirement, document, comments, activeException, caseItem, onRefresh, actions }: {
  requirement: ContractorRequirement; document?: ContractorDocument; comments: any[]; activeException?: { reason: string; expires_at: string }; caseItem: any; onRefresh: () => unknown; actions: ReturnType<typeof useContractorReviewActions>;
}) {
  const [comment, setComment] = useState('');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [exceptionOpen, setExceptionOpen] = useState(false);
  const busy = actions.reviewRequirement.isPending || actions.analyzeDocument.isPending;
  const review = async (decision: 'verified' | 'needs_correction' | 'not_applicable') => {
    let note = '';
    if (decision === 'needs_correction') note = window.prompt('What must the contractor correct?')?.trim() || '';
    if (decision === 'needs_correction' && !note) return;
    try { await actions.reviewRequirement.mutateAsync({ requirement, decision, note }); toast.success(decision === 'verified' ? 'Requirement verified' : decision === 'needs_correction' ? 'Correction requested' : 'Marked not applicable'); }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Review failed'); }
  };
  const openDocument = async () => { if (!document) return; try { window.open(await getContractorDocumentUrl(document.storage_path), '_blank', 'noopener'); } catch (e) { toast.error(e instanceof Error ? e.message : 'Could not open document'); } };
  const analyze = async () => { if (!document) return; try { await actions.analyzeDocument.mutateAsync(document.id); toast.success('AI extraction is ready for human review'); } catch (e) { toast.error(e instanceof Error ? e.message : 'AI review failed'); } };

  return (
    <AccordionItem value={requirement.id} className="rounded-xl border px-4">
      <AccordionTrigger className="hover:no-underline"><div className="flex min-w-0 flex-1 items-center gap-3 text-left"><div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${requirement.status === 'verified' ? 'bg-emerald-100 text-emerald-700' : ['expired','needs_correction'].includes(requirement.status) ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`}>{requirement.status === 'verified' ? <Check className="h-4 w-4" /> : requirement.legally_required ? <LockKeyhole className="h-4 w-4" /> : <FileCheck2 className="h-4 w-4" />}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="font-semibold">{requirement.title}</span><ReadinessBadge status={requirement.status} />{requirement.legally_required && <span className="text-[10px] font-bold uppercase tracking-wide text-red-700">No waiver</span>}</div><p className="mt-0.5 text-xs text-muted-foreground capitalize">{requirement.gate_type} gate · {requirement.category}</p></div></div></AccordionTrigger>
      <AccordionContent className="pb-4">
        <div className="ml-0 space-y-4 sm:ml-12">
          <p className="text-sm leading-6 text-muted-foreground">{requirement.description}{requirement.instructions ? ` ${requirement.instructions}` : ''}</p>
          {activeException && <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950"><p className="font-bold">Temporary management exception</p><p className="mt-1 text-xs">{activeException.reason} · expires {format(new Date(activeException.expires_at), 'MMM d, yyyy')}</p></div>}
          {document ? <div className="rounded-lg border bg-muted/30 p-3"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="truncate text-sm font-semibold">{document.file_name}</p><p className="text-xs text-muted-foreground">Uploaded {format(new Date(document.created_at), 'MMM d, yyyy')}{document.expiration_date ? ` · expires ${document.expiration_date}` : ''}{document.identifier ? ` · #${document.identifier}` : ''}</p></div><div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={openDocument}><ExternalLink className="mr-1.5 h-3.5 w-3.5" />Open</Button><Button size="sm" variant="outline" onClick={analyze} disabled={busy}><Sparkles className="mr-1.5 h-3.5 w-3.5" />AI extract</Button><Button size="sm" variant="outline" onClick={() => setUploadOpen(true)}><RefreshCcw className="mr-1.5 h-3.5 w-3.5" />Replace</Button></div></div>{document.ai_reviewed_at && <AiDraft data={document.ai_extracted_data} />}</div> : <button type="button" onClick={() => setUploadOpen(true)} className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed p-5 text-sm font-semibold text-muted-foreground hover:border-emerald-400 hover:text-emerald-700"><FileUp className="h-4 w-4" />Upload on behalf of contractor</button>}
          <div className="flex flex-wrap gap-2"><Button size="sm" onClick={() => review('verified')} disabled={busy || requirement.status === 'verified'}><CheckCircle2 className="mr-1.5 h-4 w-4" />Verify</Button><Button size="sm" variant="outline" onClick={() => review('needs_correction')} disabled={busy}><X className="mr-1.5 h-4 w-4" />Request correction</Button>{!requirement.legally_required && <Button size="sm" variant="ghost" onClick={() => review('not_applicable')} disabled={busy}>Not applicable</Button>}{!requirement.legally_required && !activeException && <Button size="sm" variant="ghost" className="text-amber-800" onClick={() => setExceptionOpen(true)}>Temporary exception</Button>}</div>
          <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-900"><div className="mb-2 flex items-center gap-2 text-xs font-semibold"><MessageSquare className="h-3.5 w-3.5" />Clarifications</div>{comments.map((c) => <div key={c.id} className="mb-2 rounded-md bg-background p-2 text-xs"><div className="font-semibold">{c.author_name || c.author_type} <span className="font-normal text-muted-foreground">· {format(new Date(c.created_at), 'MMM d, h:mm a')}</span></div><p className="mt-1 text-muted-foreground">{c.body}</p></div>)}<div className="flex gap-2"><Input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Ask a question or document the review…" /><Button size="icon" variant="outline" disabled={!comment.trim() || actions.addComment.isPending} onClick={async () => { try { await actions.addComment.mutateAsync({ requirementId: requirement.id, body: comment.trim() }); setComment(''); toast.success('Comment added'); } catch (e) { toast.error(e instanceof Error ? e.message : 'Could not add comment'); } }}><Send className="h-4 w-4" /></Button></div></div>
        </div>
        <StaffUploadDialog open={uploadOpen} onOpenChange={setUploadOpen} requirement={requirement} caseItem={caseItem} currentDocument={document} onDone={onRefresh} />
        <TemporaryExceptionDialog open={exceptionOpen} onOpenChange={setExceptionOpen} requirement={requirement} action={actions.createException} />
      </AccordionContent>
    </AccordionItem>
  );
}

function TemporaryExceptionDialog({ open, onOpenChange, requirement, action }: any) {
  const [reason, setReason] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const submit = async () => {
    if (!reason.trim() || !expiresAt) return toast.error('Enter the reason and expiration date.');
    try {
      await action.mutateAsync({ requirementId: requirement.id, reason, expiresAt });
      toast.success('Temporary exception recorded');
      setReason(''); setExpiresAt(''); onOpenChange(false);
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not record exception'); }
  };
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent><DialogHeader><DialogTitle>Temporary management exception</DialogTitle><DialogDescription>This is time-limited, fully audited, and keeps the company conditionally qualified. Legally required items can never use this control.</DialogDescription></DialogHeader><div className="space-y-3"><div><Label>Business reason *</Label><Textarea className="mt-1" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Document the risk, interim control, and person responsible for closing the gap." /></div><div><Label>Expires *</Label><Input className="mt-1" type="date" min={new Date().toISOString().slice(0, 10)} value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} /></div></div><DialogFooter><Button onClick={submit} disabled={action.isPending}>{action.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Approve exception</Button></DialogFooter></DialogContent></Dialog>;
}

function StaffUploadDialog({ open, onOpenChange, requirement, caseItem, currentDocument, onDone }: any) {
  const fileRef = useRef<HTMLInputElement>(null); const [file, setFile] = useState<File | null>(null); const [expiration, setExpiration] = useState(''); const [identifier, setIdentifier] = useState(''); const [authority, setAuthority] = useState(''); const [busy, setBusy] = useState(false);
  const upload = async () => {
    if (!file) return toast.error('Choose a file');
    if (requirement.expiration_required && !expiration) return toast.error('Enter the expiration date');
    setBusy(true);
    try {
      const tenantId = await requireTenantId(); const path = `${tenantId}/${caseItem.organization_id}/${caseItem.id}/${requirement.requirement_code}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]+/g, '-')}`;
      const { error: uploadError } = await supabase.storage.from('contractor-readiness').upload(path, file, { contentType: file.type, upsert: false }); if (uploadError) throw uploadError;
      if (currentDocument) await supabase.from('contractor_documents' as any).update({ verification_status: 'superseded' }).eq('id', currentDocument.id);
      const { data: document, error } = await supabase.from('contractor_documents' as any).insert({ tenant_id: tenantId, organization_id: caseItem.organization_id, case_id: caseItem.id, document_type: requirement.requirement_code, title: requirement.title, storage_path: path, file_name: file.name, mime_type: file.type, file_size: file.size, expiration_date: expiration || null, identifier: identifier || null, issuing_authority: authority || null, source: 'staff', supersedes_document_id: currentDocument?.id ?? null }).select('id').single(); if (error) throw error;
      const { error: reqError } = await supabase.from('contractor_case_requirements' as any).update({ current_document_id: (document as any).id, status: 'submitted' }).eq('id', requirement.id); if (reqError) throw reqError;
      toast.success('Document uploaded for review'); onOpenChange(false); setFile(null); setExpiration(''); setIdentifier(''); setAuthority(''); await onDone();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Upload failed'); } finally { setBusy(false); }
  };
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent><DialogHeader><DialogTitle>{currentDocument ? 'Replace' : 'Upload'} {requirement.title}</DialogTitle><DialogDescription>The previous file remains in the audit trail when replaced.</DialogDescription></DialogHeader><div className="space-y-3"><input ref={fileRef} type="file" accept=".pdf,.docx,image/jpeg,image/png,image/webp" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="block w-full text-sm" /><div className="grid grid-cols-2 gap-3"><div><Label>Identifier / license #</Label><Input className="mt-1" value={identifier} onChange={(e) => setIdentifier(e.target.value)} /></div><div><Label>Issuing authority</Label><Input className="mt-1" value={authority} onChange={(e) => setAuthority(e.target.value)} /></div></div><div><Label>Expiration date {requirement.expiration_required ? '*' : ''}</Label><Input className="mt-1" type="date" value={expiration} onChange={(e) => setExpiration(e.target.value)} /></div></div><DialogFooter><Button onClick={upload} disabled={busy}>{busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileUp className="mr-2 h-4 w-4" />}Upload</Button></DialogFooter></DialogContent></Dialog>;
}

function AiDraft({ data }: { data: Record<string, unknown> }) { const contradictions = Array.isArray(data?.contradictions) ? data.contradictions as string[] : []; return <div className="mt-3 rounded-lg border border-violet-200 bg-violet-50 p-3 text-xs text-violet-950 dark:border-violet-800 dark:bg-violet-950 dark:text-violet-100"><div className="flex items-center gap-2 font-bold"><Bot className="h-4 w-4" />AI extraction draft — human review required</div><div className="mt-2 grid gap-1 sm:grid-cols-2">{['company_name','identifier','issuing_authority','issue_date','expiration_date','named_insured'].map((key) => data?.[key] ? <div key={key}><span className="capitalize text-violet-700 dark:text-violet-300">{key.replace(/_/g, ' ')}:</span> {String(data[key])}</div> : null)}</div>{contradictions.length > 0 && <div className="mt-2 rounded bg-red-100 p-2 text-red-900"><b>Review flags:</b> {contradictions.join(' · ')}</div>}</div>; }
function GateCard({ label, ready, description }: { label: string; ready: boolean; description: string }) { return <Card className={ready ? 'border-emerald-200' : ''}><CardContent className="flex items-center gap-3 p-4"><div className={`flex h-10 w-10 items-center justify-center rounded-full ${ready ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{ready ? <ShieldCheck className="h-5 w-5" /> : <ShieldAlert className="h-5 w-5" />}</div><div><p className="text-sm font-bold">{label}</p><p className="text-xs text-muted-foreground">{ready ? 'Cleared' : description}</p></div></CardContent></Card>; }
function PortalFact({ icon: Icon, label, value }: { icon: typeof Eye; label: string; value: string }) { return <div className="rounded-lg bg-muted/60 p-2.5"><Icon className="h-3.5 w-3.5 text-emerald-700" /><p className="mt-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-0.5 text-xs font-semibold">{value}</p></div>; }
function Row({ label, value, link }: { label: string; value?: string | null; link?: boolean }) { return <div><p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{label}</p>{link && value ? <a className="break-all text-emerald-700 hover:underline" href={value.startsWith('http') ? value : `https://${value}`} target="_blank" rel="noreferrer">{value}</a> : <p className="break-words">{value || 'Not provided'}</p>}</div>; }
