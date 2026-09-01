import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  CheckCircle2,
  ClipboardList,
  Loader2,
  Phone,
  PhoneOff,
  Radio,
  Sparkles,
  Wrench,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { subscribeVoiceLive, type VoiceLiveEvent } from '@/lib/voice/liveBus';
import type { VoicePipelineStage } from '@/lib/voice/liveStats';

const STAGE_STEPS: Array<{ key: VoicePipelineStage; label: string; icon: typeof Phone }> = [
  { key: 'call_active', label: 'On call', icon: Phone },
  { key: 'processing', label: 'Processing', icon: Loader2 },
  { key: 'ticket_created', label: 'Ticket', icon: ClipboardList },
  { key: 'wo_linked', label: 'Work order', icon: Wrench },
];

function stageIndex(stage: VoicePipelineStage): number {
  if (stage === 'idle') return -1;
  if (stage === 'ready') return STAGE_STEPS.length;
  const i = STAGE_STEPS.findIndex((s) => s.key === stage);
  return i;
}

function eventIcon(kind: VoiceLiveEvent['kind']) {
  switch (kind) {
    case 'call_started':
      return Phone;
    case 'call_ended':
      return PhoneOff;
    case 'processing':
      return Loader2;
    case 'ticket_created':
      return ClipboardList;
    case 'wo_linked':
      return Wrench;
    case 'error':
      return Sparkles;
    default:
      return Radio;
  }
}

function eventTone(kind: VoiceLiveEvent['kind']) {
  switch (kind) {
    case 'ticket_created':
    case 'wo_linked':
      return 'border-emerald-300/50 bg-emerald-50 text-emerald-950';
    case 'processing':
    case 'call_ended':
      return 'border-sky-300/50 bg-sky-50 text-sky-950';
    case 'call_started':
      return 'border-[var(--apas-sapphire)]/40 bg-[var(--apas-sapphire)]/10 text-foreground';
    case 'error':
      return 'border-rose-300/50 bg-rose-50 text-rose-950';
    default:
      return 'border-border bg-muted/40';
  }
}

export function VoiceLiveFeed({
  stage,
  className,
  compact,
}: {
  stage: VoicePipelineStage;
  className?: string;
  compact?: boolean;
}) {
  const [events, setEvents] = useState<VoiceLiveEvent[]>([]);
  const activeIdx = stageIndex(stage);
  const isLive = stage === 'call_active' || stage === 'processing';

  useEffect(() => {
    return subscribeVoiceLive((event) => {
      setEvents((prev) => [event, ...prev].slice(0, 8));
    });
  }, []);

  const headline = useMemo(() => {
    switch (stage) {
      case 'call_active':
        return 'Live call in progress';
      case 'processing':
        return 'Hang-up received — processing ticket & work order';
      case 'ticket_created':
        return 'Ticket created — wiring work order';
      case 'wo_linked':
        return 'Work order linked — dashboard updated';
      case 'ready':
        return 'Pipeline clear — waiting for the next call';
      default:
        return 'Live intake — updates appear the moment a call ends';
    }
  }, [stage]);

  return (
    <Card
      className={cn(
        'overflow-hidden border-[var(--apas-sapphire)]/25 bg-gradient-to-br from-sky-50/80 via-background to-background',
        className,
      )}
      data-testid="voice-live-feed"
    >
      <CardHeader className={cn('pb-3', compact && 'p-4 pb-2')}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <span
                className={cn(
                  'relative flex h-2.5 w-2.5',
                  isLive && 'after:absolute after:inset-0 after:animate-ping after:rounded-full after:bg-emerald-400/70',
                )}
              >
                <span
                  className={cn(
                    'relative inline-flex h-2.5 w-2.5 rounded-full',
                    isLive ? 'bg-emerald-500' : 'bg-muted-foreground/40',
                  )}
                />
              </span>
              Live pipeline
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">{headline}</p>
          </div>
          {isLive && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-emerald-800">
              <Loader2 className="h-3 w-3 animate-spin" />
              Working
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className={cn('space-y-4', compact && 'p-4 pt-0')}>
        <div className="grid grid-cols-4 gap-2">
          {STAGE_STEPS.map((step, i) => {
            const Icon = step.icon;
            const done = activeIdx > i || stage === 'ready' || stage === 'wo_linked';
            const active = activeIdx === i;
            return (
              <div
                key={step.key}
                className={cn(
                  'rounded-xl border px-2 py-2.5 text-center transition-all',
                  done && 'border-emerald-300/60 bg-emerald-50/80',
                  active && 'border-sky-400 bg-sky-50 shadow-sm ring-2 ring-sky-200/60',
                  !done && !active && 'border-border/70 bg-muted/30',
                )}
                data-testid={`voice-pipeline-step-${step.key}`}
              >
                <Icon
                  className={cn(
                    'mx-auto h-4 w-4',
                    active && step.key === 'processing' && 'animate-spin text-sky-700',
                    done && 'text-emerald-700',
                    active && step.key !== 'processing' && 'text-sky-700',
                    !done && !active && 'text-muted-foreground',
                  )}
                />
                <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide">{step.label}</p>
              </div>
            );
          })}
        </div>

        <div className="space-y-2" data-testid="voice-live-ticklers">
          <AnimatePresence initial={false}>
            {events.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="rounded-xl border border-dashed px-3 py-4 text-center text-xs text-muted-foreground"
              >
                Ticklers appear here when a call starts, ends, or a ticket / work order lands.
              </motion.div>
            ) : (
              events.map((event) => {
                const Icon = eventIcon(event.kind);
                return (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, y: -8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, height: 0 }}
                    className={cn(
                      'flex items-start gap-2.5 rounded-xl border px-3 py-2.5',
                      eventTone(event.kind),
                    )}
                  >
                    <div className="mt-0.5 rounded-lg bg-white/70 p-1.5 shadow-sm">
                      <Icon
                        className={cn(
                          'h-3.5 w-3.5',
                          event.kind === 'processing' && 'animate-spin',
                        )}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold leading-tight">{event.title}</p>
                      {event.detail && (
                        <p className="mt-0.5 text-xs opacity-80">{event.detail}</p>
                      )}
                    </div>
                    <span className="shrink-0 text-[10px] font-medium opacity-60">
                      {new Date(event.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
          {stage === 'wo_linked' && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-300/50 bg-emerald-50/80 px-3 py-2 text-xs font-medium text-emerald-900">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Dashboard KPIs refreshed in real time
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
