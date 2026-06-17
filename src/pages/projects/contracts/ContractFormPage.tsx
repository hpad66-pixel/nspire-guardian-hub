import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  useProjectContracts,
  SEWER_EXTENSION_TEMPLATE,
  SEWER_EXTENSION_SOV,
  type ContractUpsert,
  type SovItemUpsert,
} from '@/hooks/useProjectContracts';
import { useDefaultLibrary, useCostCodes } from '@/hooks/useCostCodes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Plus, Trash2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

const contractSchema = z.object({
  contract_number: z.string().optional(),
  contract_title: z.string().min(1, 'Title is required'),
  contract_type: z.string(),
  status: z.string(),
  docusign_envelope_id: z.string().optional(),
  prime_contractor_name: z.string().optional(),
  prime_contractor_address: z.string().optional(),
  prime_contractor_contact: z.string().optional(),
  prime_contractor_email: z.string().email().optional().or(z.literal('')),
  subcontractor_name: z.string().optional(),
  subcontractor_address: z.string().optional(),
  subcontractor_contact: z.string().optional(),
  subcontractor_email: z.string().email().optional().or(z.literal('')),
  project_address: z.string().optional(),
  contract_date: z.string().optional(),
  start_date: z.string().optional(),
  substantial_completion_date: z.string().optional(),
  final_completion_date: z.string().optional(),
  actual_completion_date: z.string().optional(),
  signed_contract_received_date: z.string().optional(),
  base_contract_amount: z.coerce.number().optional(),
  retainage_percent: z.coerce.number().optional(),
  mobilization_advance: z.coerce.number().optional(),
  liquidated_damages_per_day: z.coerce.number().optional(),
  retainage_release_substantial: z.coerce.number().optional(),
  retainage_release_final: z.coerce.number().optional(),
  retainage_warranty_months: z.coerce.number().optional(),
  payment_cycle_days: z.coerce.number().optional(),
  payment_due_within_days: z.coerce.number().optional(),
  scope_description: z.string().optional(),
  inclusions: z.string().optional(),
  exclusions: z.string().optional(),
  special_conditions: z.string().optional(),
  sov_items: z.array(z.object({
    id: z.string().optional(),
    item_number: z.coerce.number(),
    budget_code: z.string().optional(),
    cost_code_id: z.string().nullable().optional(),
    description: z.string().min(1),
    quantity: z.coerce.number().optional(),
    unit: z.string().optional(),
    unit_cost: z.coerce.number().optional(),
    subtotal: z.coerce.number().optional(),
    completed_qty: z.coerce.number().default(0),
    completed_pct: z.coerce.number().default(0),
    billed_to_date: z.coerce.number().default(0),
    contract_id: z.string().default(''),
  })).default([]),
});

type FormValues = z.infer<typeof contractSchema>;

function toFormValues(data: Omit<ContractUpsert, 'project_id'>, items: SovItemUpsert[]): FormValues {
  return {
    ...data,
    contract_number: data.contract_number ?? '',
    docusign_envelope_id: data.docusign_envelope_id ?? '',
    prime_contractor_name: data.prime_contractor_name ?? '',
    prime_contractor_address: data.prime_contractor_address ?? '',
    prime_contractor_contact: data.prime_contractor_contact ?? '',
    prime_contractor_email: data.prime_contractor_email ?? '',
    subcontractor_name: data.subcontractor_name ?? '',
    subcontractor_address: data.subcontractor_address ?? '',
    subcontractor_contact: data.subcontractor_contact ?? '',
    subcontractor_email: data.subcontractor_email ?? '',
    project_address: data.project_address ?? '',
    contract_date: data.contract_date ?? '',
    start_date: data.start_date ?? '',
    substantial_completion_date: data.substantial_completion_date ?? '',
    final_completion_date: data.final_completion_date ?? '',
    actual_completion_date: data.actual_completion_date ?? '',
    signed_contract_received_date: data.signed_contract_received_date ?? '',
    base_contract_amount: data.base_contract_amount ?? 0,
    retainage_percent: data.retainage_percent ?? 5,
    mobilization_advance: data.mobilization_advance ?? 0,
    liquidated_damages_per_day: data.liquidated_damages_per_day ?? 0,
    retainage_release_substantial: data.retainage_release_substantial ?? 2.5,
    retainage_release_final: data.retainage_release_final ?? 2.5,
    retainage_warranty_months: data.retainage_warranty_months ?? 12,
    payment_cycle_days: data.payment_cycle_days ?? 15,
    payment_due_within_days: data.payment_due_within_days ?? 3,
    scope_description: data.scope_description ?? '',
    inclusions: data.inclusions ?? '',
    exclusions: data.exclusions ?? '',
    special_conditions: data.special_conditions ?? '',
    sov_items: items.map((i) => ({
      ...i,
      id: (i as any).id,
      budget_code: i.budget_code ?? '',
      cost_code_id: i.cost_code_id ?? null,
      unit: i.unit ?? '',
      quantity: i.quantity ?? 0,
      unit_cost: i.unit_cost ?? 0,
      subtotal: i.subtotal ?? 0,
      completed_qty: i.completed_qty ?? 0,
      completed_pct: i.completed_pct ?? 0,
      billed_to_date: i.billed_to_date ?? 0,
      contract_id: i.contract_id ?? '',
    })),
  };
}

export default function ContractFormPage() {
  const { projectId, contractId } = useParams<{ projectId: string; contractId?: string }>();
  const navigate = useNavigate();
  const { data: contracts = [], upsert } = useProjectContracts(projectId!);
  const { data: defaultLibrary } = useDefaultLibrary();
  const { data: costCodes = [] } = useCostCodes(defaultLibrary?.id ?? null);
  const existing = contracts.find((c) => c.id === contractId);
  const isEdit = !!contractId;

  const form = useForm<FormValues>({
    resolver: zodResolver(contractSchema),
    defaultValues: {
      contract_title: '', contract_type: 'subcontract', status: 'draft',
      retainage_percent: 5, retainage_release_substantial: 2.5,
      retainage_release_final: 2.5, retainage_warranty_months: 12,
      payment_cycle_days: 15, payment_due_within_days: 3,
      sov_items: [],
    },
  });

  const { fields, append, remove, replace } = useFieldArray({ control: form.control, name: 'sov_items' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (existing) {
      form.reset(toFormValues(existing, existing.sov_items ?? []));
    }
  }, [existing]);

  function loadSewerTemplate() {
    form.reset(toFormValues(SEWER_EXTENSION_TEMPLATE, SEWER_EXTENSION_SOV));
    toast.success('Sewer Extension template loaded — review and save to create the contract.');
  }

  function recalcSubtotals() {
    const items = form.getValues('sov_items');
    items.forEach((item, idx) => {
      const subtotal = (item.quantity ?? 0) * (item.unit_cost ?? 0);
      form.setValue(`sov_items.${idx}.subtotal`, subtotal);
    });
  }

  async function onSubmit(values: FormValues) {
    setLoading(true);
    try {
      const { sov_items, ...contractFields } = values;
      // Convert empty date strings to null so Postgres doesn't error on ""
      const dateFields = ['contract_date','start_date','substantial_completion_date','final_completion_date','actual_completion_date','signed_contract_received_date'] as const;
      const cleaned = { ...contractFields } as any;
      dateFields.forEach(f => { if (cleaned[f] === '') cleaned[f] = null; });
      const saved = await upsert.mutateAsync({
        contract: { ...cleaned, id: isEdit ? contractId : undefined, project_id: projectId! } as ContractUpsert,
        sovItems: sov_items as SovItemUpsert[],
      });
      toast.success(isEdit ? 'Contract updated.' : 'Contract created.');
      navigate(`/projects/${projectId}/contracts/${saved.id}`);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );

  const Field = ({ label, name, type = 'text', placeholder }: { label: string; name: any; type?: string; placeholder?: string }) => (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Input type={type} placeholder={placeholder} {...form.register(name)} className="h-9" step={type === 'number' ? 'any' : undefined} />
      {form.formState.errors[name as keyof FormValues] && (
        <p className="text-xs text-destructive">{String((form.formState.errors[name as keyof FormValues] as any)?.message)}</p>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link to={`/projects/${projectId}/contracts`} className="hover:text-foreground flex items-center gap-1">
              <ArrowLeft className="h-4 w-4" /> Contracts
            </Link>
            <span>/</span>
            <span className="text-foreground font-medium">{isEdit ? 'Edit Contract' : 'New Contract'}</span>
          </div>
          {!isEdit && (
            <Button type="button" variant="outline" size="sm" onClick={loadSewerTemplate}>
              <Sparkles className="h-4 w-4 mr-1.5 text-amber-500" />
              Load Sewer Extension Template
            </Button>
          )}
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">

          {/* Identification */}
          <Section title="Contract Identification">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Contract Number" name="contract_number" placeholder="PC-01" />
              <Field label="Contract Title *" name="contract_title" placeholder="Sewer Extension Project" />
            </div>
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Contract Type</Label>
                <Select value={form.watch('contract_type')} onValueChange={(v) => form.setValue('contract_type', v)}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="subcontract">Subcontract</SelectItem>
                    <SelectItem value="prime">Prime Contract</SelectItem>
                    <SelectItem value="owner">Owner Agreement</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Status</Label>
                <Select value={form.watch('status')} onValueChange={(v) => form.setValue('status', v)}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="out_for_signature">Out for Signature</SelectItem>
                    <SelectItem value="executed">Executed</SelectItem>
                    <SelectItem value="terminated">Terminated</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Field label="DocuSign Envelope ID" name="docusign_envelope_id" placeholder="XXXXXXXX-..." />
            </div>
            <Field label="Project Address" name="project_address" placeholder="13210 Alexandria Dr, Opa-locka, FL 33054" />
          </Section>

          {/* Parties */}
          <div className="grid md:grid-cols-2 gap-5">
            <Section title="Prime Contractor / Owner">
              <Field label="Company Name" name="prime_contractor_name" />
              <Field label="Address" name="prime_contractor_address" />
              <Field label="Contact Name" name="prime_contractor_contact" />
              <Field label="Email" name="prime_contractor_email" type="email" />
            </Section>
            <Section title="Subcontractor / GC">
              <Field label="Company Name" name="subcontractor_name" />
              <Field label="Address" name="subcontractor_address" />
              <Field label="Contact Name" name="subcontractor_contact" />
              <Field label="Email" name="subcontractor_email" type="email" />
            </Section>
          </div>

          {/* Dates */}
          <Section title="Key Dates">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Field label="Contract Date" name="contract_date" type="date" />
              <Field label="Start Date" name="start_date" type="date" />
              <Field label="Substantial Completion" name="substantial_completion_date" type="date" />
              <Field label="Final Completion" name="final_completion_date" type="date" />
              <Field label="Actual Completion" name="actual_completion_date" type="date" />
              <Field label="Signed Contract Received" name="signed_contract_received_date" type="date" />
            </div>
          </Section>

          {/* Financial */}
          <Section title="Financial Terms">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Field label="Base Contract Amount ($)" name="base_contract_amount" type="number" placeholder="523061" />
              <Field label="Retainage (%)" name="retainage_percent" type="number" placeholder="5" />
              <Field label="Mobilization Advance ($)" name="mobilization_advance" type="number" />
              <Field label="Liquidated Damages ($/day)" name="liquidated_damages_per_day" type="number" />
              <Field label="Payment Cycle (days)" name="payment_cycle_days" type="number" />
              <Field label="Pay-Within (business days)" name="payment_due_within_days" type="number" />
              <Field label="Retainage Release #1 (%)" name="retainage_release_substantial" type="number" />
              <Field label="Retainage Release #2 (%)" name="retainage_release_final" type="number" />
              <Field label="Warranty Period (months)" name="retainage_warranty_months" type="number" />
            </div>
          </Section>

          {/* Scope */}
          <Section title="Scope of Work">
            {(['scope_description', 'inclusions', 'exclusions', 'special_conditions'] as const).map((f) => (
              <div key={f} className="space-y-1.5">
                <Label className="text-xs capitalize">{f.replace(/_/g, ' ')}</Label>
                <Textarea rows={3} {...form.register(f)} className="resize-none text-sm" />
              </div>
            ))}
          </Section>

          {/* SOV */}
          <Section title={`Schedule of Values (${fields.length} items)`}>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="text-left p-2 w-8">#</th>
                    <th className="text-left p-2">Description</th>
                    <th className="text-left p-2 w-20">Code</th>
                    <th className="text-left p-2 w-36">Cost Code</th>
                    <th className="text-right p-2 w-20">Qty</th>
                    <th className="text-left p-2 w-16">Unit</th>
                    <th className="text-right p-2 w-24">Unit Cost</th>
                    <th className="text-right p-2 w-24">Subtotal</th>
                    <th className="w-8 p-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {fields.map((field, idx) => (
                    <tr key={field.id} className="border-b last:border-0">
                      <td className="p-1">
                        <Input className="h-7 w-12 text-xs" type="number" {...form.register(`sov_items.${idx}.item_number`)} />
                      </td>
                      <td className="p-1">
                        <Input className="h-7 text-xs" {...form.register(`sov_items.${idx}.description`)} />
                      </td>
                      <td className="p-1">
                        <Input className="h-7 text-xs font-mono" {...form.register(`sov_items.${idx}.budget_code`)} />
                      </td>
                      <td className="p-1">
                        <Select
                          value={form.watch(`sov_items.${idx}.cost_code_id`) ?? ''}
                          onValueChange={(v) => form.setValue(`sov_items.${idx}.cost_code_id`, v || null)}
                        >
                          <SelectTrigger className="h-7 w-36 text-xs">
                            <SelectValue placeholder="—" />
                          </SelectTrigger>
                          <SelectContent>
                            {costCodes.map((cc) => (
                              <SelectItem key={cc.id} value={cc.id} className="text-xs">
                                <span className="font-mono">{cc.code}</span>
                                <span className="text-muted-foreground"> · {cc.description}</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="p-1">
                        <Input className="h-7 w-20 text-xs text-right" type="number" step="0.001"
                          {...form.register(`sov_items.${idx}.quantity`)}
                          onChange={(e) => { form.register(`sov_items.${idx}.quantity`).onChange(e); recalcSubtotals(); }}
                        />
                      </td>
                      <td className="p-1">
                        <Input className="h-7 w-16 text-xs" {...form.register(`sov_items.${idx}.unit`)} />
                      </td>
                      <td className="p-1">
                        <Input className="h-7 w-24 text-xs text-right font-mono" type="number" step="0.01"
                          {...form.register(`sov_items.${idx}.unit_cost`)}
                          onChange={(e) => { form.register(`sov_items.${idx}.unit_cost`).onChange(e); recalcSubtotals(); }}
                        />
                      </td>
                      <td className="p-1">
                        <Input className="h-7 w-24 text-xs text-right font-mono" type="number" step="0.01"
                          {...form.register(`sov_items.${idx}.subtotal`)}
                        />
                      </td>
                      <td className="p-1">
                        <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => remove(idx)}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Button
              type="button" variant="outline" size="sm"
              onClick={() => append({ item_number: fields.length + 1, description: '', budget_code: '', cost_code_id: null, unit: 'ls', quantity: 1, unit_cost: 0, subtotal: 0, completed_qty: 0, completed_pct: 0, billed_to_date: 0, contract_id: '' })}
            >
              <Plus className="h-4 w-4 mr-1.5" />Add Line Item
            </Button>
          </Section>

          {/* Submit */}
          <div className="flex justify-end gap-3 pb-8">
            <Link to={`/projects/${projectId}/contracts`}>
              <Button type="button" variant="outline">Cancel</Button>
            </Link>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Contract'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
