import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { QRCodeGenerator } from '@/components/qr/QRCodeGenerator';
import { useCaptureLink } from '@/hooks/useCaptureLink';
import { Copy, Check, Link2, QrCode, Loader2, Power } from 'lucide-react';
import { toast } from 'sonner';

type Ctx = { propertyId?: string; projectId?: string };

/**
 * Shows (and creates) the public capture link for this gallery. Share the URL or
 * QR; anyone who opens it on a phone can snap + caption a photo straight into the
 * gallery — no login.
 */
export function CaptureLinkDialog({ ctx, open, onOpenChange }: { ctx: Ctx; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { link, isLoading, create, revoke } = useCaptureLink(ctx);
  const [copied, setCopied] = useState(false);

  const url = link ? `${window.location.origin}/capture/${link.token}` : '';

  const copy = async () => {
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1800); }
    catch { toast.error('Could not copy'); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Link2 className="h-5 w-5 text-primary" /> Capture link</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : !link ? (
          <div className="space-y-4 py-2 text-center">
            <QrCode className="mx-auto h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              Create a public link the field crew can open on a phone to snap photos straight into this gallery — no login needed.
            </p>
            <Button className="w-full" disabled={create.isPending} onClick={() => create.mutate(undefined, { onSuccess: () => toast.success('Capture link created') })}>
              {create.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating…</> : 'Create capture link'}
            </Button>
          </div>
        ) : (
          <div className="space-y-4 py-1">
            <div className="flex justify-center rounded-xl border bg-white p-4">
              <QRCodeGenerator value={url} size={176} />
            </div>
            <p className="text-center text-xs text-muted-foreground">Scan with a phone camera, or share the link below.</p>
            <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2">
              <Link2 className="h-4 w-4 shrink-0 text-muted-foreground" />
              <code className="min-w-0 flex-1 truncate text-xs">{url}</code>
              <Button size="sm" variant="outline" className="h-8 shrink-0" onClick={copy}>
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              </Button>
            </div>
            <div className="flex items-center justify-between gap-2 pt-1">
              <p className="text-[11px] text-muted-foreground">Anyone with this link can add photos.</p>
              <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10"
                onClick={() => { if (confirm('Turn off this link? Existing shares will stop working.')) revoke.mutate(link.id, { onSuccess: () => toast.success('Link turned off') }); }}>
                <Power className="mr-1 h-3.5 w-3.5" /> Turn off
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
