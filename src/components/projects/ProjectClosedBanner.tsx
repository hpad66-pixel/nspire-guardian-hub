import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { Award, LockKeyhole, RotateCcw, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { VoiceDictationTextareaWithAI } from '@/components/ui/voice-dictation-textarea-ai';
import { usePlatformSuperAdmin } from '@/hooks/usePlatformAdmin';
import { useUserPermissions } from '@/hooks/usePermissions';
import { type Project, useReopenProject } from '@/hooks/useProjects';
import { cn } from '@/lib/utils';

type Snapshot = {
  closed_with_exception?: boolean;
  financial_position?: {
    net_profit?: number | string;
    margin_pct?: number | string;
    cash_received?: number | string;
    cash_paid?: number | string;
  } | null;
};

const money = (value: number) => new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
}).format(value);

export function ProjectClosedBanner({ project }: { project: Project }) {
  const { isAdmin } = useUserPermissions();
  const { isSuperAdmin } = usePlatformSuperAdmin();
  const reopenProject = useReopenProject();
  const [reopenOpen, setReopenOpen] = useState(false);
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (!reopenOpen) setReason('');
  }, [reopenOpen]);

  const snapshot = useMemo(
    () => (project.close_snapshot && typeof project.close_snapshot === 'object'
      ? project.close_snapshot as Snapshot
      : null),
    [project.close_snapshot],
  );
  const financial = snapshot?.financial_position;
  const netResult = financial ? Number(financial.net_profit ?? 0) : null;
  const isLoss = netResult != null && netResult < 0;
  const canReopen = isAdmin || isSuperAdmin;
  const closedDate = project.closed_at
    ? format(new Date(project.closed_at), "MMMM d, yyyy 'at' h:mm a")
    : 'Date recorded in the audit trail';

  const submitReopen = async () => {
    await reopenProject.mutateAsync({ projectId: project.id, reason });
    setReopenOpen(false);
  };

  return (
    <>
      <section className="relative overflow-hidden border-y border-slate-300 bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-950 px-4 py-4 text-white shadow-sm md:px-6">
        <div className="pointer-events-none absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_25%_20%,white_0,transparent_22%),radial-gradient(circle_at_85%_100%,#6ee7b7_0,transparent_30%)]" />
        <div className="relative mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <div className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-full border-4 border-double border-amber-300 bg-slate-950 shadow-[0_0_0_4px_rgba(255,255,255,0.12)]">
              <div className="text-center leading-none">
                <ShieldCheck className="mx-auto h-6 w-6 text-amber-300" />
                <span className="mt-1 block text-[9px] font-black uppercase tracking-[0.2em] text-amber-100">Closed</span>
                <span className="mt-0.5 block text-[7px] uppercase tracking-widest text-white/70">Certified</span>
              </div>
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display text-xl font-bold tracking-tight md:text-2xl">Project closed &amp; locked</h2>
                <Badge className="border border-white/20 bg-white/10 text-white hover:bg-white/10">
                  <LockKeyhole className="mr-1 h-3 w-3" /> Read-only
                </Badge>
                {snapshot?.closed_with_exception && (
                  <Badge className="border border-amber-300/40 bg-amber-300/15 text-amber-100 hover:bg-amber-300/15">
                    Administrator exception
                  </Badge>
                )}
              </div>
              <p className="mt-1 text-sm text-white/75">{closedDate}</p>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-white/90">
                {project.close_reason || 'Closed by an authorized administrator.'}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-3 sm:justify-end">
            {netResult != null && (
              <div className={cn(
                'rounded-xl border px-4 py-2.5 text-right backdrop-blur-sm',
                isLoss ? 'border-rose-300/30 bg-rose-300/10' : 'border-emerald-300/30 bg-emerald-300/10',
              )}>
                <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/60">
                  Final net {isLoss ? 'loss' : 'profit'}
                </p>
                <p className={cn('mt-0.5 text-lg font-bold tabular-nums', isLoss ? 'text-rose-200' : 'text-emerald-200')}>
                  {money(Math.abs(netResult))}
                </p>
              </div>
            )}
            {canReopen && (
              <Button
                data-project-closed-allowed="true"
                variant="secondary"
                className="h-11 bg-white text-slate-950 hover:bg-white/90"
                onClick={() => setReopenOpen(true)}
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Reopen project
              </Button>
            )}
          </div>
        </div>
      </section>

      <Dialog open={reopenOpen} onOpenChange={setReopenOpen}>
        <DialogContent data-project-closed-allowed="true" className="sm:max-w-lg">
          <DialogHeader>
            <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-emerald-100 text-emerald-800">
              <Award className="h-5 w-5" />
            </div>
            <DialogTitle>Administrator reopen</DialogTitle>
            <DialogDescription>
              Reopening restores authorized editing. The original closure certificate remains in the lifecycle audit trail.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="project-reopen-reason">Reason for reopening *</Label>
            <VoiceDictationTextareaWithAI
              id="project-reopen-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Explain why this closed project must be reopened."
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReopenOpen(false)}>Cancel</Button>
            <Button
              disabled={reason.trim().length < 5 || reopenProject.isPending}
              onClick={() => void submitReopen()}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              {reopenProject.isPending ? 'Reopening…' : 'Reopen for work'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
