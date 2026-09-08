import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Mail, Send, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import {
  VENDOR_REQUIREMENTS,
  mapMissingFieldsToRequirements,
  resolveRequirementLabels,
} from '@/lib/financial/vendorMissingInfoRequest';

export interface VendorMissingInfoRequest {
  recipientEmail: string;
  requirementIds: string[];
  customRequirements: string[];
  dueDate: string;
  message: string;
}

export function VendorMissingInfoRequestDialog({
  open,
  onOpenChange,
  vendorName,
  defaultEmail,
  projectName,
  invoiceNumber,
  missingFields,
  sending,
  onSend,
}: {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  vendorName?: string;
  defaultEmail?: string;
  projectName: string;
  invoiceNumber?: string;
  missingFields: string[];
  sending: boolean;
  onSend: (request: VendorMissingInfoRequest) => Promise<void>;
}) {
  const suggested = useMemo(() => mapMissingFieldsToRequirements(missingFields), [missingFields]);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [custom, setCustom] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!open) return;
    setRecipientEmail(defaultEmail?.trim() ?? '');
    setSelected(new Set(suggested.requirementIds));
    setCustom(suggested.customRequirements.join('\n'));
    setDueDate('');
    setMessage('Please reply with the selected items so we can complete our review and keep payment processing moving.');
  }, [open, defaultEmail, suggested]);

  const customRequirements = custom.split('\n').map((item) => item.trim()).filter(Boolean);
  const requestCount = resolveRequirementLabels([...selected], customRequirements).length;
  const validEmail = /^\S+@\S+\.\S+$/.test(recipientEmail.trim());

  const toggle = (id: string, checked: boolean) => setSelected((current) => {
    const next = new Set(current);
    if (checked) next.add(id); else next.delete(id);
    return next;
  });

  const send = async () => {
    if (!validEmail || requestCount === 0) return;
    try {
      await onSend({
        recipientEmail: recipientEmail.trim().toLowerCase(),
        requirementIds: [...selected],
        customRequirements,
        dueDate,
        message: message.trim(),
      });
      onOpenChange(false);
    } catch {
      // The parent displays the actionable delivery error and keeps this dialog open.
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl overflow-hidden p-0">
        <DialogHeader className="border-b bg-gradient-to-r from-[#082D27] to-[#134B40] px-6 py-5 text-white">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-white/10 p-2.5"><Mail className="h-5 w-5 text-[#E1C782]" /></div>
            <div>
              <DialogTitle className="text-lg text-white">Request missing invoice information</DialogTitle>
              <DialogDescription className="mt-1 text-emerald-50/80">
                Select exactly what is needed. ProjOS formats a branded, easy-to-follow vendor email and records it in project correspondence.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh]">
          <div className="space-y-5 px-6 py-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="vendor-request-email">Send to *</Label>
                <Input id="vendor-request-email" type="email" value={recipientEmail} onChange={(event) => setRecipientEmail(event.target.value)} placeholder="billing@vendor.com" />
                {!validEmail && recipientEmail && <p className="text-xs text-destructive">Enter a valid vendor email address.</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="vendor-request-due">Requested by</Label>
                <Input id="vendor-request-due" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
              </div>
            </div>

            <div className="rounded-xl border bg-muted/20 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">What does {vendorName?.trim() || 'the vendor'} need to provide?</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{projectName}{invoiceNumber ? ` · Invoice ${invoiceNumber}` : ''}</p>
                </div>
                <div className="flex gap-1">
                  <Button type="button" size="sm" variant="ghost" onClick={() => setSelected(new Set(VENDOR_REQUIREMENTS.map((item) => item.id)))}>Select all</Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Clear</Button>
                </div>
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {VENDOR_REQUIREMENTS.map((requirement) => {
                  const checked = selected.has(requirement.id);
                  return (
                    <label key={requirement.id} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${checked ? 'border-emerald-300 bg-emerald-50/70' : 'bg-background hover:border-muted-foreground/30'}`}>
                      <Checkbox checked={checked} onCheckedChange={(value) => toggle(requirement.id, value === true)} className="mt-0.5" />
                      <span>
                        <span className="block text-sm font-medium">{requirement.label}</span>
                        <span className="mt-0.5 block text-[11px] leading-4 text-muted-foreground">{requirement.description}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="vendor-request-custom">Other requested items</Label>
              <Textarea id="vendor-request-custom" rows={3} value={custom} onChange={(event) => setCustom(event.target.value)} placeholder="Add one item per line" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="vendor-request-message">Personal note</Label>
              <Textarea id="vendor-request-message" rows={3} value={message} onChange={(event) => setMessage(event.target.value)} />
            </div>

            <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 text-sm text-emerald-950">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
              <div><p className="font-semibold">Safe vendor communication</p><p className="mt-0.5 text-xs text-emerald-800">The email tells the vendor not to send passwords, PINs, or MFA codes. Payment approval and bank evidence remain separate controls.</p></div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="flex-row items-center justify-between border-t bg-muted/20 px-6 py-4 sm:justify-between">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><CheckCircle2 className="h-4 w-4 text-emerald-700" />{requestCount} requested item{requestCount === 1 ? '' : 's'}</div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="button" onClick={send} disabled={sending || !validEmail || requestCount === 0}>
              <Send className="mr-2 h-4 w-4" />{sending ? 'Sending…' : 'Send branded request'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
