import { useEffect, useMemo, useState } from 'react';
import { jsPDF } from 'jspdf';
import { FilePlus2, Loader2, ShieldCheck, Upload } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useConsultingCosts, type ConsultingCostType } from '@/hooks/useConsultingCashFlow';
import { useFinancialProposals } from '@/hooks/useFinancialProposals';
import { useOrganizations } from '@/hooks/useDirectory';
import { useProjectArtifacts, type ProjectArtifact } from '@/hooks/useProjectArtifacts';
import { supabase } from '@/integrations/supabase/client';
import { money } from '@/components/projects/invoicing/invoiceMeta';
import { validateFinancialEvidenceFile } from '@/lib/secureFinancialUpload';
import { toast } from 'sonner';

const today = () => new Date().toISOString().slice(0, 10);
const TYPE_LABEL: Record<ConsultingCostType, string> = {
  subcontractor: 'Subcontractor', consultant: 'Consultant', reimbursable: 'Reimbursable',
  internal_labor: 'Internal labor', other: 'Other',
};

export function ConsultingInvoiceDraftDialog({ open, onOpenChange, projectId, projectName }: {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  projectId: string;
  projectName: string;
}) {
  const { create } = useConsultingCosts(projectId);
  const artifacts = useProjectArtifacts(projectId);
  const { data: organizations = [] } = useOrganizations();
  const { data: proposals = [] } = useFinancialProposals(projectId);
  const vendors = useMemo(() => organizations.filter((item) => ['sub', 'vendor', 'consultant', 'other'].includes(item.kind)), [organizations]);
  const [vendorOrgId, setVendorOrgId] = useState('');
  const [costType, setCostType] = useState<ConsultingCostType>('subcontractor');
  const [proposalId, setProposalId] = useState('none');
  const [reference, setReference] = useState('');
  const [description, setDescription] = useState('');
  const [billDate, setBillDate] = useState(today());
  const [dueDate, setDueDate] = useState('');
  const [amount, setAmount] = useState('');
  const [mode, setMode] = useState<'generate' | 'upload'>('generate');
  const [sourceFile, setSourceFile] = useState<File | null>(null);

  useEffect(() => {
    if (!open) return;
    setVendorOrgId(''); setCostType('subcontractor'); setProposalId('none');
    setReference(''); setDescription(''); setBillDate(today()); setDueDate('');
    setAmount(''); setMode('generate'); setSourceFile(null);
  }, [open]);

  const vendor = vendors.find((item) => item.id === vendorOrgId);
  const approved = proposals.filter((proposal) => proposal.status === 'approved');

  function generatedInvoice(): File {
    const pdf = new jsPDF({ unit: 'pt', format: 'letter' });
    const total = Number(amount);
    pdf.setFillColor(9, 45, 37);
    pdf.rect(0, 0, 612, 104, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    pdf.text('APAS PROJECT CONTROLS', 44, 38);
    pdf.setFontSize(24);
    pdf.text('Vendor Invoice Draft', 44, 72);
    pdf.setTextColor(25, 42, 36);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Prepared administratively on behalf of the vendor — subject to vendor confirmation and APAS approval.', 44, 130);
    pdf.setDrawColor(214, 210, 199);
    pdf.line(44, 148, 568, 148);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(12);
    pdf.text(vendor?.name || 'Vendor', 44, 180);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.text(`Project: ${projectName}`, 44, 204);
    pdf.text(`Invoice / reference: ${reference || 'Draft'}`, 44, 224);
    pdf.text(`Invoice date: ${billDate}`, 44, 244);
    if (dueDate) pdf.text(`Due date: ${dueDate}`, 44, 264);
    pdf.setFillColor(247, 246, 242);
    pdf.roundedRect(44, 300, 524, 108, 8, 8, 'F');
    pdf.setFont('helvetica', 'bold');
    pdf.text('Description of services', 60, 326);
    pdf.setFont('helvetica', 'normal');
    pdf.text(pdf.splitTextToSize(description || 'Consulting services', 355), 60, 348);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(16);
    pdf.text(money(total), 552, 354, { align: 'right' });
    pdf.setFontSize(9);
    pdf.setTextColor(95, 104, 100);
    pdf.text('This document does not authorize payment. Approval and bank execution are separate controls.', 44, 744);
    const blob = pdf.output('blob');
    return new File([blob], `${(vendor?.name || 'vendor').replace(/[^a-z0-9]+/gi, '-')}-${reference || 'draft'}.pdf`, { type: 'application/pdf' });
  }

  async function save() {
    if (!vendor) return;
    let artifact: ProjectArtifact | null = null;
    try {
      const file = mode === 'upload' ? sourceFile : generatedInvoice();
      if (!file) throw new Error('Choose the vendor invoice file.');
      await validateFinancialEvidenceFile(file);
      artifact = await artifacts.upload.mutateAsync({
        file,
        projectId,
        input: {
          artifact_type: 'invoice', source_system: 'manual',
          title: `${vendor.name} invoice ${reference || 'draft'}`,
          description: mode === 'generate'
            ? 'Administrative invoice draft prepared by APAS on behalf of vendor'
            : 'Vendor invoice received and uploaded by APAS',
          period_date: billDate, reference_no: reference.trim() || undefined,
          amount: Number(amount), tags: ['consulting', 'vendor-invoice', 'admin-on-behalf'],
        },
      });
      const cost = await create.mutateAsync({
        vendor_org_id: vendor.id,
        vendor_name: vendor.name,
        cost_type: costType,
        proposal_id: proposalId === 'none' ? null : proposalId,
        reference_no: reference.trim(),
        description: description.trim() || null,
        bill_date: billDate,
        due_date: dueDate || null,
        amount: Number(amount),
        status: 'draft',
        invoice_artifact_id: artifact.id,
        source_kind: 'admin_on_behalf',
        source_status: 'received',
        source_note: mode === 'generate'
          ? 'Prepared by APAS on behalf of vendor; administrative exception pending review'
          : 'Vendor-provided invoice uploaded by APAS pending review',
      });
      await supabase.from('project_artifacts' as never).update({
        linked_entity_type: 'consulting_cost', linked_entity_id: cost.id,
      } as never).eq('id', artifact.id);
      toast.success('Invoice draft created — review and approve it before payment');
      onOpenChange(false);
    } catch (caught) {
      if (artifact) await artifacts.remove.mutateAsync(artifact).catch(() => undefined);
      toast.error(caught instanceof Error ? caught.message : 'Invoice draft could not be created');
    }
  }

  const valid = Boolean(vendor && reference.trim() && billDate && Number(amount) > 0 && (mode === 'generate' || sourceFile));
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-[680px]">
        <DialogHeader><DialogTitle>Create an invoice on behalf of a vendor</DialogTitle><DialogDescription>This creates a documented draft—not an approved cost and never an automatic payment.</DialogDescription></DialogHeader>
        <div className="space-y-4 py-1">
          <div className="flex gap-2 rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-950"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" /><p>ProjOS records who prepared this document and keeps approval separate. The PDF is visibly labeled as an administrative draft.</p></div>
          <Field label="Vendor company *"><Select value={vendorOrgId} onValueChange={setVendorOrgId}><SelectTrigger><SelectValue placeholder="Choose a vendor or consultant" /></SelectTrigger><SelectContent>{vendors.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Cost type"><Select value={costType} onValueChange={(value) => setCostType(value as ConsultingCostType)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(TYPE_LABEL).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></Field>
            <Field label="Invoice number *"><Input value={reference} onChange={(event) => setReference(event.target.value)} placeholder="INV-1001" /></Field>
            <Field label="Invoice date"><Input type="date" max={today()} value={billDate} onChange={(event) => setBillDate(event.target.value)} /></Field>
            <Field label="Due date"><Input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} /></Field>
            <Field label="Invoice amount *"><Input inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value.replace(/[^0-9.]/g, ''))} placeholder="0.00" /></Field>
            <Field label="Related executed proposal"><Select value={proposalId} onValueChange={setProposalId}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">General project cost</SelectItem>{approved.map((proposal) => <SelectItem key={proposal.id} value={proposal.id}>{proposal.proposal_no} · {proposal.title}</SelectItem>)}</SelectContent></Select></Field>
          </div>
          <Field label="Description"><Textarea rows={3} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Scope, deliverable, or billing period" /></Field>
          <div>
            <Label>Source document</Label>
            <div className="mt-2 grid grid-cols-2 gap-2"><Button type="button" variant={mode === 'generate' ? 'default' : 'outline'} onClick={() => setMode('generate')}><FilePlus2 className="mr-2 h-4 w-4" />Generate labeled PDF</Button><Button type="button" variant={mode === 'upload' ? 'default' : 'outline'} onClick={() => setMode('upload')}><Upload className="mr-2 h-4 w-4" />Upload vendor PDF</Button></div>
            {mode === 'upload' && <label className="mt-3 flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed p-4"><Upload className="h-5 w-5" /><span className="min-w-0 flex-1 truncate text-sm">{sourceFile?.name || 'Choose PDF or image'}</span><input className="hidden" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={(event) => setSourceFile(event.target.files?.[0] ?? null)} /></label>}
          </div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button onClick={save} disabled={!valid || create.isPending || artifacts.upload.isPending}>{(create.isPending || artifacts.upload.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Create controlled draft</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;
}
