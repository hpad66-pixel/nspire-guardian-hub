import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Mic, Phone, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EmergencyAlertBanner } from '@/components/voice-agent/EmergencyAlertBanner';
import { RequestDetailSheet } from '@/components/voice-agent/RequestDetailSheet';
import { RequestQueue } from '@/components/voice-agent/RequestQueue';
import { VoiceAgentStats } from '@/components/voice-agent/VoiceAgentStats';
import { VoiceAgentWidget } from '@/components/voice-agent/VoiceAgentWidget';
import { useProjectPropertyId } from '@/hooks/useProjectStores';
import { useMaintenanceRequests, type MaintenanceRequest } from '@/hooks/useMaintenanceRequests';
import { useAiUsage } from '@/hooks/useAiUsage';
import { useSeedVoiceAgentDemo } from '@/hooks/useProjectStores';
import { toast } from 'sonner';

/**
 * Project-scoped ElevenLabs voice complaint console for Glorieta (and any
 * project that enables the optional `voice-agent` module).
 */
export function ProjectVoiceAgentTab({
  projectId,
  projectName,
}: {
  projectId: string;
  projectName: string;
}) {
  const { data: project, isLoading } = useProjectPropertyId(projectId);
  const propertyId = project?.property_id ?? undefined;
  const [statusFilter, setStatusFilter] = useState('all');
  const [selected, setSelected] = useState<MaintenanceRequest | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [callOpen, setCallOpen] = useState(false);
  const { isSuperAdmin } = useAiUsage('30d');
  const seedVoice = useSeedVoiceAgentDemo();

  const { data: requests = [], isLoading: loadingReq, refetch } = useMaintenanceRequests(
    propertyId
      ? {
          property_id: propertyId,
          ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
        }
      : undefined,
  );

  const stats = useMemo(() => {
    const total = requests.length;
    const open = requests.filter((r) => !['completed', 'closed'].includes(r.status)).length;
    const emergency = requests.filter((r) => r.is_emergency).length;
    const newCount = requests.filter((r) => r.status === 'new').length;
    return { total, open, emergency, newCount };
  }, [requests]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 p-16 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading voice complaints…
      </div>
    );
  }

  if (!propertyId) {
    return (
      <Card>
        <CardContent className="space-y-3 p-10 text-center">
          <Phone className="mx-auto h-8 w-8 text-muted-foreground" />
          <h3 className="text-lg font-semibold">Link a property for Voice Complaints</h3>
          <p className="text-sm text-muted-foreground">
            ElevenLabs maintenance intake is property-scoped (unit + ticket). Attach this project to a property, then refresh.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 p-1" data-testid="project-voice-agent-tab">
      <section className="overflow-hidden rounded-3xl border border-[var(--apas-sapphire)]/25 bg-gradient-to-br from-[#0b1f3a] via-[#12305a] to-[#1D6FE8] p-6 text-white shadow-md">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-100/90">ElevenLabs · Voice Complaints</p>
            <h2 className="mt-1 font-display text-3xl font-bold">Tenant maintenance hotline</h2>
            <p className="mt-2 max-w-2xl text-sm text-white/80">
              Residents call or you simulate a live complaint. Tickets land here, create work orders, and stay tied to {projectName}.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              className="bg-white text-[#0b1f3a] hover:bg-sky-50"
              onClick={() => setCallOpen(true)}
            >
              <Mic className="mr-1.5 h-4 w-4" /> Start test call
            </Button>
            <Button size="sm" variant="outline" className="border-white/40 bg-white/10 text-white hover:bg-white/20" asChild>
              <Link to="/voice-agent">Open full console</Link>
            </Button>
            {isSuperAdmin && (
              <Button
                size="sm"
                variant="outline"
                className="border-white/40 bg-white/10 text-white hover:bg-white/20"
                disabled={seedVoice.isPending}
                onClick={() => {
                  seedVoice.mutate(
                    { propertyId, projectId },
                    {
                      onSuccess: () => {
                        toast.success('Voice complaint demo tickets loaded');
                        void refetch();
                      },
                    },
                  );
                }}
              >
                <Sparkles className="mr-1.5 h-4 w-4" /> Load demo tickets
              </Button>
            )}
          </div>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi label="Tickets" value={String(stats.total)} />
          <Kpi label="Open" value={String(stats.open)} />
          <Kpi label="New" value={String(stats.newCount)} />
          <Kpi label="Emergency" value={String(stats.emergency)} warn={stats.emergency > 0} />
        </div>
      </section>

      <EmergencyAlertBanner
        requests={requests}
        onViewRequest={(r) => {
          setSelected(r);
          setDetailOpen(true);
        }}
      />

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="border-sky-300 bg-sky-50 text-sky-900">
          <Phone className="mr-1 h-3.5 w-3.5" /> Powered by ElevenLabs
        </Badge>
        <Badge variant="secondary">Property-scoped</Badge>
        <div className="ml-auto w-44">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="assigned">Assigned</SelectItem>
              <SelectItem value="in_progress">In progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <VoiceAgentStats />

      {loadingReq ? (
        <div className="flex items-center justify-center gap-2 p-10 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading queue…
        </div>
      ) : requests.length === 0 ? (
        <Card>
          <CardContent className="space-y-3 p-10 text-center">
            <Phone className="mx-auto h-8 w-8 text-muted-foreground" />
            <h3 className="font-semibold">No complaint tickets yet</h3>
            <p className="text-sm text-muted-foreground">
              Start a test call, or load 6 months of demo resident complaints for tomorrow’s owner conversation.
            </p>
            <Button onClick={() => setCallOpen(true)}>
              <Mic className="mr-1.5 h-4 w-4" /> Start test call
            </Button>
          </CardContent>
        </Card>
      ) : (
        <RequestQueue
          requests={requests}
          onSelect={(r) => {
            setSelected(r);
            setDetailOpen(true);
          }}
        />
      )}

      <RequestDetailSheet
        request={selected}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />

      <Dialog open={callOpen} onOpenChange={setCallOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Simulate resident complaint call</DialogTitle>
          </DialogHeader>
          <VoiceAgentWidget
            propertyId={propertyId}
            propertyName={projectName}
            onClose={() => setCallOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Kpi({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className={`rounded-2xl border px-4 py-3 ${warn ? 'border-rose-300/50 bg-rose-500/20' : 'border-white/15 bg-white/10'}`}>
      <p className="text-[11px] uppercase tracking-wide text-white/70">{label}</p>
      <p className="text-2xl font-bold tabular-nums">{value}</p>
    </div>
  );
}
