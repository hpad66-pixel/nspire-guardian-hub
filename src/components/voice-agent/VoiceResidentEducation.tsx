import { BookOpen, Droplets, Fan, Home, Mail, PhoneCall, ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  LIVE_OPERATOR_PHONE,
  RESIDENT_EDUCATION_ENTRIES,
} from '@/lib/voice/residentEducation';

const ICONS = [Fan, ShieldCheck, Droplets, Home, Mail, Home, PhoneCall, PhoneCall] as const;

/**
 * At-a-glance education topics the voice agent is trained to cover
 * (filters, AC, humidity / mold, vacancy / leasing, live-operator escalate).
 */
export function VoiceResidentEducation({ className }: { className?: string }) {
  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <BookOpen className="h-4 w-4 text-[var(--apas-sapphire)]" />
          Call agent education
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Wired into the live ElevenLabs agent — AC / filters, vacancy callers
          (→ <span className="font-medium text-foreground">leasing@glorietagardens.com</span>),
          and unhappy callers escalated to a live operator at{' '}
          <span className="font-medium text-foreground">{LIVE_OPERATOR_PHONE}</span>.
        </p>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {RESIDENT_EDUCATION_ENTRIES.map((entry, idx) => {
          const Icon = ICONS[idx % ICONS.length];
          return (
            <div
              key={entry.id}
              className="rounded-xl border border-border/70 bg-card/60 p-3 shadow-sm"
            >
              <div className="mb-2 flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--apas-sapphire)]/10 text-[var(--apas-sapphire)]">
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {entry.topic}
                </span>
              </div>
              <p className="text-sm font-medium text-foreground">{entry.question}</p>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{entry.answer}</p>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
