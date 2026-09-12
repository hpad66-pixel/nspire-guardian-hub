import { useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { ContractorRequirement } from '@/hooks/useContractorReadiness';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function PriorApproval({requirement,onSaved}:{requirement:ContractorRequirement;onSaved:()=>unknown}) {
  const [reference,setReference]=useState(requirement.prior_approval_reference ?? '');
  const [until,setUntil]=useState(requirement.prior_approval_valid_until ?? ''); const [busy,setBusy]=useState(false);
  const save=async()=>{setBusy(true);try{const {error}=await (supabase.rpc as any)('record_contractor_prior_approval',{p_requirement_id:requirement.id,p_reference:reference,p_valid_until:until||null});if(error)throw error;toast.success('Existing approval recorded. No upload requested.');await onSaved();}catch(e){toast.error((e as {message?:string})?.message||'Could not record approval');}finally{setBusy(false);}};
  return <details className="rounded-xl border bg-emerald-50/50 p-3"><summary className="cursor-pointer text-sm font-semibold">{requirement.prior_approval_reference ? 'Approval already on file' : 'Already approved? Record it here'}</summary><p className="mt-2 text-xs text-muted-foreground">Reference the evidence your team already reviewed. This records your approval and removes the repeat request from their portal.</p><div className="mt-3 space-y-3"><label className="block text-xs">Approval or evidence reference<Input className="mt-1" value={reference} onChange={e=>setReference(e.target.value)} placeholder="Reviewed certificate, document number, or approval record" /></label><label className="block text-xs">Valid through {requirement.expiration_required?'(required)':'(if applicable)'}<Input className="mt-1" type="date" value={until} onChange={e=>setUntil(e.target.value)} /></label><Button size="sm" variant="outline" disabled={busy || !reference.trim() || (requirement.expiration_required&&!until)} onClick={save}>Confirm prior approval</Button></div></details>;
}
