import { useEffect, useMemo, useState } from 'react';
import { Phone, Filter, RefreshCw, Mic, Sparkles, Radio } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { VoiceAgentStats } from '@/components/voice-agent/VoiceAgentStats';
import { VoiceAgentWidget } from '@/components/voice-agent/VoiceAgentWidget';
import { VoiceLiveFeed } from '@/components/voice-agent/VoiceLiveFeed';
import { VoiceResidentEducation } from '@/components/voice-agent/VoiceResidentEducation';
import { RequestQueue } from '@/components/voice-agent/RequestQueue';
import { RequestDetailSheet } from '@/components/voice-agent/RequestDetailSheet';
import { EmergencyAlertBanner } from '@/components/voice-agent/EmergencyAlertBanner';
import { useMaintenanceRequests, MaintenanceRequest } from '@/hooks/useMaintenanceRequests';
import { useProperties } from '@/hooks/useProperties';
import { subscribeVoiceLive } from '@/lib/voice/liveBus';
import { nextPipelineStage, type VoicePipelineStage } from '@/lib/voice/liveStats';
import { toast } from 'sonner';

export default function VoiceAgentDashboard() {
  const [selectedRequest, setSelectedRequest] = useState<MaintenanceRequest | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [callDialogOpen, setCallDialogOpen] = useState(false);
  const [propertySelectOpen, setPropertySelectOpen] = useState(false);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>(() => {
    try {
      return localStorage.getItem('voice-agent-property') || '';
    } catch {
      return '';
    }
  });
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [pipeline, setPipeline] = useState<VoicePipelineStage>('idle');
  const [liveMode, setLiveMode] = useState(false);

  const { data: requests, isLoading, isFetching, refetch } = useMaintenanceRequests({
    ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
    live: liveMode,
  });
  const { data: properties = [] } = useProperties();

  useEffect(() => {
    if (!properties.length) return;
    if (!selectedPropertyId || !properties.some((p) => p.id === selectedPropertyId)) {
      setSelectedPropertyId(properties[0].id);
    }
  }, [properties, selectedPropertyId]);

  useEffect(() => {
    try {
      if (selectedPropertyId) localStorage.setItem('voice-agent-property', selectedPropertyId);
    } catch {
      /* ignore */
    }
  }, [selectedPropertyId]);

  useEffect(() => {
    return subscribeVoiceLive((event) => {
      if (event.kind === 'call_started') {
        setLiveMode(true);
        setPipeline((s) => nextPipelineStage(s, 'call_start'));
      } else if (event.kind === 'call_ended' || event.kind === 'processing') {
        setLiveMode(true);
        setPipeline((s) => nextPipelineStage(s, 'call_end'));
      } else if (event.kind === 'ticket_created') {
        setPipeline((s) => nextPipelineStage(s, 'ticket'));
        void refetch();
      } else if (event.kind === 'wo_linked') {
        setPipeline((s) => nextPipelineStage(s, 'work_order'));
        void refetch();
        window.setTimeout(() => {
          setPipeline('ready');
          setLiveMode(false);
        }, 8000);
      }
    });
  }, [refetch]);

  const selectedProperty = useMemo(
    () => properties.find((p) => p.id === selectedPropertyId) || null,
    [properties, selectedPropertyId],
  );

  const requestCounts = useMemo(() => {
    const total = requests?.length || 0;
    const newCount = requests?.filter((r) => r.status === 'new').length || 0;
    const emergencyCount = requests?.filter((r) => r.is_emergency).length || 0;
    const woCount = requests?.filter((r) => !!r.work_order_id).length || 0;
    return { total, newCount, emergencyCount, woCount };
  }, [requests]);

  const handleSelectRequest = (request: MaintenanceRequest) => {
    setSelectedRequest(request);
    setDetailOpen(true);
  };

  const handleStartCall = () => {
    if (properties.length === 0) {
      toast.error('No affiliated properties found');
      return;
    }

    if (properties.length === 1) {
      setSelectedPropertyId(properties[0].id);
      setCallDialogOpen(true);
      return;
    }

    setPropertySelectOpen(true);
  };

  const handleContinueFromPropertySelect = () => {
    if (!selectedPropertyId) {
      toast.error('Select a property to continue');
      return;
    }
    setPropertySelectOpen(false);
    setCallDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 via-background to-background">
        <CardContent className="p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <Phone className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">Voice Complaints</h1>
                  <p className="mt-1 text-muted-foreground">
                    Live ElevenLabs hotline — tickets and work orders update the moment a call ends
                  </p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full border border-sky-300 bg-sky-50 px-2 py-1 text-xs font-medium text-sky-900">
                  Powered by ElevenLabs
                </span>
                <span
                  className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-medium ${
                    liveMode
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                      : 'border-border text-muted-foreground'
                  }`}
                >
                  <Radio className={`h-3 w-3 ${liveMode ? 'text-emerald-600' : ''}`} />
                  {liveMode ? 'Live' : 'Standby'}
                  {isFetching && liveMode ? ' · syncing' : ''}
                </span>
                <span className="rounded-full border px-2 py-1 text-xs text-muted-foreground">
                  Total: <span className="font-medium text-foreground">{requestCounts.total}</span>
                </span>
                <span className="rounded-full border px-2 py-1 text-xs text-muted-foreground">
                  New: <span className="font-medium text-foreground">{requestCounts.newCount}</span>
                </span>
                <span className="rounded-full border px-2 py-1 text-xs text-muted-foreground">
                  WOs: <span className="font-medium text-foreground">{requestCounts.woCount}</span>
                </span>
                <span className="rounded-full border px-2 py-1 text-xs text-muted-foreground">
                  Emergency:{' '}
                  <span className="font-medium text-foreground">{requestCounts.emergencyCount}</span>
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button onClick={handleStartCall}>
                <Mic className="mr-2 h-4 w-4" />
                Start Call
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <VoiceAgentStats live={liveMode} />

      <VoiceResidentEducation />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <VoiceLiveFeed stage={pipeline} />
        </div>
        <Card className="border-dashed">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">What you&apos;ll see after hang-up</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>1. Live pulse flips to <strong className="text-foreground">Processing</strong></p>
            <p>2. Ticket lands in the queue (no manual refresh)</p>
            <p>3. Work order wires automatically → KPIs update</p>
            <p>4. Today / backlog / WO counts tick up in real time</p>
          </CardContent>
        </Card>
      </div>

      {requests && (
        <EmergencyAlertBanner requests={requests} onViewRequest={handleSelectRequest} />
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-lg">Maintenance Requests</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Review, prioritize, and assign incoming issues — updates live.
                </p>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[160px]">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="assigned">Assigned</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent className="pt-0">
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-24 animate-pulse rounded-lg bg-muted" />
                  ))}
                </div>
              ) : requests && requests.length > 0 ? (
                <RequestQueue
                  requests={requests || []}
                  onSelect={handleSelectRequest}
                  selectedId={selectedRequest?.id}
                />
              ) : (
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <Sparkles className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="mt-4 font-medium">No requests yet</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Start a voice call to capture the first maintenance request.
                  </p>
                  <Button className="mt-4" onClick={handleStartCall}>
                    <Mic className="mr-2 h-4 w-4" />
                    Start Call
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full gap-2" onClick={handleStartCall}>
                <Mic className="h-4 w-4" />
                Start Call
              </Button>
              <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
                <div className="flex items-center justify-between">
                  <span>Selected property</span>
                  <span className="font-medium text-foreground">
                    {selectedProperty?.name || 'Not set'}
                  </span>
                </div>
                <p className="mt-2">
                  Calls will route requests to the selected property when available.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Issue Categories</CardTitle>
            </CardHeader>
            <CardContent>
              {requests && requests.length > 0 ? (
                <div className="space-y-2">
                  {Object.entries(
                    requests.reduce(
                      (acc, r) => {
                        acc[r.issue_category] = (acc[r.issue_category] || 0) + 1;
                        return acc;
                      },
                      {} as Record<string, number>,
                    ),
                  )
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 5)
                    .map(([category, count]) => (
                      <div key={category} className="flex items-center justify-between">
                        <span className="text-sm capitalize">{category}</span>
                        <span className="text-sm font-medium">{count}</span>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="py-4 text-center text-sm text-muted-foreground">No data yet</p>
              )}
            </CardContent>
          </Card>

          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-4">
              <h4 className="mb-2 font-medium">Pro Tip</h4>
              <p className="text-sm text-muted-foreground">
                After you hang up, watch the Live pipeline — ticket creation and work-order wiring
                should appear within a few seconds without hitting Refresh.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={propertySelectOpen} onOpenChange={setPropertySelectOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Select Property</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Select value={selectedPropertyId} onValueChange={setSelectedPropertyId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose a property" />
              </SelectTrigger>
              <SelectContent>
                {properties.map((property) => (
                  <SelectItem key={property.id} value={property.id}>
                    {property.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setPropertySelectOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleContinueFromPropertySelect}>Continue</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={callDialogOpen} onOpenChange={setCallDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Voice Agent Call</DialogTitle>
          </DialogHeader>
          <VoiceAgentWidget
            propertyId={selectedProperty?.id || null}
            propertyName={selectedProperty?.name || null}
            onClose={() => setCallDialogOpen(false)}
            onCallEnded={() => {
              setLiveMode(true);
              setPipeline((s) => nextPipelineStage(s, 'call_end'));
            }}
            onTicketCreated={() => {
              setPipeline((s) => nextPipelineStage(s, 'ticket'));
              void refetch();
            }}
          />
        </DialogContent>
      </Dialog>

      <RequestDetailSheet
        request={selectedRequest}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </div>
  );
}
