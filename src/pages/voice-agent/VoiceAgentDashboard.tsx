import { useEffect, useMemo, useState } from 'react';
import { Activity, ArrowUpRight, Filter, Headphones, Mic, Phone, Radio, RefreshCw, ShieldCheck, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { VoiceAgentStats, type VoiceIntakeMetric } from '@/components/voice-agent/VoiceAgentStats';
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

const intakeLensCopy: Record<VoiceIntakeMetric, { title: string; detail: string }> = {
  today: {
    title: "Today's call-created tickets",
    detail: 'Every request captured today from the voice hotline, newest first.',
  },
  processed: {
    title: 'Processed intake',
    detail: 'Calls that have already moved into assignment, active work, or completion.',
  },
  backlog: {
    title: 'Backlog needing action',
    detail: 'New, reviewed, and assigned requests that still need movement.',
  },
  work_orders: {
    title: 'Tickets with work orders',
    detail: 'Voice requests already wired into the work-order workflow.',
  },
  emergency: {
    title: 'Emergency queue',
    detail: 'Open emergency requests that should stay visible until closed.',
  },
};

function isTodayDate(value: string | null | undefined) {
  if (!value) return false;
  const date = new Date(value);
  const now = new Date();
  return date.getFullYear() === now.getFullYear()
    && date.getMonth() === now.getMonth()
    && date.getDate() === now.getDate();
}

export default function VoiceAgentDashboard() {
  const navigate = useNavigate();
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
  const [activeMetric, setActiveMetric] = useState<VoiceIntakeMetric>('today');

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

  const focusedRequests = useMemo(() => {
    const list = requests ?? [];
    switch (activeMetric) {
      case 'today':
        return list.filter((request) => isTodayDate(request.created_at));
      case 'processed':
        return list.filter((request) => ['assigned', 'in_progress', 'completed'].includes(request.status));
      case 'backlog':
        return list.filter((request) => ['new', 'reviewed', 'assigned'].includes(request.status));
      case 'work_orders':
        return list.filter((request) => Boolean(request.work_order_id));
      case 'emergency':
        return list.filter((request) => request.is_emergency && request.status !== 'closed');
      default:
        return list;
    }
  }, [activeMetric, requests]);

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
      <Card className="overflow-hidden border-slate-200 bg-[#f8f5ee] shadow-sm">
        <CardContent className="relative p-0">
          <div className="absolute inset-y-0 right-0 hidden w-1/2 bg-[radial-gradient(circle_at_top_right,rgba(15,118,110,0.18),transparent_38%),linear-gradient(135deg,rgba(16,24,40,0.04),transparent)] lg:block" />
          <div className="relative grid gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:p-7">
            <div>
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#10263f] shadow-lg shadow-slate-900/10">
                  <Headphones className="h-6 w-6 text-[#d6f5ea]" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#0f766e]">Resident voice operations</p>
                  <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#10263f] md:text-4xl">Voice Complaints</h1>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 md:text-base">
                    Calls become structured tickets, emergency flags, assignments, and work orders without losing the caller&apos;s words.
                  </p>
                </div>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#badbcc] bg-white/80 px-3 py-1.5 text-xs font-semibold text-[#0f5132] shadow-sm">
                  <Sparkles className="h-3.5 w-3.5" />
                  ElevenLabs intake
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold shadow-sm ${
                    liveMode
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                      : 'border-slate-200 bg-white/80 text-slate-600'
                  }`}
                >
                  <Radio className={`h-3 w-3 ${liveMode ? 'text-emerald-600' : ''}`} />
                  {liveMode ? 'Live' : 'Standby'}
                  {isFetching && liveMode ? ' · syncing' : ''}
                </span>
                <span className="rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-xs text-slate-600 shadow-sm">
                  Total: <span className="font-medium text-foreground">{requestCounts.total}</span>
                </span>
                <span className="rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-xs text-slate-600 shadow-sm">
                  New: <span className="font-medium text-foreground">{requestCounts.newCount}</span>
                </span>
                <span className="rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-xs text-slate-600 shadow-sm">
                  WOs: <span className="font-medium text-foreground">{requestCounts.woCount}</span>
                </span>
                <span className="rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-xs text-slate-600 shadow-sm">
                  Emergency:{' '}
                  <span className="font-medium text-foreground">{requestCounts.emergencyCount}</span>
                </span>
              </div>
            </div>
            <div className="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-xl shadow-slate-900/5 backdrop-blur">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#d6f5ea] text-[#0f766e]">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#10263f]">Today&apos;s command center</p>
                  <p className="text-xs text-slate-500">Click any intake number to focus the queue.</p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                <button className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-left transition hover:border-[#0f766e]/40 hover:bg-white" onClick={() => setActiveMetric('backlog')}>
                  <span className="block text-xs text-slate-500">Needs action</span>
                  <strong className="text-xl text-[#10263f]">{requestCounts.newCount}</strong>
                </button>
                <button className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-left transition hover:border-[#0f766e]/40 hover:bg-white" onClick={() => setActiveMetric('work_orders')}>
                  <span className="block text-xs text-slate-500">Wired WOs</span>
                  <strong className="text-xl text-[#10263f]">{requestCounts.woCount}</strong>
                </button>
              </div>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row lg:flex-col">
                <Button variant="outline" size="sm" onClick={() => refetch()} className="border-slate-300 bg-white">
                <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
                <Button onClick={handleStartCall} className="bg-[#10263f] text-white hover:bg-[#183a5c]">
                <Mic className="mr-2 h-4 w-4" />
                Start Call
              </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <VoiceAgentStats live={liveMode} activeMetric={activeMetric} onMetricSelect={setActiveMetric} />

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
          <Card className="overflow-hidden border-slate-200 shadow-sm">
            <CardHeader className="flex flex-col gap-3 border-b bg-gradient-to-r from-slate-50 to-white sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle className="text-lg text-[#10263f]">{intakeLensCopy[activeMetric].title}</CardTitle>
                  <span className="rounded-full bg-[#d6f5ea] px-2.5 py-1 text-xs font-semibold text-[#0f766e]">
                    {focusedRequests.length} shown
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {intakeLensCopy[activeMetric].detail}
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
              ) : focusedRequests.length > 0 ? (
                <RequestQueue
                  requests={focusedRequests}
                  onSelect={handleSelectRequest}
                  selectedId={selectedRequest?.id}
                />
              ) : (
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#d6f5ea]">
                    <Sparkles className="h-5 w-5 text-[#0f766e]" />
                  </div>
                  <h3 className="mt-4 font-medium">Nothing in this view</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Choose another intake number or start a call to capture a new request.
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
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg text-[#10263f]">
                <Activity className="h-5 w-5 text-[#0f766e]" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full gap-2 bg-[#10263f] text-white hover:bg-[#183a5c]" onClick={handleStartCall}>
                <Mic className="h-4 w-4" />
                Start Call
              </Button>
              <Button variant="outline" className="w-full justify-between border-slate-300 bg-white" onClick={() => navigate('/work-orders')}>
                Open work-order board
                <ArrowUpRight className="h-4 w-4" />
              </Button>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                <div className="flex items-center justify-between">
                  <span>Selected property</span>
                  <span className="font-semibold text-[#10263f]">
                    {selectedProperty?.name || 'Not set'}
                  </span>
                </div>
                <p className="mt-2">
                  Calls will route requests to the selected property when available.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg text-[#10263f]">Issue Categories</CardTitle>
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
                      <div key={category} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                        <span className="text-sm capitalize text-slate-700">{category}</span>
                        <span className="rounded-full bg-white px-2 py-0.5 text-sm font-semibold text-[#10263f]">{count}</span>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="py-4 text-center text-sm text-muted-foreground">No data yet</p>
              )}
            </CardContent>
          </Card>

          <Card className="border-[#badbcc] bg-[#f2fbf7] shadow-sm">
            <CardContent className="p-4">
              <h4 className="mb-2 font-semibold text-[#10263f]">Pro Tip</h4>
              <p className="text-sm text-slate-600">
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
