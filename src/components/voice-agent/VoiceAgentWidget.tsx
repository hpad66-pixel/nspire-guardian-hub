import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Loader2, Mic, Phone, PhoneOff, Volume2, Wrench } from 'lucide-react';
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
    <Card className={cn('w-full max-w-md overflow-hidden', className)}>
      <CardContent className="space-y-6 p-6">
        <div className="text-center">
          <h3 className="text-lg font-semibold">Report Maintenance Issue</h3>
          <p className="text-sm text-muted-foreground">
            {isConnected
              ? 'Speak with our AI assistant'
              : isProcessing
                ? 'Call ended — system is processing'
                : 'Click to start a voice call'}
          </p>
          {propertyName && (
            <p className="mt-2 text-xs text-muted-foreground">
              Property: <span className="font-medium text-foreground">{propertyName}</span>
            </p>
          )}
        </div>

        <div className="flex justify-center">
          <motion.div
            className={cn(
              'relative flex h-32 w-32 items-center justify-center rounded-full',
              'bg-gradient-to-br from-primary/20 to-primary/5',
              isConnected && 'ring-4 ring-primary/30',
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
                  ? 'bg-primary text-primary-foreground'
                  : isProcessing
                    ? 'bg-sky-600 text-white'
                    : 'bg-muted',
              )}
            >
              {isConnected ? (
                <Volume2 className="h-8 w-8" />
              ) : isProcessing ? (
                <Loader2 className="h-8 w-8 animate-spin" />
              ) : (
                <Mic className="h-8 w-8 text-muted-foreground" />
              )}
            </div>
          </motion.div>
        </div>

        <div className="text-center">
          <p className="text-sm font-medium">
            {isConnecting && 'Connecting...'}
            {isConnected && (isSpeaking ? 'Agent is speaking...' : 'Listening...')}
            {!isConnecting && !isConnected && isProcessing && 'Processing call → ticket → work order'}
            {!isConnecting && !isConnected && !isProcessing && 'Ready to call'}
          </p>
          {error && <p className="mt-1 text-sm text-destructive">{error}</p>}
        </div>

        {isProcessing && (
          <div
            className="space-y-2 rounded-xl border border-sky-300/50 bg-sky-50 p-3 text-left text-xs text-sky-950"
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
          <div className="max-h-40 space-y-2 overflow-y-auto rounded-lg bg-muted/50 p-3">
            {transcript.slice(-5).map((line, i) => (
              <p key={i} className="text-xs text-muted-foreground">
                {line}
              </p>
            ))}
          </div>
        )}

        {ticketNumber && (
          <div className="rounded-xl border border-emerald-300/50 bg-emerald-50 px-3 py-2 text-center text-xs text-emerald-950">
            <p className="flex items-center justify-center gap-1.5 font-semibold">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Request created: {ticketNumber}
            </p>
            <p className="mt-1 opacity-80">Dashboard KPIs and queue are updating live</p>
          </div>
        )}

        <div className="flex justify-center gap-3">
          {!isConnected ? (
            <Button
              size="lg"
              onClick={startConversation}
              disabled={isConnecting || isProcessing}
              className="gap-2"
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

        <p className="text-center text-xs text-muted-foreground">
          This call may be recorded for quality purposes
        </p>
      </CardContent>
    </Card>
  );
}
