import { useState } from 'react';
import { FileText, Link2, Copy, Check, Mail, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { useCommitments } from '@/hooks/useCommitments';
import { useVendorPayApps, useRequestVendorPayApp } from '@/hooks/useVendorPayApps';
import { useSendEmail } from '@/hooks/useSendEmail';
import { toast } from 'sonner';

const STATUS: Record<string, { label: string; bg: string; fg: string }> = {
  requested: { label: 'Link sent', bg: '#F1EFE8', fg: '#5F5E5A' },
  submitted: { label: 'Submitted', bg: '#E7F0FD', fg: '#1558b0' },
  approved:  { label: 'Approved', bg: '#E1F5EE', fg: '#0F6E56' },
  paid:      { label: 'Paid', bg: '#E1F5EE', fg: '#0F6E56' },
  void:      { label: 'Void', bg: '#FCEBEB', fg: '#A32D2D' },
};
const usd = (n?: number | null) => (n == null ? '—' : `$${Number(n).toLocaleString('en-US', { maximumFractionDigits: 0 })}`);

// GC-side: request an AIA pay app from a vendor via magic link.
export function RequestVendorPayApp({ projectId }: { projectId: string }) {
  const { data: commitments = [] } = useCommitments(projectId);
  const { data: requests = [] } = useVendorPayApps(projectId);
  const request = useRequestVendorPayApp(projectId);
  const sendEmail = useSendEmail();
  const [commitmentId, setCommitmentId] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [copied, setCopied] = useState<string | null>(null);

  const linkFor = (token: string) => `${window.location.origin}/vendor/submit/${token}`;

  const create = async () => {
    const token = await request.mutateAsync({ commitmentId: commitmentId || null, vendorName: name.trim() || undefined, vendorEmail: email.trim() || undefined });
    const url = linkFor(token);
    if (email.trim()) {
      await sendEmail.mutateAsync({
        recipients: [email.trim()],
        subject: `Submit your pay application — APAS Consulting`,
        bodyHtml: `<div style="font-family:Segoe UI,Arial,sans-serif;max-width:520px;margin:0 auto">
          <div style="background:#1D6FE8;padding:18px 24px;border-radius:12px 12px 0 0;color:#fff"><div style="font-size:18px;font-weight:700">Submit your pay application</div></div>
          <div style="border:1px solid #eee;border-top:none;border-radius:0 0 12px 12px;padding:22px 24px">
            <p style="color:#333;font-size:14px;line-height:1.6">${name.trim() ? `Hi ${name.trim()},` : 'Hi,'}<br/>APAS Consulting has invited you to submit your AIA pay application and conditional lien waiver online — no account needed.</p>
            <p style="margin:18px 0"><a href="${url}" style="background:#1D6FE8;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700">Open the submission portal →</a></p>
            <p style="color:#999;font-size:12px">Or paste this link: ${url}</p>
          </div>
        </div>`,
      }).catch(() => toast.error('Link created, but email failed to send.'));
      toast.success(`Invite sent to ${email.trim()}`);
    } else {
      navigator.clipboard?.writeText(url);
      toast.success('Link created and copied');
    }
    setName(''); setEmail(''); setCommitmentId('');
  };

  const copy = (token: string) => { navigator.clipboard?.writeText(linkFor(token)); setCopied(token); setTimeout(() => setCopied(null), 1500); };

  return (
    <div className="rounded-xl border bg-card">
      <div className="flex items-center gap-2.5 border-b p-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--apas-sapphire)]/10"><FileText className="h-4 w-4 text-[var(--apas-sapphire)]" /></div>
        <div>
          <h3 className="text-sm font-semibold">Request a pay app from a vendor</h3>
          <p className="text-[11px] text-muted-foreground">Sends a magic link where they build an AIA G702/G703 and e-sign the conditional lien waiver.</p>
        </div>
      </div>
      <div className="space-y-3 p-4">
        <div className="grid gap-2 sm:grid-cols-3">
          <Select value={commitmentId} onValueChange={setCommitmentId}>
            <SelectTrigger><SelectValue placeholder="Commitment (optional)" /></SelectTrigger>
            <SelectContent>{commitments.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.commitment_no ? c.commitment_no + ' · ' : ''}{c.title}</SelectItem>)}</SelectContent>
          </Select>
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="Vendor name" />
          <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="vendor@email.com" />
        </div>
        <Button onClick={create} disabled={request.isPending || sendEmail.isPending} className="gap-1.5">
          {(request.isPending || sendEmail.isPending) ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />} {email.trim() ? 'Create & email link' : 'Create link'}
        </Button>

        {requests.length > 0 && (
          <div className="space-y-1.5 pt-1">
            {requests.map((r) => {
              const st = STATUS[r.status] ?? STATUS.requested;
              return (
                <div key={r.id} className="flex items-center gap-2.5 rounded-lg border border-border px-3 py-2 text-[13px]">
                  <span className="flex-1 truncate font-medium">{r.vendor_name || r.vendor_email || 'Vendor'}{r.app_no ? ` · App #${r.app_no}` : ''}</span>
                  {r.submitted_at && <span className="shrink-0 text-muted-foreground">{usd(r.current_due)}</span>}
                  <span className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: st.bg, color: st.fg }}>{st.label}</span>
                  <button onClick={() => copy(r.token)} title="Copy link" className="shrink-0 text-muted-foreground hover:text-foreground">{copied === r.token ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}</button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
