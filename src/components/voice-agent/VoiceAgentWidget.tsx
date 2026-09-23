import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Headphones, Loader2, Mic, Phone, PhoneOff, ShieldCheck, Sparkles, Volume2, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useVoiceAgent } from '@/hooks/useVoiceAgent';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

interface VoiceAgentWidgetProps {
  className?: string;
  onClose?: () => void;
  propertyId?: string | null;
  propertyName?: string | null;
  onCallEnded?: () => void;
  onTicketCreated?: (ticket: { requestId?: string | null; ticketNumber?: string | null }) => void;
}

export function VoiceAgentWidget({
  className,
  onClose,
  propertyId,
  propertyName,
  onCallEnded,
  onTicketCreated,
}: VoiceAgentWidgetProps) {
  const { user } = useAuth();
  const {
    isConnecting,
    error,
    status,
    isSpeaking,
    transcript,
    ticketNumber,
    isProcessing,
    startConversation,
    endConversation,
  } = useVoiceAgent({
    propertyId,
    propertyName,
    callerName: user?.user_metadata?.full_name || user?.email || null,
    callerEmail: user?.email || null,
    callerPhone: user?.user_metadata?.phone || null,
    onCallEnded,
    onTicketCreated,
  });

  const isConnected = status === 'connected';

  return (
    <Card className={cn('w-full max-w-md overflow-hidden border-slate-200 bg-[#f8f5ee] shadow-xl shadow-slate-900/10', className)}>
      <CardContent className="space-y-6 p-0">
        <div className="relative overflow-hidden bg-[#10263f] px-6 pb-8 pt-6 text-center text-white">
          <div className="absolute inset-x-8 top-0 h-24 rounded-full bg-[#d6f5ea]/15 blur-3xl" />
          <div className="relative mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15">
            <Headphones className="h-6 w-6 text-[#d6f5ea]" />
          </div>
          <p className="relative mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-[#d6f5ea]">Guided voice intake</p>
          <h3 className="relative mt-2 text-2xl font-semibold tracking-tight">Start a resident call</h3>
          <p className="relative mt-2 text-sm leading-6 text-white/75">
            {isConnected
              ? 'The assistant is live. Let the caller explain the issue in plain language.'
              : isProcessing
                ? 'Call ended. The system is creating the ticket and work-order handoff.'
                : 'Capture the caller, urgency, issue, location, and work-order path in one clean flow.'}
          </p>
          {propertyName && (
            <p className="relative mt-3 inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs text-white/80">
              Property: <span className="ml-1 font-semibold text-white">{propertyName}</span>
            </p>
          )}
        </div>

        <div className="-mt-8 flex justify-center px-6">
          <motion.div
            className={cn(
              'relative flex h-36 w-36 items-center justify-center rounded-full border border-white bg-white shadow-2xl shadow-slate-900/10',
              isConnected && 'ring-4 ring-[#0f766e]/30',
              isProcessing && 'ring-4 ring-sky-300/50',
            )}
            animate={isSpeaking || isProcessing ? { scale: [1, 1.08, 1] } : {}}
            transition={{ repeat: Infinity, duration: 1.5 }}
          >
            <AnimatePresence>
              {(isSpeaking || isProcessing) && (
                <>
                  {[1, 2, 3].map((i) => (
                    <motion.div
                      key={i}
                      className={cn(
                        'absolute inset-0 rounded-full border-2',
                        isProcessing ? 'border-sky-400/40' : 'border-primary/30',
                      )}
                      initial={{ scale: 1, opacity: 0.5 }}
                      animate={{ scale: 1.5 + i * 0.2, opacity: 0 }}
                      transition={{
                        repeat: Infinity,
                        duration: 2,
                        delay: i * 0.3,
                      }}
                    />
                  ))}
                </>
              )}
            </AnimatePresence>

            <div
              className={cn(
                'flex h-16 w-16 items-center justify-center rounded-full',
                isConnected
                  ? 'bg-[#0f766e] text-white'
                  : isProcessing
                    ? 'bg-sky-600 text-white'
                    : 'bg-[#d6f5ea] text-[#10263f]',
              )}
            >
              {isConnected ? (
                <Volume2 className="h-8 w-8" />
              ) : isProcessing ? (
                <Loader2 className="h-8 w-8 animate-spin" />
              ) : (
                <Mic className="h-8 w-8" />
              )}
            </div>
          </motion.div>
        </div>

        <div className="px-6 text-center">
          <p className="text-sm font-semibold text-[#10263f]">
            {isConnecting && 'Connecting...'}
            {isConnected && (isSpeaking ? 'Agent is speaking...' : 'Listening...')}
            {!isConnecting && !isConnected && isProcessing && 'Processing call → ticket → work order'}
            {!isConnecting && !isConnected && !isProcessing && 'Ready to call'}
          </p>
          {error && <p className="mt-1 text-sm text-destructive">{error}</p>}
        </div>

        {!isConnected && !isProcessing && (
          <div className="mx-6 grid gap-2 rounded-2xl border border-slate-200 bg-white/80 p-3 text-left text-xs text-slate-600">
            <p className="flex items-center gap-2 font-semibold text-[#10263f]">
              <ShieldCheck className="h-4 w-4 text-[#0f766e]" />
              What this call captures
            </p>
            <div className="grid grid-cols-2 gap-2">
              {['Caller details', 'Urgency', 'Issue location', 'Work-order path'].map((item) => (
                <span key={item} className="inline-flex items-center gap-1.5 rounded-xl bg-slate-50 px-2.5 py-2">
                  <Sparkles className="h-3 w-3 text-[#0f766e]" />
                  {item}
                </span>
              ))}
            </div>
          </div>
        )}

        {isProcessing && (
          <div
            className="mx-6 space-y-2 rounded-xl border border-sky-300/50 bg-sky-50 p-3 text-left text-xs text-sky-950"
            data-testid="voice-processing-panel"
          >
            <p className="flex items-center gap-2 font-semibold">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              System is working
            </p>
            <ul className="space-y-1.5 text-sky-900/80">
              <li className="flex items-center gap-2">
                <PhoneOff className="h-3 w-3" /> Hang-up received
              </li>
              <li className="flex items-center gap-2">
                <Loader2 className="h-3 w-3 animate-spin" /> Creating maintenance ticket
              </li>
              <li className="flex items-center gap-2">
                <Wrench className="h-3 w-3" /> Wiring work order
              </li>
            </ul>
          </div>
        )}

        {transcript.length > 0 && (
          <div className="mx-6 max-h-40 space-y-2 overflow-y-auto rounded-lg bg-white/75 p-3">
            {transcript.slice(-5).map((line, i) => (
              <p key={i} className="text-xs text-muted-foreground">
                {line}
              </p>
            ))}
          </div>
        )}

        {ticketNumber && (
          <div className="mx-6 rounded-xl border border-emerald-300/50 bg-emerald-50 px-3 py-2 text-center text-xs text-emerald-950">
            <p className="flex items-center justify-center gap-1.5 font-semibold">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Request created: {ticketNumber}
            </p>
            <p className="mt-1 opacity-80">Dashboard KPIs and queue are updating live</p>
          </div>
        )}

        <div className="flex justify-center gap-3 px-6">
          {!isConnected ? (
            <Button
              size="lg"
              onClick={startConversation}
              disabled={isConnecting || isProcessing}
              className="h-12 min-w-44 gap-2 bg-[#10263f] text-base font-semibold text-white hover:bg-[#183a5c]"
            >
              <Phone className="h-5 w-5" />
              {isConnecting ? 'Connecting...' : isProcessing ? 'Processing…' : 'Start Call'}
            </Button>
          ) : (
            <Button size="lg" variant="destructive" onClick={endConversation} className="gap-2">
              <PhoneOff className="h-5 w-5" />
              End Call
            </Button>
          )}

          {onClose && !isConnected && !isProcessing && (
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          )}
          {onClose && isProcessing && ticketNumber && (
            <Button variant="outline" onClick={onClose}>
              Done
            </Button>
          )}
        </div>

        <p className="px-6 pb-6 text-center text-xs text-muted-foreground">
          This call may be recorded for quality purposes
        </p>
      </CardContent>
    </Card>
  );
}
