import { useMemo, useState } from 'react';
import { Phone, Filter, RefreshCw, Mic, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { VoiceAgentStats } from '@/components/voice-agent/VoiceAgentStats';
import { VoiceAgentWidget } from '@/components/voice-agent/VoiceAgentWidget';
import { RequestQueue } from '@/components/voice-agent/RequestQueue';
import { RequestDetailSheet } from '@/components/voice-agent/RequestDetailSheet';
import { EmergencyAlertBanner } from '@/components/voice-agent/EmergencyAlertBanner';
import { useMaintenanceRequests, MaintenanceRequest } from '@/hooks/useMaintenanceRequests';
import { useProperties } from '@/hooks/useProperties';
import { toast } from 'sonner';

export default function VoiceAgentDashboard() {
  const [selectedRequest, setSelectedRequest] = useState<MaintenanceRequest | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [callDialogOpen, setCallDialogOpen] = useState(false);
  const [propertySelectOpen, setPropertySelectOpen] = useState(false);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data: requests, isLoading, refetch } = useMaintenanceRequests(
    statusFilter !== 'all' ? { status: statusFilter } : undefined
  );
  const { data: properties = [] } = useProperties();

  const selectedProperty = useMemo(
    () => properties.find(p => p.id === selectedPropertyId) || null,
    [properties, selectedPropertyId]
  );

  const requestCounts = useMemo(() => {
    const total = requests?.length || 0;
    const newCount = requests?.filter(r => r.status === 'new').length || 0;
    const emergencyCount = requests?.filter(r => r.is_emergency).length || 0;
    return { total, newCount, emergencyCount };
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
      {/* Header */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 via-background to-background">
        <CardContent className="p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <Phone className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">Voice Agent Console</h1>
                  <p className="text-muted-foreground mt-1">
                    AI-powered maintenance request handling
                  </p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="text-xs rounded-full border px-2 py-1 text-muted-foreground">
                  Total requests: <span className="text-foreground font-medium">{requestCounts.total}</span>
                </span>
                <span className="text-xs rounded-full border px-2 py-1 text-muted-foreground">
                  New: <span className="text-foreground font-medium">{requestCounts.newCount}</span>
                </span>
                <span className="text-xs rounded-full border px-2 py-1 text-muted-foreground">
                  Emergency: <span className="text-foreground font-medium">{requestCounts.emergencyCount}</span>
                </span>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
              <Button onClick={handleStartCall}>
                <Mic className="w-4 h-4 mr-2" />
                Start Call
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <VoiceAgentStats />

      {/* Emergency Banner */}
      {requests && (
        <EmergencyAlertBanner 
          requests={requests} 
          onViewRequest={handleSelectRequest}
        />
      )}

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Request Queue */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-lg">Maintenance Requests</CardTitle>
                <p className="text-sm text-muted-foreground">Review, prioritize, and assign incoming issues.</p>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[160px]">
                  <Filter className="w-4 h-4 mr-2" />
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
                    <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
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
                    <Mic className="w-4 h-4 mr-2" />
                    Start Call
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full gap-2" onClick={handleStartCall}>
                <Mic className="w-4 h-4" />
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

          {/* Category Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Issue Categories</CardTitle>
            </CardHeader>
            <CardContent>
              {requests && requests.length > 0 ? (
                <div className="space-y-2">
                  {Object.entries(
                    requests.reduce((acc, r) => {
                      acc[r.issue_category] = (acc[r.issue_category] || 0) + 1;
                      return acc;
                    }, {} as Record<string, number>)
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
                <p className="text-sm text-muted-foreground text-center py-4">
                  No data yet
                </p>
              )}
            </CardContent>
          </Card>

          {/* Tips */}
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4">
              <h4 className="font-medium mb-2">Pro Tip</h4>
              <p className="text-sm text-muted-foreground">
                Emergency requests are automatically flagged when callers mention keywords like 
                "flood", "fire", "gas leak", or "no heat". These appear at the top of the queue.
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
              <Button onClick={handleContinueFromPropertySelect}>
                Continue
              </Button>
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
          />
        </DialogContent>
      </Dialog>

      {/* Request Detail Sheet */}
      <RequestDetailSheet
        request={selectedRequest}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </div>
  );
}
