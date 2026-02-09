import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Phone, PhoneOff, Volume2 } from 'lucide-react';
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
}

export function VoiceAgentWidget({ className, onClose, propertyId, propertyName }: VoiceAgentWidgetProps) {
  const { user } = useAuth();
  const {
    isConnecting,
    error,
    status,
    isSpeaking,
    transcript,
    ticketNumber,
    startConversation,
    endConversation,
  } = useVoiceAgent({
    propertyId,
    propertyName,
    callerName: user?.user_metadata?.full_name || user?.email || null,
    callerEmail: user?.email || null,
    callerPhone: user?.user_metadata?.phone || null,
  });

  const isConnected = status === 'connected';

  return (
    <Card className={cn('w-full max-w-md overflow-hidden', className)}>
      <CardContent className="p-6 space-y-6">
        {/* Header */}
        <div className="text-center">
          <h3 className="text-lg font-semibold">Report Maintenance Issue</h3>
          <p className="text-sm text-muted-foreground">
            {isConnected ? 'Speak with our AI assistant' : 'Click to start a voice call'}
          </p>
          {propertyName && (
            <p className="mt-2 text-xs text-muted-foreground">
              Property: <span className="font-medium text-foreground">{propertyName}</span>
            </p>
          )}
        </div>

        {/* Voice Visualization */}
        <div className="flex justify-center">
          <motion.div
            className={cn(
              'relative w-32 h-32 rounded-full flex items-center justify-center',
              'bg-gradient-to-br from-primary/20 to-primary/5',
              isConnected && 'ring-4 ring-primary/30'
            )}
            animate={isSpeaking ? { scale: [1, 1.1, 1] } : {}}
            transition={{ repeat: Infinity, duration: 1.5 }}
          >
            {/* Animated rings when speaking */}
            <AnimatePresence>
              {isSpeaking && (
                <>
                  {[1, 2, 3].map((i) => (
                    <motion.div
                      key={i}
                      className="absolute inset-0 rounded-full border-2 border-primary/30"
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

            {/* Microphone icon */}
            <div
              className={cn(
                'w-16 h-16 rounded-full flex items-center justify-center',
                isConnected ? 'bg-primary text-primary-foreground' : 'bg-muted'
              )}
            >
              {isConnected ? (
                <Volume2 className="w-8 h-8" />
              ) : (
                <Mic className="w-8 h-8 text-muted-foreground" />
              )}
            </div>
          </motion.div>
        </div>

        {/* Status */}
        <div className="text-center">
          <p className="text-sm font-medium">
            {isConnecting && 'Connecting...'}
            {isConnected && (isSpeaking ? 'Agent is speaking...' : 'Listening...')}
            {!isConnecting && !isConnected && 'Ready to call'}
          </p>
          {error && <p className="text-sm text-destructive mt-1">{error}</p>}
        </div>

        {/* Transcript */}
        {transcript.length > 0 && (
          <div className="max-h-40 overflow-y-auto space-y-2 p-3 bg-muted/50 rounded-lg">
            {transcript.slice(-5).map((line, i) => (
              <p key={i} className="text-xs text-muted-foreground">
                {line}
              </p>
            ))}
          </div>
        )}

        {ticketNumber && (
          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              Request created: <span className="font-medium text-foreground">{ticketNumber}</span>
            </p>
          </div>
        )}

        {/* Controls */}
        <div className="flex gap-3 justify-center">
          {!isConnected ? (
            <Button
              size="lg"
              onClick={startConversation}
              disabled={isConnecting}
              className="gap-2"
            >
              <Phone className="w-5 h-5" />
              {isConnecting ? 'Connecting...' : 'Start Call'}
            </Button>
          ) : (
            <Button
              size="lg"
              variant="destructive"
              onClick={endConversation}
              className="gap-2"
            >
              <PhoneOff className="w-5 h-5" />
              End Call
            </Button>
          )}

          {onClose && !isConnected && (
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          )}
        </div>

        {/* Footer */}
        <p className="text-xs text-center text-muted-foreground">
          This call may be recorded for quality purposes
        </p>
      </CardContent>
    </Card>
  );
}
